// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { inferJavaType, receiverOf, membersFor } = require('../src/ui/member-data')

const names = (list) => list.map((x) => x.name)

test('선언을 읽어 변수 타입을 짐작한다', () => {
  const src = 'Scanner sc = new Scanner(System.in);\nint[] num = new int[9];\nint arr2[] = new int[3];\nList<Integer> list = new ArrayList<>();\nvar sb = new StringBuilder();\nString s = "a";\nint[][] grid;'
  assert.strictEqual(inferJavaType(src, 'sc'), 'Scanner')
  assert.strictEqual(inferJavaType(src, 'num'), 'array')
  assert.strictEqual(inferJavaType(src, 'arr2'), 'array')
  assert.strictEqual(inferJavaType(src, 'grid'), 'array')
  assert.strictEqual(inferJavaType(src, 'list'), 'List')
  assert.strictEqual(inferJavaType(src, 'sb'), 'StringBuilder')
  assert.strictEqual(inferJavaType(src, 's'), 'String')
  assert.strictEqual(inferJavaType(src, 'nothing'), null)
})

test('주석 속 선언은 무시한다', () => {
  assert.strictEqual(inferJavaType('// Scanner sc = null;\nint sc = 1;', 'sc'), 'int')
})

test('receiverOf 는 점 앞의 식을 뽑는다', () => {
  assert.strictEqual(receiverOf('int a = sc'), 'sc')
  assert.strictEqual(receiverOf('    System.out'), 'System.out')
  assert.strictEqual(receiverOf('x = (1 + 2)'), null)
})

test('Java: Scanner 변수는 nextInt, 배열은 length 를 제안한다', () => {
  const src = 'Scanner sc = new Scanner(System.in);\nint[] num = new int[9];'
  assert.ok(names(membersFor('java', src, 'sc')).includes('nextInt'))
  const arr = membersFor('java', src, 'num')
  assert.deepStrictEqual(names(arr).includes('length'), true)
  assert.strictEqual(arr.find((x) => x.name === 'length').params, null) // 속성이라 괄호 없음
})

test('Java: 클래스 이름(static)과 System.out', () => {
  assert.ok(names(membersFor('java', '', 'Math')).includes('max'))
  assert.ok(names(membersFor('java', '', 'Integer')).includes('parseInt'))
  assert.ok(names(membersFor('java', '', 'System.out')).includes('println'))
  assert.ok(names(membersFor('java', '', 'System')).includes('currentTimeMillis'))
})

test('Java: 같은 이름의 변수를 선언했으면 변수가 우선', () => {
  assert.ok(names(membersFor('java', 'Scanner Math = null;', 'Math')).includes('nextInt'))
})

test('Java: 알 수 없는 변수는 제안 없음, 모르는 타입은 Object 메서드', () => {
  assert.deepStrictEqual(membersFor('java', '', 'foo'), [])
  assert.ok(names(membersFor('java', 'Foo f = null;', 'f')).includes('toString'))
})

test('컬렉션 종류별 대표 메서드', () => {
  const src = 'List<Integer> l = new ArrayList<>();\nMap<String, Integer> m = new HashMap<>();\nDeque<Integer> d = new ArrayDeque<>();\nString s = "";'
  assert.ok(names(membersFor('java', src, 'l')).includes('size'))
  assert.ok(names(membersFor('java', src, 'm')).includes('getOrDefault'))
  assert.ok(names(membersFor('java', src, 'd')).includes('pollFirst'))
  assert.ok(names(membersFor('java', src, 's')).includes('charAt'))
})

test('Python·JavaScript 는 대표 메서드를 제안한다', () => {
  assert.ok(names(membersFor('python', '', 'xs')).includes('append'))
  assert.ok(names(membersFor('python', '', 'math')).includes('sqrt'))
  assert.ok(names(membersFor('javascript', '', 'arr')).includes('push'))
  assert.ok(names(membersFor('javascript', '', 'Math')).includes('floor'))
  assert.deepStrictEqual(membersFor('c', '', 'x'), [])
  assert.deepStrictEqual(membersFor('java', '', null), [])
})

test('메서드 호출 결과(sc.nextLine().)의 종류를 짐작한다', () => {
  const { receiverOf, callResultType } = require('../src/ui/member-data')
  assert.strictEqual(receiverOf('String t = sc.nextLine()'), 'sc.nextLine()')
  assert.strictEqual(callResultType('sc.nextLine()'), 'String')
  assert.strictEqual(callResultType('s.split(" ")'), 'array')
  assert.strictEqual(callResultType('list.get(0)'), null)
  assert.ok(names(membersFor('java', 'Scanner sc;', 'sc.nextLine()')).includes('charAt'))
  assert.ok(names(membersFor('java', 'String s;', 's.split(",")')).includes('length'))
  assert.deepStrictEqual(membersFor('java', 'List<Integer> a;', 'a.get(0)'), [])
})

test('Python·JS 는 대입된 값으로 종류를 짐작한다', () => {
  assert.ok(names(membersFor('python', 'a = [1, 2]', 'a')).includes('append'))
  assert.ok(!names(membersFor('python', 'a = [1, 2]', 'a')).includes('upper'))
  assert.ok(names(membersFor('python', 's = input()', 's')).includes('upper'))
  assert.ok(names(membersFor('python', 'w = input().split()', 'w')).includes('append'))
  assert.ok(names(membersFor('python', 'd = {}', 'd')).includes('items'))
  assert.ok(names(membersFor('javascript', 'const m = new Map()', 'm')).includes('has'))
  assert.ok(names(membersFor('javascript', 'let t = "abc"', 't')).includes('toUpperCase'))
  assert.ok(names(membersFor('python', 'zzz', 'q')).includes('append')) // 모르면 공통 목록
})

test('중복 이름이 없고 이름 형식이 올바르다', () => {
  for (const lang of ['python', 'javascript']) {
    const list = names(membersFor(lang, '', 'zzz'))
    assert.strictEqual(new Set(list).size, list.length)
  }
  const { BY_TYPE, STATIC } = require('../src/ui/member-data')
  for (const table of [BY_TYPE, STATIC]) for (const list of Object.values(table)) for (const it of list) assert.match(it.name, /^[A-Za-z_][A-Za-z0-9_]*$/)
})
