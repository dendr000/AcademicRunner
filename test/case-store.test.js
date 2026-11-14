// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createCaseStore, MAX_CASES_PER_PROBLEM, MAX_TEXT_LENGTH } = require('../electron/core/case-store')

const ID = 'Lv0_기초연습/01_A+B'

function withStore(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-cases-'))
  try {
    fn(createCaseStore(dir), dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('처음에는 케이스가 없다', () => {
  withStore((store) => assert.deepStrictEqual(store.list(ID), []))
})

test('추가하면 id 와 기본 이름이 생기고 다시 읽을 수 있다', () => {
  withStore((store, dir) => {
    const r = store.save(ID, { input: '3 4\n', expected: '합: 7\n' })
    assert.strictEqual(r.ok, true)
    assert.ok(r.case.id)
    assert.strictEqual(r.case.name, '케이스 1')
    const again = createCaseStore(dir).list(ID) // 새 저장소 객체로 읽어도 남아 있다
    assert.deepStrictEqual(again, [r.case])
  })
})

test('id 가 있으면 그 케이스를 고치고, 없는 id 는 NOT_FOUND', () => {
  withStore((store) => {
    const a = store.save(ID, { name: '기본', input: '1 2', expected: '3' }).case
    store.save(ID, { name: '둘째', input: '5 5', expected: '10' })
    const edited = store.save(ID, { id: a.id, name: '기본2', input: '1 3', expected: '4' })
    assert.strictEqual(edited.ok, true)
    assert.deepStrictEqual(store.list(ID).map((c) => c.name), ['기본2', '둘째'])
    assert.strictEqual(store.save(ID, { id: 'nope', input: '', expected: '' }).error, 'NOT_FOUND')
  })
})

test('삭제하면 사라지고 없는 케이스는 NOT_FOUND', () => {
  withStore((store) => {
    const a = store.save(ID, { input: '1', expected: '1' }).case
    assert.strictEqual(store.remove(ID, a.id).ok, true)
    assert.deepStrictEqual(store.list(ID), [])
    assert.strictEqual(store.remove(ID, a.id).error, 'NOT_FOUND')
  })
})

test('문제별로 따로 저장된다', () => {
  withStore((store) => {
    store.save(ID, { input: 'a', expected: 'a' })
    store.save('Lv1_입문/02_구구단', { input: 'b', expected: 'b' })
    assert.strictEqual(store.list(ID).length, 1)
    assert.strictEqual(store.list('Lv1_입문/02_구구단')[0].input, 'b')
  })
})

test('잘못된 문제 id, 너무 긴 글, 너무 많은 케이스를 거부한다', () => {
  withStore((store) => {
    assert.strictEqual(store.save('../x', { input: '', expected: '' }).error, 'BAD_PROBLEM_ID')
    assert.strictEqual(store.save('Lv0_a/../../b', { input: '', expected: '' }).error, 'BAD_PROBLEM_ID')
    assert.deepStrictEqual(store.list('../x'), [])
    assert.strictEqual(store.save(ID, { input: 'a'.repeat(MAX_TEXT_LENGTH + 1), expected: '' }).error, 'TEXT_TOO_LONG')
    assert.strictEqual(store.save(ID, { name: 'n'.repeat(81), input: '', expected: '' }).error, 'NAME_TOO_LONG')
    assert.strictEqual(store.save(ID, null).error, 'BAD_ARGUMENT')
    for (let i = 0; i < MAX_CASES_PER_PROBLEM; i++) store.save(ID, { input: String(i), expected: '' })
    assert.strictEqual(store.save(ID, { input: 'x', expected: '' }).error, 'TOO_MANY_CASES')
  })
})

test('깨진 cases.json 은 빈 상태로 보고 다시 저장할 수 있다', () => {
  withStore((store, dir) => {
    fs.writeFileSync(path.join(dir, 'cases.json'), '{깨짐')
    assert.deepStrictEqual(store.list(ID), [])
    assert.strictEqual(store.save(ID, { input: '1', expected: '1' }).ok, true)
  })
})
