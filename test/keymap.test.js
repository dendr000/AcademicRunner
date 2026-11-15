// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { ACTIONS, STORAGE_KEY, chordFromEvent, checkAllowed, displayChord, sanitizeOverrides, effective, createKeymap } = require('../src/ui/keymap')

function fakeStorage(initial) {
  const data = new Map()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data }
}

test('기본 키에 중복이 없고 모두 지정 가능한 키다', () => {
  const chords = ACTIONS.map((a) => a.key).filter(Boolean)
  assert.strictEqual(new Set(chords).size, chords.length)
  for (const c of chords) assert.ok(checkAllowed(c).ok, c)
  assert.strictEqual(new Set(ACTIONS.map((a) => a.id)).size, ACTIONS.length)
})

test('고정 표시 항목(fixed)은 키를 갖지 않아 단축키 충돌에 끼지 않는다', () => {
  const fixed = ACTIONS.filter((a) => a.fixed)
  assert.ok(fixed.length >= 4)
  for (const a of fixed) assert.strictEqual(a.key, '')
  const km = createKeymap(fakeStorage())
  assert.strictEqual(km.actionFor('Ctrl+Z'), null)
})

test('키 이벤트를 키 이름으로 바꾼다', () => {
  assert.strictEqual(chordFromEvent({ code: 'KeyP', ctrlKey: true }), 'Ctrl+P')
  assert.strictEqual(chordFromEvent({ code: 'ArrowUp', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+Up')
  assert.strictEqual(chordFromEvent({ code: 'F5', shiftKey: true }), 'Shift+F5')
  assert.strictEqual(chordFromEvent({ code: 'Digit1', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+1')
  assert.strictEqual(chordFromEvent({ code: 'Equal', ctrlKey: true }), 'Ctrl+=')
  assert.strictEqual(chordFromEvent({ code: 'ControlLeft', ctrlKey: true }), null)
  assert.strictEqual(chordFromEvent({ code: '' }), null)
  assert.strictEqual(chordFromEvent({ code: 'IntlRo' }), null)
})

test('글자만 누르는 키와 편집 기본 키는 거절한다', () => {
  assert.strictEqual(checkAllowed('A').ok, false)
  assert.strictEqual(checkAllowed('Shift+A').ok, false)
  assert.strictEqual(checkAllowed('Enter').ok, false)
  assert.strictEqual(checkAllowed('Ctrl+C').ok, false)
  assert.strictEqual(checkAllowed('Ctrl+Z').ok, false)
  assert.strictEqual(checkAllowed('Alt+F4').ok, false)
  assert.strictEqual(checkAllowed('Ctrl+Esc').ok, false)
  assert.strictEqual(checkAllowed('').ok, false)
  assert.strictEqual(checkAllowed('F9').ok, true)
  assert.strictEqual(checkAllowed('Alt+Up').ok, true)
  assert.strictEqual(checkAllowed('Ctrl+Shift+C').ok, true)
})

test('표시용 글자: 방향 화살표, 비어 있으면 없음', () => {
  assert.strictEqual(displayChord('Ctrl+Shift+Up'), 'Ctrl+Shift+↑')
  assert.strictEqual(displayChord(''), '없음')
  assert.strictEqual(displayChord('F5'), 'F5')
})

test('키를 바꾸면 저장하고, 기본값과 같으면 덮어쓰기를 지운다', () => {
  const st = fakeStorage()
  const km = createKeymap(st)
  assert.strictEqual(km.get('run'), 'F5')
  assert.deepStrictEqual(km.set('run', 'F9'), { ok: true })
  assert.strictEqual(km.get('run'), 'F9')
  assert.strictEqual(km.isCustom('run'), true)
  assert.deepStrictEqual(JSON.parse(st.data.get(STORAGE_KEY)), { run: 'F9' })
  assert.deepStrictEqual(km.set('run', 'F5'), { ok: true })
  assert.strictEqual(km.isCustom('run'), false)
  assert.strictEqual(st.data.has(STORAGE_KEY), false)
})

test('다른 동작이 쓰는 키는 거절하고 이유를 준다', () => {
  const km = createKeymap(fakeStorage())
  const r = km.set('compile', 'F5')
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.conflict, 'run')
  assert.strictEqual(km.get('compile'), 'F6')
  assert.strictEqual(km.set('compile', 'A').ok, false)
  assert.strictEqual(km.set('nope', 'F9').ok, false)
})

test('키를 지우면(빈 글자) 그 동작은 키가 없고, 그 키를 다른 동작이 쓸 수 있다', () => {
  const km = createKeymap(fakeStorage())
  km.set('run', '')
  assert.strictEqual(km.get('run'), '')
  assert.strictEqual(km.actionFor('F5'), null)
  assert.deepStrictEqual(km.set('compile', 'F5'), { ok: true })
  assert.strictEqual(km.actionFor('F5'), 'compile')
})

test('기본 키로 되돌릴 때 그 키가 다른 동작에 쓰이면 거절한다', () => {
  const km = createKeymap(fakeStorage())
  km.set('run', '')
  km.set('compile', 'F5')
  const r = km.reset('run')
  assert.strictEqual(r.ok, false)
  km.reset('compile')
  assert.deepStrictEqual(km.reset('run'), { ok: true })
  assert.strictEqual(km.get('run'), 'F5')
})

test('전체 초기화와 바뀜 알림', () => {
  const st = fakeStorage()
  const km = createKeymap(st)
  let calls = 0
  km.onChange(() => calls++)
  km.set('run', 'F9')
  km.set('stop', 'F10')
  km.resetAll()
  assert.strictEqual(calls, 3)
  assert.strictEqual(km.get('run'), 'F5')
  assert.strictEqual(st.data.has(STORAGE_KEY), false)
})

test('저장된 값이 손상돼도 기본 키로 동작한다', () => {
  for (const bad of ['not json', '[1,2]', '{"run":5}', '{"zzz":"F9"}', '{"run":"A"}', 'null']) {
    const km = createKeymap(fakeStorage(bad))
    assert.strictEqual(km.get('run'), 'F5', bad)
  }
})

test('저장된 값에 같은 키가 겹치면 바꾼 쪽을 버린다', () => {
  const clean = sanitizeOverrides({ run: 'F6' }) // compile 의 기본 키 F6 과 겹침
  assert.deepStrictEqual(clean, {})
  const map = effective(sanitizeOverrides({ run: 'F9', stop: 'F9' }))
  assert.strictEqual(new Set(Object.values(map).filter(Boolean)).size, Object.values(map).filter(Boolean).length)
})

test('저장소를 못 써도(예외) 동작한다', () => {
  const broken = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
  const km = createKeymap(broken)
  assert.deepStrictEqual(km.set('run', 'F9'), { ok: true })
  assert.strictEqual(km.get('run'), 'F9')
})
