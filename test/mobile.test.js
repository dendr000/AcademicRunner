// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { isPrivateAddress, generateToken, tokensMatch, bearerToken, createFailureLimiter } = require('../electron/core/mobile-auth')
const { createMobileServer } = require('../electron/core/mobile-server')
const { createMobileControl, lanAddresses } = require('../electron/core/mobile-control')
const { createSettingsStore } = require('../electron/core/settings')

const TOKEN = 'abcdef0123456789abcdef0123456789'

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mob-'))
}

function request(port, pathAndQuery, { method = 'GET', token } = {}) {
  return new Promise((resolve, reject) => {
    const headers = token ? { Authorization: 'Bearer ' + token } : {}
    const req = http.request({ host: '127.0.0.1', port, path: pathAndQuery, method, headers }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

function fixture() {
  const root = tmp()
  const staticDir = tmp()
  fs.mkdirSync(path.join(root, 'Lv0_기초', '01_출력'), { recursive: true })
  fs.writeFileSync(path.join(root, 'Lv0_기초', '01_출력', 'Main.java'), 'class Main {}\n')
  fs.mkdirSync(path.join(root, 'original', 'Lv0_기초', '01_출력'), { recursive: true })
  fs.writeFileSync(path.join(root, 'original', 'Lv0_기초', '01_출력', 'Main.java'), '')
  for (const f of ['index.html', 'm.css', 'm.js']) fs.writeFileSync(path.join(staticDir, f), 'x ' + f)
  return { root, staticDir, cleanup: () => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(staticDir, { recursive: true, force: true }) } }
}

async function withServer(fn, overrides) {
  const fx = fixture()
  const server = createMobileServer({ getRoot: () => fx.root, getToken: () => TOKEN, staticDir: fx.staticDir, ...overrides })
  const port = await server.start(0)
  try {
    await fn(port, fx)
  } finally {
    await server.stop()
    fx.cleanup()
  }
}

test('사설 주소만 허용한다', () => {
  for (const ok of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.0.10', '100.64.1.1', '::1', '::ffff:192.168.0.5', 'fd00::1', 'fe80::1']) assert.strictEqual(isPrivateAddress(ok), true, ok)
  for (const bad of ['8.8.8.8', '172.32.0.1', '172.15.0.1', '100.128.0.1', '11.0.0.1', '256.1.1.1', '2001:db8::1', '', undefined, null]) assert.strictEqual(isPrivateAddress(bad), false, String(bad))
})

test('토큰: 생성, 비교, Bearer 추출', () => {
  const t = generateToken()
  assert.match(t, /^[0-9a-f]{48}$/)
  assert.notStrictEqual(t, generateToken())
  assert.strictEqual(tokensMatch(t, t), true)
  assert.strictEqual(tokensMatch(t, t + 'x'), false)
  assert.strictEqual(tokensMatch('', ''), false) // 빈 토큰은 항상 거부
  assert.strictEqual(tokensMatch(undefined, t), false)
  assert.strictEqual(bearerToken('Bearer ' + TOKEN), TOKEN)
  for (const bad of ['', 'Bearer', 'Basic ' + TOKEN, 'Bearer a b', undefined, 'Bearer short']) assert.strictEqual(bearerToken(bad), '')
})

test('실패 횟수 제한: 시간이 지나면 풀리고 성공하면 지운다', () => {
  let t = 0
  const lim = createFailureLimiter({ max: 3, windowMs: 1000, now: () => t })
  for (let i = 0; i < 3; i++) lim.fail('a')
  assert.strictEqual(lim.isBlocked('a'), true)
  assert.strictEqual(lim.isBlocked('b'), false)
  t = 1500
  assert.strictEqual(lim.isBlocked('a'), false)
  lim.fail('a'); lim.reset('a')
  assert.strictEqual(lim.isBlocked('a'), false)
})

test('서버: 토큰 없이 /api 는 401, 있으면 목록과 코드', async () => {
  await withServer(async (port) => {
    assert.strictEqual((await request(port, '/api/problems')).status, 401)
    assert.strictEqual((await request(port, '/api/problems', { token: 'wrongwrongwrong1' })).status, 401)
    const list = JSON.parse((await request(port, '/api/problems', { token: TOKEN })).body)
    assert.strictEqual(list.ok, true)
    assert.strictEqual(list.levels[0].problems[0].id, 'Lv0_기초/01_출력')
    assert.strictEqual(list.edited['Lv0_기초/01_출력'], true)
    const file = JSON.parse((await request(port, '/api/file?problemId=' + encodeURIComponent('Lv0_기초/01_출력') + '&fileName=Main.java', { token: TOKEN })).body)
    assert.deepStrictEqual(file, { ok: true, content: 'class Main {}\n' })
  })
})

test('서버: 경로 조작과 잘못된 인수는 읽지 못한다', async () => {
  await withServer(async (port) => {
    const get = async (q) => JSON.parse((await request(port, '/api/file?' + q, { token: TOKEN })).body)
    assert.strictEqual((await get('problemId=' + encodeURIComponent('../x/y') + '&fileName=Main.java')).ok, false)
    assert.strictEqual((await get('problemId=' + encodeURIComponent('Lv0_기초/01_출력') + '&fileName=' + encodeURIComponent('../../secret.java'))).ok, false)
    assert.strictEqual((await get('problemId=' + encodeURIComponent('Lv0_기초/01_출력'))).ok, false)
    assert.strictEqual((await get('')).ok, false)
  })
})

test('서버: 읽기 전용(POST·PUT·DELETE 는 405)이고 안전 헤더를 붙인다', async () => {
  await withServer(async (port) => {
    for (const method of ['POST', 'PUT', 'DELETE']) assert.strictEqual((await request(port, '/api/problems', { method, token: TOKEN })).status, 405, method)
    const page = await request(port, '/')
    assert.strictEqual(page.status, 200)
    assert.match(page.headers['content-security-policy'], /default-src 'self'/)
    assert.strictEqual(page.headers['cache-control'], 'no-store')
    assert.strictEqual((await request(port, '/nope')).status, 404)
    assert.strictEqual((await request(port, '/../package.json')).status, 404)
  })
})

test('서버: 사설 주소가 아닌 곳에서 온 요청은 403', async () => {
  await withServer(async (port) => {
    assert.strictEqual((await request(port, '/')).status, 403)
  }, { isAllowedAddress: () => false })
})

test('서버: 틀린 토큰을 계속 보내면 429 로 막는다', async () => {
  await withServer(async (port) => {
    for (let i = 0; i < 10; i++) assert.strictEqual((await request(port, '/api/problems', { token: 'wrongwrongwrong1' })).status, 401)
    assert.strictEqual((await request(port, '/api/problems', { token: 'wrongwrongwrong1' })).status, 429)
    assert.strictEqual((await request(port, '/api/problems', { token: TOKEN })).status, 429) // 막힌 동안은 맞는 토큰도 거부
  })
})

test('서버: 빈 토큰 설정이면 어떤 토큰도 통과하지 못한다', async () => {
  await withServer(async (port) => {
    assert.strictEqual((await request(port, '/api/problems', { token: 'anythinganything1' })).status, 401)
  }, { getToken: () => '' })
})

test('설정: 폰 접속 항목은 검사해서 저장한다', () => {
  const dir = tmp()
  try {
    const s = createSettingsStore(dir)
    assert.strictEqual(s.get().mobileEnabled, false) // 기본 꺼짐
    s.set({ mobileEnabled: true, mobilePort: 9000, mobileToken: TOKEN })
    assert.deepStrictEqual([s.get().mobileEnabled, s.get().mobilePort, s.get().mobileToken], [true, 9000, TOKEN])
    s.set({ mobilePort: 80, mobileToken: 'x', mobileEnabled: 'yes' })
    assert.deepStrictEqual([s.get().mobileEnabled, s.get().mobilePort, s.get().mobileToken], [true, 9000, TOKEN]) // 잘못된 값은 무시
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('제어: 켜면 토큰이 만들어지고 주소가 나오며, 끄면 닫힌다', async () => {
  const dir = tmp()
  const fx = fixture()
  const settings = createSettingsStore(dir)
  settings.set({ root: fx.root, mobilePort: 0 })
  // 포트 0 은 설정으로는 저장되지 않으므로, 빈 포트를 하나 잡아 쓴다.
  const probe = http.createServer()
  await new Promise((r) => probe.listen(0, r))
  const free = probe.address().port
  await new Promise((r) => probe.close(r))
  settings.set({ mobilePort: free })
  const control = createMobileControl({ settings, staticDir: fx.staticDir, interfaces: () => ({ Wi: [{ family: 'IPv4', internal: false, address: '192.168.0.7' }, { family: 'IPv4', internal: false, address: '8.8.8.8' }, { family: 'IPv4', internal: true, address: '127.0.0.1' }] }) })
  try {
    assert.strictEqual(control.status().running, false)
    const on = await control.setEnabled(true)
    assert.strictEqual(on.running, true)
    assert.match(on.token, /^[0-9a-f]{48}$/)
    assert.deepStrictEqual(on.urls, [`http://192.168.0.7:${free}/#t=${on.token}`])
    assert.strictEqual((await request(free, '/api/problems', { token: on.token })).status, 200)
    const renewed = control.regenerate()
    assert.notStrictEqual(renewed.token, on.token)
    assert.strictEqual((await request(free, '/api/problems', { token: on.token })).status, 401) // 이전 토큰은 못 씀
    const off = await control.setEnabled(false)
    assert.strictEqual(off.running, false)
    assert.deepStrictEqual(off.urls, [])
  } finally {
    await control.stop()
    fx.cleanup()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('제어: 포트가 이미 쓰이면 오류 메시지를 알려 준다', async () => {
  const dir = tmp()
  const fx = fixture()
  const blocker = http.createServer()
  await new Promise((r) => blocker.listen(0, '0.0.0.0', r))
  const settings = createSettingsStore(dir)
  settings.set({ root: fx.root, mobilePort: blocker.address().port })
  const control = createMobileControl({ settings, staticDir: fx.staticDir, interfaces: () => ({}) })
  try {
    const s = await control.setEnabled(true)
    assert.strictEqual(s.running, false)
    assert.match(s.error, /쓰고 있습니다/)
  } finally {
    await control.stop()
    await new Promise((r) => blocker.close(r))
    fx.cleanup()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('lanAddresses: 사설 IPv4 만 고른다', () => {
  assert.deepStrictEqual(lanAddresses({ a: [{ family: 'IPv6', internal: false, address: 'fe80::1' }, { family: 'IPv4', internal: false, address: '10.0.0.2' }] }), ['10.0.0.2'])
  assert.deepStrictEqual(lanAddresses(undefined), [])
})
