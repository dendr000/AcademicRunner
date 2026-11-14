// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { parseSignature, generateHarness, literal, javaString } = require('../electron/core/harness/java-harness')

test('starter 모양의 solution 메서드를 읽는다', () => {
  const s = parseSignature('class Solution {\n  public int solution(int n) {\n  }\n}\n')
  assert.deepStrictEqual(s, { returnType: 'int', params: [{ type: 'int', name: 'n' }] })
})

test('배열·제네릭·여러 매개변수를 읽는다', () => {
  const s = parseSignature('class Solution { public String[] solution(int[] a, String s, List<Integer> xs) { return null; } }')
  assert.strictEqual(s.returnType, 'String[]')
  assert.deepStrictEqual(
    s.params.map((p) => p.type),
    ['int[]', 'String', 'List<Integer>'],
  )
})

test('Map<String,Integer> 안의 쉼표로 매개변수를 나누지 않는다', () => {
  const s = parseSignature('class Solution { int solution(Map<String, Integer> m, int k) { return 0; } }')
  assert.deepStrictEqual(
    s.params.map((p) => p.type),
    ['Map<String,Integer>', 'int'],
  )
})

test('주석 속 solution 은 무시하고, 없으면 null', () => {
  assert.strictEqual(parseSignature('class Solution { /* int solution(int n) { */ }'), null)
  assert.strictEqual(parseSignature('class Solution { void other() {} }'), null)
})

test('매개변수가 없는 solution 도 읽는다', () => {
  assert.deepStrictEqual(parseSignature('class Solution { int solution() { return 1; } }').params, [])
})

test('literal: 기본형·문자열·배열을 자바 코드로 바꾼다', () => {
  assert.strictEqual(literal('int', 5), '5')
  assert.strictEqual(literal('long', 5), '5L')
  assert.strictEqual(literal('double', 2), '2.0')
  assert.strictEqual(literal('boolean', true), 'true')
  assert.strictEqual(literal('char', 'a'), '(char) 97')
  assert.strictEqual(literal('String', 'hi"\n'), '"hi\\"\\n"')
  assert.strictEqual(literal('int[]', [1, 2]), 'new int[] {1, 2}')
  assert.strictEqual(literal('int[][]', [[1], [2, 3]]), 'new int[][] {new int[] {1}, new int[] {2, 3}}')
  assert.strictEqual(literal('String', null), 'null')
})

test('literal: 한글은 유니코드 이스케이프로 쓴다', () => {
  assert.strictEqual(javaString('가'), '"\\uac00"')
})

test('literal: 타입이 안 맞으면 isLiteralError 를 던진다', () => {
  assert.throws(() => literal('int', 'x'), (e) => e.isLiteralError === true)
  assert.throws(() => literal('int', 1.5), (e) => e.isLiteralError === true)
  assert.throws(() => literal('int[]', 3), (e) => e.isLiteralError === true)
  assert.throws(() => literal('Foo', 3), (e) => e.isLiteralError === true)
})

test('generateHarness: 케이스마다 분기를 만들고, 잘못된 인수는 그 케이스만 예외로 둔다', () => {
  const sig = parseSignature('class Solution { public int solution(int n) { return n; } }')
  const h = generateHarness(sig, [{ input: '[3]' }, { input: '[1, 2]' }, { input: 'abc' }])
  assert.ok(h.source.includes('case 0: return new Solution().solution(3);'))
  assert.ok(h.source.includes('case 1: throw new IllegalArgumentException'))
  assert.ok(h.source.includes('case 2: throw new IllegalArgumentException'))
  assert.strictEqual(h.className, '__ArHarness')
})

test('generateHarness: void 반환은 거절한다', () => {
  const sig = parseSignature('class Solution { public void solution(int n) { } }')
  assert.strictEqual(generateHarness(sig, [{ input: '[1]' }]).error, 'VOID_RETURN')
})
