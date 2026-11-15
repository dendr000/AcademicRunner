// Copyright (c) dendr000. MIT License.
// 폰 접속 켜기/끄기와 상태(접속 주소, 토큰)를 관리한다. 설정 파일 + 웹 서버를 묶는 얇은 계층이라 화면을 모른다.
const os = require('node:os')
const { createMobileServer } = require('./mobile-server')
const { generateToken, isPrivateAddress } = require('./mobile-auth')

// 이 PC 의 사설 IPv4 주소들(폰이 접속할 수 있는 후보)
function lanAddresses(interfaces) {
  const result = []
  for (const list of Object.values(interfaces || {})) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal && isPrivateAddress(item.address)) result.push(item.address)
    }
  }
  return result
}

// deps: { settings: createSettingsStore 결과, staticDir, interfaces?(테스트용), createServer?(테스트용) }
function createMobileControl(deps) {
  const settings = deps.settings
  const server = (deps.createServer || createMobileServer)({
    getRoot: () => settings.get().root,
    getToken: () => settings.get().mobileToken,
    staticDir: deps.staticDir,
  })
  let error = ''
  let activePort = 0

  function ensureToken() {
    if (settings.get().mobileToken === '') settings.set({ mobileToken: generateToken() })
  }

  function status() {
    const s = settings.get()
    const running = server.isRunning()
    const port = running ? activePort : s.mobilePort
    return {
      enabled: s.mobileEnabled,
      running,
      port,
      token: s.mobileToken,
      error,
      // 토큰은 # 뒤에 붙여 서버 기록에 남지 않게 한다.
      urls: running ? lanAddresses(deps.interfaces ? deps.interfaces() : os.networkInterfaces()).map((ip) => `http://${ip}:${port}/#t=${s.mobileToken}`) : [],
    }
  }

  async function startNow() {
    error = ''
    ensureToken()
    try {
      activePort = await server.start(settings.get().mobilePort)
    } catch (e) {
      error = e && e.code === 'EADDRINUSE' ? '포트 ' + settings.get().mobilePort + ' 를 다른 프로그램이 쓰고 있습니다' : '서버를 켜지 못했습니다 (' + ((e && e.code) || (e && e.message) || '알 수 없음') + ')'
    }
  }

  return {
    status,
    // 앱을 켤 때: 설정이 켜짐이면 서버를 시작한다.
    async startIfEnabled() {
      if (settings.get().mobileEnabled) await startNow()
      return status()
    },
    async setEnabled(on) {
      settings.set({ mobileEnabled: on === true })
      if (on === true) await startNow()
      else {
        error = ''
        await server.stop()
      }
      return status()
    },
    // 토큰을 새로 만든다. 이전 토큰은 바로 못 쓰게 된다.
    regenerate() {
      settings.set({ mobileToken: generateToken() })
      return status()
    },
    stop: () => server.stop(),
  }
}

module.exports = { createMobileControl, lanAddresses }
