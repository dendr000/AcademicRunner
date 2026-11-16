// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { newSuggestions, shouldCloseAngle } = require('../src/ui/new-completion')

test('new 뒤가 아니면 제안하지 않는다', () => {
  for (const b of ['', 'int a = ', 'renew ', 'foo(new', 'x = anew ']) assert.strictEqual(newSuggestions(b), null, b)
})

test('선언한 타입에 맞는 구현 클래스를 맨 위(preferred)로 표시한다', () => {
  const pick = (b) => newSuggestions(b).filter((i) => i.preferred).map((i) => i.name)
  assert.deepStrictEqual(pick('HashMap<String, String> score = new '), ['HashMap'])
  assert.deepStrictEqual(pick('Map<String, Integer> m = new '), ['HashMap'])
  assert.deepStrictEqual(pick('List<Integer> list = new '), ['ArrayList'])
  assert.deepStrictEqual(pick('Deque<int[]> dq = new '), ['ArrayDeque'])
  assert.deepStrictEqual(pick('Scanner sc = new '), ['Scanner'])
  assert.deepStrictEqual(pick('Object o = foo(new '), [])
})

test('제네릭 클래스는 <>() 까지, Scanner 는 System.in 까지 넣는다', () => {
  const items = newSuggestions('List<String> a = new ')
  assert.strictEqual(items.find((i) => i.name === 'ArrayList').insert, 'ArrayList<>()')
  assert.strictEqual(items.find((i) => i.name === 'Scanner').insert, 'Scanner(${1:System.in})')
  assert.strictEqual(items.find((i) => i.name === 'StringBuilder').insert, 'StringBuilder()')
})

test('내가 만든 클래스도 제안하고, 왼쪽 타입이 그것이면 preferred', () => {
  const items = newSuggestions('Person p = new ', ['Person', 'Point'])
  assert.deepStrictEqual(items.filter((i) => i.preferred).map((i) => i.name), ['Person'])
  assert.strictEqual(items.find((i) => i.name === 'Point').insert, 'Point(${1})')
  // 표준 클래스와 이름이 같으면 중복으로 넣지 않는다
  assert.strictEqual(newSuggestions('x = new ', ['Random']).filter((i) => i.name === 'Random').length, 1)
})

test('꺾쇠 자동 닫기: 타입 이름 뒤만, 비교 연산은 제외', () => {
  for (const ok of ['HashMap<', '    List<', 'final Map<', 'for (Entry<', 'new ArrayList<']) assert.strictEqual(shouldCloseAngle(ok), true, ok)
  for (const bad of ['i <', 'a<', 'if (i<', 'MAX<', 'x = 1<', '', 'List', 'foo()<']) assert.strictEqual(shouldCloseAngle(bad), false, bad)
})
