// Copyright (c) dendr000. MIT License.
// 앱 설정(문제 루트 폴더 등)을 사용자 데이터 폴더의 settings.json 에 저장한다.
// 저장은 임시 파일에 쓴 뒤 이름을 바꾸는 방식이라 도중에 꺼져도 파일이 깨지지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const DEFAULTS = {
  // 문제 풀이를 모아 둔 폴더. 설정 화면에서 바꿀 수 있다.
  root: 'C:\\dev\\AcademicTest',
}

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
    return { ...DEFAULTS, ...read() }
  }

  function set(patch) {
    const next = { ...read() }
    if (typeof patch.root === 'string' && patch.root.trim() !== '') next.root = patch.root
    fs.mkdirSync(dir, { recursive: true })
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
    fs.renameSync(tmp, file)
    return get()
  }

  return { get, set, file }
}

module.exports = { createSettingsStore, DEFAULTS }
