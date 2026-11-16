// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { computeParamHints, parseArgs } = require('../src/ui/param-hints')

const show = (src) => computeParamHints(src).map((h) => src.slice(h.offset, h.offset + 6).split(/[,)]/)[0] + '<-' + h.label)

const MAIN = [
  'class Main {',
  '  int a, b;',
  '  Main(int num, int cum) { a = num; b = cum; }',
  '  int add(int x, int y) { return x + y; }',
  '  void say(String msg) { }',
  '  static void run() {',
  '    Main m = new Main(3, 2);',
  '    int r = m.add(r1(), 5);',
  '    m.say("hi");',
  '    m.say(text);',
  '  }',
  '}',
].join('\n')

test('생성자 호출에 매개변수 이름을 붙인다', () => {
  const hints = computeParamHints(MAIN)
  const labels = hints.map((h) => h.label)
  assert.deepStrictEqual(labels.slice(0, 2), ['num:', 'cum:'])
  assert.strictEqual(MAIN[hints[0].offset], '3')
  assert.strictEqual(MAIN[hints[1].offset], '2')
})

test('메서드 호출도 붙이고, 인수 하나는 리터럴일 때만 붙인다', () => {
  const labels = computeParamHints(MAIN).map((h) => h.label)
  assert.deepStrictEqual(labels, ['num:', 'cum:', 'x:', 'y:', 'msg:']) // m.say(text) 는 변수 하나라 제외
})

test('메서드·생성자 선언 자체에는 붙이지 않는다', () => {
  const src = 'class A {\n  A(int p, int q) {}\n  void f(int u, int v) {}\n}'
  assert.deepStrictEqual(computeParamHints(src), [])
})

test('인수가 매개변수 이름과 같으면 붙이지 않는다', () => {
  const src = 'class A {\n  void f(int u, int v) {}\n  void g(int u, int w) { f(u, 5); }\n}'
  assert.deepStrictEqual(computeParamHints(src).map((h) => h.label), ['v:'])
})

test('인수 개수가 맞는 선언이 없으면 붙이지 않는다', () => {
  const src = 'class A {\n  void f(int u, int v) {}\n  void g() { f(1); f(1, 2, 3); }\n}'
  assert.deepStrictEqual(computeParamHints(src), [])
})

test('표준 클래스 메서드(list.add 등)는 내가 만든 같은 이름과 헷갈리지 않는다', () => {
  const src = 'class A {\n  void add(int idx, int val) {}\n  void g() {\n    List<Integer> list = new ArrayList<>();\n    list.add(0, 5);\n    add(1, 2);\n  }\n}'
  assert.deepStrictEqual(computeParamHints(src).map((h) => h.label), ['idx:', 'val:'])
})

test('중첩 호출·제네릭·문자열 속 쉼표를 인수 경계로 오해하지 않는다', () => {
  const src = 'class A {\n  void f(int a, String b, Map<String, Integer> c) {}\n  void g() { f(max(1, 2), "x,y", new HashMap<String, Integer>()); }\n}'
  const hints = computeParamHints(src)
  assert.deepStrictEqual(hints.map((h) => h.label), ['a:', 'b:', 'c:'])
  assert.ok(src.slice(hints[1].offset).startsWith('"x,y"'))
})

test('오버로드 이름 목록이 다르면 건너뛰고, 같으면 붙인다', () => {
  const diff = 'class A {\n  void f(int a, int b) {}\n  void f(int c, int d) {}\n  void g() { f(1, 2); }\n}'
  assert.deepStrictEqual(computeParamHints(diff), [])
  const same = 'class A {\n  void f(int a, int b) {}\n  void f(int a, int b, int c) {}\n  void g() { f(1, 2); }\n}'
  assert.deepStrictEqual(computeParamHints(same).map((h) => h.label), ['a:', 'b:'])
})

test('record 구성 요소와 깨진 입력', () => {
  const src = 'record Point(int x, int y) {}\nclass M { void f() { new Point(1, 2); } }'
  assert.deepStrictEqual(computeParamHints(src).map((h) => h.label), ['x:', 'y:'])
  for (const bad of ['', 'class A { void f(int a, int b) {} void g() { f(1, ', 'class {', undefined]) assert.doesNotThrow(() => computeParamHints(bad))
  assert.strictEqual(parseArgs('f(1, (2', 1), null)
})
