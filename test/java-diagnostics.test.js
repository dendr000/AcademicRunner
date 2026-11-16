// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { analyzeJava, closestType, distance } = require('../src/ui/java-diagnostics')

const texts = (src) => analyzeJava(src).map((d) => src.slice(d.start, d.end) + ':' + d.severity)

test('거리: 자리 바꿈은 1, 글자 바꾸기·빠뜨리기도 1', () => {
  assert.strictEqual(distance('Stirng', 'String'), 1)
  assert.strictEqual(distance('Strng', 'String'), 1)
  assert.strictEqual(distance('Strinq', 'String'), 1)
  assert.strictEqual(distance('abc', 'xyz'), 3)
})

test('타입 오타를 잡고 알맞은 이름을 알려 준다', () => {
  const src = 'import java.util.*;\nclass Solution {\n  void f() {\n    HashMap<String, Stirng> score = new HashMap<>();\n  }\n}'
  const found = analyzeJava(src)
  assert.deepStrictEqual(found.map((d) => src.slice(d.start, d.end)), ['Stirng'])
  assert.strictEqual(found[0].severity, 'error')
  assert.match(found[0].message, /'String'/)
  assert.strictEqual(closestType('Sting'), 'String')
  assert.strictEqual(closestType('Interger'), 'Integer')
})

test('빠진 import 는 경고로 알린다', () => {
  const src = 'class Solution {\n  void f() {\n    HashMap<String, String> m = new HashMap<>();\n  }\n}'
  assert.deepStrictEqual(texts(src), ['HashMap:warning', 'HashMap:warning'])
  assert.match(analyzeJava(src)[0].message, /import java\.util\.HashMap;/)
})

test('import 가 있으면 경고하지 않는다 (와일드카드, 개별, java.lang)', () => {
  assert.deepStrictEqual(texts('import java.util.*;\nclass A { HashMap<String,String> m; Scanner s; }'), [])
  assert.deepStrictEqual(texts('import java.util.HashMap;\nimport java.util.List;\nclass A { HashMap<String,String> m; List<String> l; }'), [])
  assert.deepStrictEqual(texts('class A { String s; Integer i; Math m; StringBuilder b; }'), [])
  // 개별 import 한 것만 면제되고 다른 것은 경고
  assert.deepStrictEqual(texts('import java.util.HashMap;\nclass A { HashMap<String,String> m; Scanner s; }'), ['Scanner:warning'])
})

test('오탐을 줄인다: 직접 만든 클래스, 상수, 타입 매개변수, 문자열·주석, 완전한 이름', () => {
  assert.deepStrictEqual(texts('class Node { Node next; }\nclass A { Node n; Widget w; }'), [])
  assert.deepStrictEqual(texts('class Box<T> { T v; static final int MAX = 1; int a = MAX; }'), [])
  assert.deepStrictEqual(texts('class A { String s = "Stirng HashMap"; // Stirng\n /* HashMap */ }'), [])
  assert.deepStrictEqual(texts('class A { java.util.List<String> l; }'), [])
  assert.deepStrictEqual(texts('class A {\n  int x = 1;\n}'), [])
})

test('이름이 아는 타입과 많이 다르면 라이브러리 클래스일 수 있어 표시하지 않는다', () => {
  assert.deepStrictEqual(texts('class A { LocalDate d; Pattern p; }'), [])
})

test('빈 입력과 아주 큰 입력에도 죽지 않는다', () => {
  assert.deepStrictEqual(analyzeJava(''), [])
  assert.deepStrictEqual(analyzeJava(undefined), [])
  assert.deepStrictEqual(analyzeJava('x'.repeat(300000)), [])
})
