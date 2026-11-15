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

const SRC = [
  'class Person {',
  '    private String name;',
  '    int age, height;',
  '    static int count = 0;',
  '    Person(String name) { this.name = name; }',
  '    String getName() { return name; }',
  '    void setAge(int age, List<String> tags) { this.age = age; }',
  '    static Person of(String n) { return new Person(n); }',
  '    // void hidden() {}',
  '}',
  'enum Color { RED, GREEN(1), BLUE; int v; }',
  'record Point(int x, int y) { double dist() { return 0; } }',
  'public class Main {',
  '    int total;',
  '    void run() {',
  '        Person p = new Person("a");',
  '        Color c = Color.RED;',
  '        Point pt = new Point(1, 2);',
  '        Random rnd = new Random();',
  '        BufferedReader br = null;',
  '    }',
  '}',
].join('\n')

test('내가 만든 클래스: 변수.은 필드·메서드(시그니처 포함)를 제안한다', () => {
  const list = membersFor('java', SRC, 'p')
  const n = names(list)
  for (const x of ['name', 'age', 'height', 'count', 'getName', 'setAge', 'of', 'toString']) assert.ok(n.includes(x), x)
  assert.ok(!n.includes('hidden'))
  assert.ok(!n.includes('Person')) // 생성자는 제외
  const set = list.find((x) => x.name === 'setAge')
  assert.strictEqual(set.detail, '(int age, List<String> tags) -> void')
  assert.strictEqual(set.params, '${1:age}, ${2:tags}')
  assert.strictEqual(list.find((x) => x.name === 'age').params, null)
})

test('내가 만든 클래스 이름.은 static 과 enum 상수만 제안한다', () => {
  assert.deepStrictEqual(names(membersFor('java', SRC, 'Person')).sort(), ['count', 'of'])
  assert.deepStrictEqual(names(membersFor('java', SRC, 'Color')).sort(), ['BLUE', 'GREEN', 'RED'])
})

test('record 는 구성 요소를 접근 메서드로 제안한다', () => {
  const n = names(membersFor('java', SRC, 'pt'))
  assert.ok(n.includes('x') && n.includes('y') && n.includes('dist'))
})

test('this. 는 커서가 있는 클래스의 멤버를 제안한다', () => {
  const inPerson = SRC.indexOf('this.name') + 5
  const inMain = SRC.indexOf('Person p = new') + 1
  assert.ok(names(membersFor('java', SRC, 'this', inPerson)).includes('getName'))
  const main = names(membersFor('java', SRC, 'this', inMain))
  assert.ok(main.includes('total') && main.includes('run') && !main.includes('getName'))
  assert.deepStrictEqual(membersFor('java', SRC, 'this'), []) // 위치를 모르면 제안하지 않음
})

test('필드·메서드 결과 타입을 따라간다 (p.name. / p.getName().)', () => {
  assert.ok(names(membersFor('java', SRC, 'p.name')).includes('substring'))
  assert.ok(names(membersFor('java', SRC, 'p.getName()')).includes('length'))
  assert.ok(names(membersFor('java', SRC, 'Person.of("x")')).includes('getName'))
  assert.deepStrictEqual(membersFor('java', SRC, 'p.age'), []) // int 필드는 점 뒤에 붙일 것이 없다
})

test('표준 클래스 추가: Random, BufferedReader, Objects', () => {
  assert.ok(names(membersFor('java', SRC, 'rnd')).includes('nextInt'))
  assert.ok(names(membersFor('java', SRC, 'br')).includes('readLine'))
  assert.ok(names(membersFor('java', 'int a;', 'Objects')).includes('equals'))
})

test('사용자 클래스가 없거나 깨진 소스에도 죽지 않는다', () => {
  assert.deepStrictEqual(membersFor('java', 'class {', 'x'), [])
  assert.deepStrictEqual(membersFor('java', 'class A { void f( {', 'x'), [])
  assert.deepStrictEqual(membersFor('java', '', 'x'), [])
})
