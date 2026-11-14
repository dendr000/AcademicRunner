// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { filterLevels, normalize } = require('../src/ui/problem-filter')

const levels = [
  { level: 0, label: '기초연습', problems: [
    { number: 1, title: 'A+B' },
    { number: 2, title: '구구단' },
    { number: 15, title: 'FizzBuzz' },
  ] },
  { level: 1, label: '입문', problems: [
    { number: 1, title: '세 수의 합' },
    { number: 5, title: '짝수와 홀수' },
  ] },
]

test('검색어가 비어 있으면 전부 보여 준다', () => {
  assert.strictEqual(filterLevels(levels, '', 'all').length, 2)
  assert.strictEqual(filterLevels(levels, '   ', 'all')[0].problems.length, 3)
})

test('제목 일부로 찾고, 공백과 대소문자는 무시한다', () => {
  const r = filterLevels(levels, 'fizz', 'all')
  assert.strictEqual(r.length, 1)
  assert.strictEqual(r[0].problems[0].title, 'FizzBuzz')
  assert.strictEqual(filterLevels(levels, '세수', 'all')[0].problems[0].number, 1)
})

test('번호로 찾는다 (01, 1, 15 모두)', () => {
  assert.strictEqual(filterLevels(levels, '15', 'all')[0].problems[0].title, 'FizzBuzz')
  assert.strictEqual(filterLevels(levels, '05', 'all')[0].problems[0].title, '짝수와 홀수')
  assert.strictEqual(filterLevels(levels, '1', 'all').flatMap((l) => l.problems).length >= 3, true)
})

test('단계 필터는 그 단계만 남긴다', () => {
  const r = filterLevels(levels, '', '1')
  assert.deepStrictEqual(r.map((l) => l.level), [1])
})

test('맞는 문제가 없는 단계는 빠지고, 아무것도 없으면 빈 배열', () => {
  assert.strictEqual(filterLevels(levels, '구구단', 'all').length, 1)
  assert.deepStrictEqual(filterLevels(levels, '없는문제', 'all'), [])
  assert.deepStrictEqual(filterLevels(levels, '구구단', '1'), [])
})

test('원본 데이터를 바꾸지 않는다', () => {
  const before = JSON.stringify(levels)
  filterLevels(levels, '구구단', 'all')
  assert.strictEqual(JSON.stringify(levels), before)
})

test('normalize 는 null 과 숫자도 처리한다', () => {
  assert.strictEqual(normalize(null), '')
  assert.strictEqual(normalize(12), '12')
})
