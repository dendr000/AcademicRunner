// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { compareJson, deepEqual, lastLine } = require('../electron/core/json-compare')

test('같은 값은 공백과 정수/실수 표기가 달라도 통과한다', () => {
  assert.strictEqual(compareJson('55', ' 55 ').pass, true)
  assert.strictEqual(compareJson('1', '1.0').pass, true)
  assert.strictEqual(compareJson('[1, 2,3]', '[1,2,3]').pass, true)
  assert.strictEqual(compareJson('"abc"', '"abc"').pass, true)
})

test('키 순서가 달라도 같은 객체로 본다', () => {
  assert.strictEqual(compareJson('{"a":1,"b":2}', '{"b":2,"a":1}').pass, true)
})

test('값이 다르면 실패하고 정규화된 글자를 돌려준다', () => {
  const r = compareJson('[1, 2]', '[1,3]')
  assert.strictEqual(r.pass, false)
  assert.strictEqual(r.expectedText, '[1,2]')
  assert.strictEqual(r.actualText, '[1,3]')
})

test('소수는 아주 작은 오차를 같은 값으로 본다', () => {
  assert.strictEqual(compareJson('0.3', '0.30000000000000004').pass, true)
  assert.strictEqual(compareJson('0.3', '0.31').pass, false)
})

test('배열 길이·타입이 다르면 실패한다', () => {
  assert.strictEqual(deepEqual([1], [1, 2]), false)
  assert.strictEqual(deepEqual([1], { 0: 1 }), false)
  assert.strictEqual(deepEqual(null, 0), false)
  assert.strictEqual(deepEqual('1', 1), false)
})

test('기대 값이나 실제 값이 JSON 이 아니면 오류 종류를 알려 준다', () => {
  assert.strictEqual(compareJson('abc', '1').error, 'BAD_EXPECTED')
  assert.strictEqual(compareJson('1', 'abc').error, 'BAD_ACTUAL')
})

test('빈 기대 값은 null 로 본다', () => {
  assert.strictEqual(compareJson('', 'null').pass, true)
})

test('lastLine 은 마지막 비어 있지 않은 줄을 고른다', () => {
  assert.strictEqual(lastLine('디버그\n\n[1,2]\n\n'), '[1,2]')
  assert.strictEqual(lastLine('a\r\nb\r\n'), 'b')
  assert.strictEqual(lastLine(''), '')
  assert.strictEqual(lastLine(undefined), '')
})
