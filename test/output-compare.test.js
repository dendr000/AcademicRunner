// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { compareOutput } = require('../electron/core/output-compare')

test('같으면 통과', () => {
  assert.deepStrictEqual(compareOutput('a\nb', 'a\nb'), { pass: true })
})

test('CRLF 와 LF, 줄 끝 공백, 끝의 빈 줄은 무시한다', () => {
  assert.strictEqual(compareOutput('a\nb\n', 'a  \r\nb\r\n\r\n\r\n').pass, true)
  assert.strictEqual(compareOutput('', '\n\n').pass, true)
  assert.strictEqual(compareOutput(undefined, '').pass, true)
})

test('줄 안의 공백과 대소문자는 구분한다', () => {
  assert.strictEqual(compareOutput('a b', 'a  b').pass, false)
  assert.strictEqual(compareOutput('Yes', 'yes').pass, false)
})

test('처음 달라진 줄 번호와 내용을 알려 준다', () => {
  assert.deepStrictEqual(compareOutput('1\n2\n3', '1\n9\n3'), { pass: false, line: 2, expected: '2', actual: '9' })
})

test('한쪽이 먼저 끝나면 없는 쪽은 null', () => {
  assert.deepStrictEqual(compareOutput('1\n2', '1'), { pass: false, line: 2, expected: '2', actual: null })
  assert.deepStrictEqual(compareOutput('1', '1\n2'), { pass: false, line: 2, expected: null, actual: '2' })
})

test('중간 빈 줄은 무시하지 않는다', () => {
  assert.strictEqual(compareOutput('a\n\nb', 'a\nb').pass, false)
})
