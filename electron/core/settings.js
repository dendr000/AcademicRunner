// Copyright (c) dendr000. MIT License.
// 앱 설정(문제 루트 폴더 등)을 사용자 데이터 폴더의 settings.json 에 저장한다.
// 저장은 임시 파일에 쓴 뒤 이름을 바꾸는 방식이라 도중에 꺼져도 파일이 깨지지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const DEFAULTS = {
  // 문제 풀이를 모아 둔 폴더. 설정 화면에서 바꿀 수 있다.
  root: 'C:\\dev\\AcademicTest',
  // 실행 시간 제한(초). 무한 반복 풀이를 끊는다.
  timeoutSec: 10,
  // 폰 접속(내장 웹 서버). 기본은 꺼짐. 토큰은 이 설정 파일에만 둔다(코드·문서에 쓰지 않음).
  mobileEnabled: false,
  mobilePort: 8787,
  mobileToken: '',
}

const MIN_TIMEOUT_SEC = 1
const MAX_TIMEOUT_SEC = 120

function validTimeout(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_TIMEOUT_SEC && value <= MAX_TIMEOUT_SEC
}

const validPort = (v) => Number.isInteger(v) && v >= 1024 && v <= 65535
const validToken = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{16,200}$/.test(v)

function createSettingsStore(dir) {
  const file = path.join(dir, 'settings.json')

  function read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      // 파일이 없거나 깨졌으면 기본값으로 시작한다.
    }
    return {}
  }

  function get() {
    const merged = { ...DEFAULTS, ...read() }
    if (!validTimeout(merged.timeoutSec)) merged.timeoutSec = DEFAULTS.timeoutSec // 깨진 값은 기본값으로
    if (typeof merged.mobileEnabled !== 'boolean') merged.mobileEnabled = DEFAULTS.mobileEnabled
    if (!validPort(merged.mobilePort)) merged.mobilePort = DEFAULTS.mobilePort
    if (!validToken(merged.mobileToken)) merged.mobileToken = DEFAULTS.mobileToken
    return merged
  }

  function set(patch) {
    const next = { ...read() }
    if (typeof patch.root === 'string' && patch.root.trim() !== '') next.root = patch.root
    if (validTimeout(patch.timeoutSec)) next.timeoutSec = patch.timeoutSec
    if (typeof patch.mobileEnabled === 'boolean') next.mobileEnabled = patch.mobileEnabled
    if (validPort(patch.mobilePort)) next.mobilePort = patch.mobilePort
    if (validToken(patch.mobileToken)) next.mobileToken = patch.mobileToken
    fs.mkdirSync(dir, { recursive: true })
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
    fs.renameSync(tmp, file)
    return get()
  }

  return { get, set, file }
}

module.exports = { createSettingsStore, DEFAULTS }
