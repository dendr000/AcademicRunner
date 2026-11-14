// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { flatten, neighbor, findById } = require('../src/ui/problem-nav')

const levels = [
  { level: 0, problems: [{ id: 'a' }, { id: 'b' }] },
  { level: 1, problems: [{ id: 'c' }] },
]

test('flatten 은 단계를 건너 화면 순서로 펼친다', () => {
  assert.deepStrictEqual(flatten(levels).map((x) => x.problem.id), ['a', 'b', 'c'])
  assert.strictEqual(flatten(levels)[2].level.level, 1)
})

test('neighbor 는 다음/이전 문제를 단계 경계를 넘어 고른다', () => {
  assert.strictEqual(neighbor(levels, 'b', 1).problem.id, 'c')
  assert.strictEqual(neighbor(levels, 'c', -1).problem.id, 'b')
})

test('neighbor 는 끝에서 멈춘다', () => {
  assert.strictEqual(neighbor(levels, 'a', -1), null)
  assert.strictEqual(neighbor(levels, 'c', 1), null)
})

test('neighbor 는 현재 문제가 없거나 목록 밖이면 처음/마지막을 고른다', () => {
  assert.strictEqual(neighbor(levels, null, 1).problem.id, 'a')
  assert.strictEqual(neighbor(levels, 'zzz', -1).problem.id, 'c')
})

test('neighbor 는 빈 목록이면 null', () => {
  assert.strictEqual(neighbor([], 'a', 1), null)
  assert.strictEqual(neighbor([{ level: 0, problems: [] }], null, 1), null)
})

test('findById 는 없거나 잘못된 값이면 null', () => {
  assert.strictEqual(findById(levels, 'b').problem.id, 'b')
  assert.strictEqual(findById(levels, 'x'), null)
  assert.strictEqual(findById(levels, undefined), null)
  assert.strictEqual(findById(levels, 5), null)
})
