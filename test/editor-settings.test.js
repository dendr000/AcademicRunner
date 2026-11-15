// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { STORAGE_KEY, DEFAULTS, sanitize, clampFont, toMonacoOptions, createEditorSettings } = require('../src/ui/editor-settings')

function fakeStorage(initial) {
  const data = new Map()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data }
}

test('저장값이 없으면 기본값', () => {
  assert.deepStrictEqual(createEditorSettings(fakeStorage()).get(), DEFAULTS)
})

test('항목별로 검사하고 이상한 값은 기본값으로 되돌린다', () => {
  assert.deepStrictEqual(sanitize({ fontSize: 99, tabSize: 3, wordWrap: 'yes', minimap: 1 }), DEFAULTS)
  assert.deepStrictEqual(sanitize({ fontSize: 20, tabSize: 2, wordWrap: true, minimap: true }), { fontSize: 20, tabSize: 2, wordWrap: true, minimap: true })
  assert.strictEqual(sanitize({ fontSize: 15.5 }).fontSize, DEFAULTS.fontSize)
  for (const bad of [null, undefined, 5, 'x', [1]]) assert.deepStrictEqual(sanitize(bad), DEFAULTS)
  // 일부만 맞아도 맞는 항목은 살린다
  assert.strictEqual(sanitize({ fontSize: 18, tabSize: 7 }).fontSize, 18)
})

test('손상된 JSON 이나 저장소 오류에도 기본값', () => {
  assert.deepStrictEqual(createEditorSettings(fakeStorage('not json')).get(), DEFAULTS)
  const broken = createEditorSettings({ getItem() { throw new Error('x') }, setItem() { throw new Error('x') } })
  assert.deepStrictEqual(broken.get(), DEFAULTS)
  assert.strictEqual(broken.set({ fontSize: 20 }), true) // 저장 실패해도 이번 실행에서는 유지
  assert.strictEqual(broken.get().fontSize, 20)
})

test('set 은 일부만 바꾸고 저장하며 변경을 알린다', () => {
  const st = fakeStorage()
  const s = createEditorSettings(st)
  const seen = []
  s.onChange((v) => seen.push(v.fontSize))
  assert.strictEqual(s.set({ fontSize: 18 }), true)
  assert.strictEqual(s.set({ fontSize: 18 }), false) // 같은 값이면 알리지 않음
  assert.deepStrictEqual(seen, [18])
  assert.strictEqual(s.get().tabSize, 4)
  assert.strictEqual(createEditorSettings(st).get().fontSize, 18) // 다시 읽어도 유지
})

test('글자 크기는 8~40 으로 맞춘다', () => {
  assert.strictEqual(clampFont(3), 8)
  assert.strictEqual(clampFont(100), 40)
  assert.strictEqual(clampFont('17'), 17)
  assert.strictEqual(clampFont('abc'), DEFAULTS.fontSize)
  const s = createEditorSettings(fakeStorage())
  s.set({ fontSize: 100 })
  assert.strictEqual(s.get().fontSize, 40)
})

test('reset 은 기본값으로 되돌리고 구독 해제가 된다', () => {
  const s = createEditorSettings(fakeStorage())
  let count = 0
  const off = s.onChange(() => count++)
  s.set({ tabSize: 2, wordWrap: true })
  s.reset()
  assert.deepStrictEqual(s.get(), DEFAULTS)
  assert.strictEqual(count, 2)
  off()
  s.set({ tabSize: 8 })
  assert.strictEqual(count, 2)
})

test('Monaco 옵션으로 바꾼다', () => {
  assert.deepStrictEqual(toMonacoOptions({ fontSize: 16, tabSize: 2, wordWrap: true, minimap: true }), { fontSize: 16, tabSize: 2, wordWrap: 'on', minimap: { enabled: true } })
  assert.strictEqual(toMonacoOptions(DEFAULTS).wordWrap, 'off')
})
