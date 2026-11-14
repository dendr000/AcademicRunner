// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createSettingsStore } = require('../electron/core/settings')

function withDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-settings-'))
  try {
    fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('실행 시간 제한 기본값은 10초', () => {
  withDir((dir) => assert.strictEqual(createSettingsStore(dir).get().timeoutSec, 10))
})

test('시간 제한을 저장하고 다시 읽는다. 범위 밖이나 숫자가 아닌 값은 무시한다', () => {
  withDir((dir) => {
    const store = createSettingsStore(dir)
    assert.strictEqual(store.set({ timeoutSec: 30 }).timeoutSec, 30)
    assert.strictEqual(store.set({ timeoutSec: 0 }).timeoutSec, 30)
    assert.strictEqual(store.set({ timeoutSec: 9999 }).timeoutSec, 30)
    assert.strictEqual(store.set({ timeoutSec: '5' }).timeoutSec, 30)
  })
})

test('설정 파일의 깨진 시간 제한 값은 기본값으로 대체한다', () => {
  withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ timeoutSec: -5 }))
    assert.strictEqual(createSettingsStore(dir).get().timeoutSec, 10)
  })
})
