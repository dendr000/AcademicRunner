// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const tools = require('../electron/core/tool-locator')

test('찾은 도구는 파일이 있는 동안 다시 찾지 않는다', () => {
  tools.resetCache()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-tool-'))
  try {
    const exe = path.join(dir, 'javac.exe')
    fs.writeFileSync(exe, '')
    let calls = 0
    const finder = () => (calls++, { javac: exe, java: exe })
    tools.cached('t1', finder)
    tools.cached('t1', finder)
    assert.strictEqual(calls, 1)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    tools.resetCache()
  }
})

test('못 찾았거나 찾아 둔 파일이 사라졌으면 다시 찾는다', () => {
  tools.resetCache()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-tool-'))
  try {
    let calls = 0
    tools.cached('t2', () => (calls++, null))
    tools.cached('t2', () => (calls++, null))
    assert.strictEqual(calls, 2) // 못 찾은 결과는 붙잡아 두지 않는다
    const exe = path.join(dir, 'python.exe')
    fs.writeFileSync(exe, '')
    tools.cached('t3', () => ({ python: exe }))
    fs.rmSync(exe)
    let again = 0
    tools.cached('t3', () => (again++, { python: exe }))
    assert.strictEqual(again, 1)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    tools.resetCache()
  }
})
