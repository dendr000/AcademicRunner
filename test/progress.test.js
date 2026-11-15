// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { STORAGE_KEY, createProgress, countStatuses, matcherFor, dateKey } = require('../src/ui/progress')

function fakeStorage(initial) {
  const data = new Map()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data }
}
const day = (s) => () => new Date(s)

test('안 품 / 작성 중 / 통과 판단', () => {
  const p = createProgress(fakeStorage(), day('2026-11-15T10:00:00'))
  const info = { fileName: 'Main.java', edited: true, hash: 'aaa' }
  assert.strictEqual(p.statusOf('Lv0_a/01_b', null), 'untouched')
  assert.strictEqual(p.statusOf('Lv0_a/01_b', { ...info, edited: false }), 'untouched')
  assert.strictEqual(p.statusOf('Lv0_a/01_b', info), 'working')
  p.markPassed('Lv0_a/01_b', 'Main.java', 'aaa')
  assert.strictEqual(p.statusOf('Lv0_a/01_b', info), 'passed')
  // 통과한 뒤 코드가 바뀌면 다시 작성 중
  assert.strictEqual(p.statusOf('Lv0_a/01_b', { ...info, hash: 'bbb' }), 'working')
  // 다른 파일(Main.py)의 통과 기록은 다른 파일 상태에 영향이 없다
  assert.strictEqual(p.statusOf('Lv0_a/01_b', { fileName: 'Main.py', edited: true, hash: 'aaa' }), 'working')
})

test('시작 코드로 되돌리면(edited=false) 통과 기록이 있어도 안 품', () => {
  const p = createProgress(fakeStorage(), day('2026-11-15T10:00:00'))
  p.markPassed('Lv0_a/01_b', 'Main.java', 'aaa')
  assert.strictEqual(p.statusOf('Lv0_a/01_b', { fileName: 'Main.java', edited: false, hash: 'aaa' }), 'untouched')
})

test('통과 기록은 저장소에 남고 다시 읽는다', () => {
  const st = fakeStorage()
  createProgress(st, day('2026-11-15T10:00:00')).markPassed('Lv0_a/01_b', 'Main.java', 'aaa')
  const again = createProgress(st, day('2026-11-16T10:00:00'))
  assert.strictEqual(again.statusOf('Lv0_a/01_b', { fileName: 'Main.java', edited: true, hash: 'aaa' }), 'passed')
})

test('오늘 통과 판단: 날짜가 바뀌면 오늘이 아님', () => {
  const st = fakeStorage()
  const info = { fileName: 'Main.java', edited: true, hash: 'aaa' }
  createProgress(st, day('2026-11-15T23:59:00')).markPassed('Lv0_a/01_b', 'Main.java', 'aaa')
  assert.strictEqual(createProgress(st, day('2026-11-15T23:59:30')).passedToday('Lv0_a/01_b', info), true)
  assert.strictEqual(createProgress(st, day('2026-11-16T00:01:00')).passedToday('Lv0_a/01_b', info), false)
  assert.strictEqual(createProgress(st, day('2026-11-15T12:00:00')).passedToday('Lv0_a/01_b', { ...info, hash: 'zzz' }), false)
})

test('손상된 저장값과 잘못된 인수는 무시한다', () => {
  for (const bad of ['not json', '[1]', '{"x":5}', '{"x":{"hash":""}}', 'null']) {
    const p = createProgress(fakeStorage(bad), day('2026-11-15T10:00:00'))
    assert.strictEqual(p.statusOf('x', { fileName: 'Main.java', edited: true, hash: 'a' }), 'working', bad)
  }
  const p = createProgress(fakeStorage(), day('2026-11-15T10:00:00'))
  assert.strictEqual(p.markPassed('', 'Main.java', 'a'), false)
  assert.strictEqual(p.markPassed('x', 'Main.java', ''), false)
  const broken = createProgress({ getItem() { throw new Error('x') }, setItem() { throw new Error('x') } }, day('2026-11-15T10:00:00'))
  assert.strictEqual(broken.markPassed('x', 'Main.java', 'a'), true)
})

test('forget 은 통과 기록을 지운다', () => {
  const p = createProgress(fakeStorage(), day('2026-11-15T10:00:00'))
  p.markPassed('x', 'Main.java', 'a')
  p.forget('x', 'Main.java')
  assert.strictEqual(p.statusOf('x', { fileName: 'Main.java', edited: true, hash: 'a' }), 'working')
})

test('집계와 상태 필터', () => {
  const levels = [{ problems: [{ id: 'a' }, { id: 'b' }] }, { problems: [{ id: 'c' }] }]
  const status = { a: 'passed', b: 'working', c: 'untouched' }
  const fn = (p) => status[p.id]
  assert.deepStrictEqual(countStatuses(levels, fn), { untouched: 1, working: 1, passed: 1, total: 3 })
  const all = levels.flatMap((l) => l.problems)
  assert.deepStrictEqual(all.filter(matcherFor('passed', fn, () => false)).map((p) => p.id), ['a'])
  assert.deepStrictEqual(all.filter(matcherFor('all', fn, () => false)).length, 3)
  assert.deepStrictEqual(all.filter(matcherFor('today', fn, (p) => p.id === 'b')).map((p) => p.id), ['b'])
})

test('dateKey 는 지역 날짜 YYYY-MM-DD', () => {
  assert.strictEqual(dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})
