// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { analyzeAll } = require('../src/ui/java-diagnostics')
const syntax = require('../src/ui/java-syntax')
const scope = require('../src/ui/java-scope')

const found = (src) => analyzeAll(src).map((d) => src.slice(d.start, d.end) + ':' + d.severity)
const wrap = (body) => 'class Solution {\n  public int solution(int[] scores) {\n' + body + '\n  }\n}'

test('new new 처럼 같은 키워드가 연달아 쓰이면 두 번째를 표시한다', () => {
  const src = wrap('    String[] a = new new String[3];')
  const d = analyzeAll(src).filter((x) => /두 번/.test(x.message))
  assert.strictEqual(d.length, 1)
  assert.strictEqual(src.slice(d[0].start, d[0].end), 'new')
  assert.ok(d[0].start > src.indexOf('new') + 2) // 첫 번째가 아니라 두 번째
  assert.deepStrictEqual(found('class A { void f() { int newValue = 1; String s = "new new"; // new new\n } }'), [])
})

test('괄호 짝: 닫는 괄호가 다르거나 없거나 남으면 알린다', () => {
  assert.strictEqual(syntax.checkBrackets('a = new String[n);').length, 1)
  assert.match(syntax.checkBrackets('a = new String[n);')[0].message, /'\[' 로 연 괄호를 '\)' 로 닫았습니다/)
  assert.match(syntax.checkBrackets('void f() {')[0].message, /'\{' 를 닫는 '\}' 가 없습니다/)
  assert.match(syntax.checkBrackets('f());')[0].message, /여는 괄호가 없는/)
  assert.deepStrictEqual(syntax.checkBrackets('void f() { int[] a = {1, 2}; g(a[0]); }'), [])
  // 문자열·주석 안의 괄호는 코드가 아니다(blank 된 입력 기준)
  assert.deepStrictEqual(found('class A { String s = "((("; char c = \'{\'; // )\n }'), [])
})

test('괄호가 틀리면 변수 점검은 하지 않는다(연쇄 오류 방지)', () => {
  const src = wrap('    int x = (1 + 2;\n    y = 3;')
  assert.ok(analyzeAll(src).every((d) => !/찾을 수 없습니다/.test(d.message)))
})

test('조건식 안의 단일 = 를 경고한다. 비교 연산자와 안쪽 괄호 대입은 정상', () => {
  assert.strictEqual(syntax.checkConditionAssign('if (x = 5) { }').length, 1)
  assert.strictEqual(syntax.checkConditionAssign('while (a = b) { }').length, 1)
  for (const ok of ['if (x == 5) {}', 'if (x != 5) {}', 'if (x <= 5 && y >= 2) {}', 'while ((line = r.readLine()) != null) {}', 'for (int i = 0; i < n; i++) {}', 'if (a) { x = 1; }']) {
    assert.deepStrictEqual(syntax.checkConditionAssign(ok), [], ok)
  }
})

test('리터럴과 변수 타입이 안 맞는 대입을 잡는다', () => {
  const src = 'class A { void f() {\n int a = "abc";\n String s = 5;\n int n = 3.5;\n boolean b = 1;\n String t = \'c\';\n float g = 2.5;\n String u = true;\n } }'
  const msgs = syntax.checkLiteralTypes(src.replace(/"[^"]*"|'[^']*'/g, (s) => ' '.repeat(s.length)), src).map((d) => src.slice(d.start, d.end))
  assert.deepStrictEqual(msgs, ['"abc"', '5', '3.5', '1', "'c'", '2.5', 'true'])
})

test('맞는 리터럴 대입은 건드리지 않는다', () => {
  const src = 'class A { void f() {\n int a = 5; long l = 10; double d = 3.5; double e = 3; float g = 2.5f; char c = \'a\'; int k = \'a\'; String s = "x"; boolean b = true; String[] arr = {"a"}; int[] z = new int[3];\n } }'
  assert.deepStrictEqual(syntax.checkLiteralTypes(src.replace(/"[^"]*"|'[^']*'/g, (s) => ' '.repeat(s.length)), src), [])
})

test('선언 전·블록 밖에서 쓴 변수를 알린다(for 변수 i 를 반복문 앞에서 사용)', () => {
  const src = wrap('    int score = scores[i];\n    for (int i = 0; i < scores.length; i++) { score += i; }\n    return score;')
  const d = analyzeAll(src).filter((x) => /쓸 수 없습니다/.test(x.message))
  assert.deepStrictEqual(d.map((x) => src.slice(x.start, x.end)), ['i'])
  assert.strictEqual(src.slice(0, d[0].start).split('\n').length, 3)
})

test('선언하지 않은 변수는 비슷한 이름을 알려 준다', () => {
  const src = wrap('    int total = 0;\n    return totl;')
  const d = analyzeAll(src).filter((x) => /찾을 수 없습니다/.test(x.message))
  assert.strictEqual(d.length, 1)
  assert.match(d[0].message, /'totl'/)
  assert.match(d[0].message, /'total'/)
})

test('블록이 끝난 뒤에 안쪽 변수를 쓰면 알린다', () => {
  const src = wrap('    if (scores.length > 0) { int inner = 1; }\n    return inner;')
  assert.deepStrictEqual(found(src).filter((x) => x.startsWith('inner')), ['inner:error'])
})

test('정상 코드는 건드리지 않는다: 필드, 매개변수, 다중 선언, 람다, foreach, try 자원, 배열 선언자', () => {
  const src = [
    'import java.util.*;',
    'class Solution {',
    '  private int count = 0, limit;',
    '  static int[][] grid = {{1, 2}, {3}};',
    '  int helper(int a, String... rest) { return a + count + rest.length; }',
    '  public int solution(int[] scores, String name) {',
    '    int sum = 0, max = scores[0];',
    '    int arr[] = new int[3];',
    '    for (int s : scores) { sum += s; }',
    '    for (int i = 0, j = 5; i < j; i++) sum += i;',
    '    for (var e : new ArrayList<Integer>()) { sum += e; }',
    '    List<Integer> list = new ArrayList<>();',
    '    list.forEach(x -> { int y = x; sum2(y); });',
    '    list.stream().map((a, b) -> a + b).count();',
    '    Map<String, List<Integer>> m = new HashMap<>();',
    '    try (Scanner sc = new Scanner(System.in)) { sum += sc.nextInt(); } catch (Exception ex) { ex.printStackTrace(); }',
    '    Object o = name;',
    '    if (o instanceof String str && str.length() > 1) { sum++; }',
    '    switch (sum) { case 1: int t = 2; break; case 2: t = 3; break; default: break; }',
    '    outer: for (int p = 0; p < 3; p++) { for (int q = 0; q < 3; q++) { if (q == 1) continue outer; } }',
    '    int v = limit > count ? limit : count;',
    '    return this.count + v + sum + max + arr.length + grid[0][1] + java.util.Collections.max(list);',
    '  }',
    '  void sum2(int z) { count += z; }',
    '}',
  ].join('\n')
  assert.deepStrictEqual(found(src), [])
})

test('상속·static import 가 있는 파일은 변수 점검을 건너뛴다', () => {
  assert.strictEqual(scope.canAnalyze('class A extends Base { void f() { x = 1; } }'), false)
  assert.strictEqual(scope.canAnalyze('class Box<T extends Number> { void f() { } }'), true)
  assert.deepStrictEqual(found('class A extends Base { void f() { inherited = 1; } }'), [])
})

test('enum 상수, 레코드 구성요소, switch 화살표 라벨은 변수로 오인하지 않는다', () => {
  const src = 'class A {\n  enum Color { red, green }\n  record P(int x, int y) { int sum() { return x + y; } }\n  int f(Color c) { switch (c) { case red -> { return 1; } default -> { return 2; } } }\n}'
  assert.deepStrictEqual(found(src), [])
})

test('빈 입력, 아주 큰 입력, 깨진 코드에도 죽지 않는다', () => {
  assert.deepStrictEqual(analyzeAll(''), [])
  assert.deepStrictEqual(analyzeAll(undefined), [])
  assert.deepStrictEqual(analyzeAll('x'.repeat(300000)), [])
  assert.doesNotThrow(() => analyzeAll('class { ) ( } }} {{ int'))
})

test('문자열 리터럴을 == 로 비교하면 경고한다. 변수끼리·null 비교·문자열 안의 ==는 정상', () => {
  const bad = 'class A { boolean f(String s) { return s == "abc" || "x" != s; } }'
  const d = analyzeAll(bad).filter((x) => /equals/.test(x.message))
  assert.strictEqual(d.length, 2)
  assert.deepStrictEqual(d.map((x) => bad.slice(x.start, x.end)), ['==', '!='])
  for (const ok of ['class A { boolean f(String a, String b) { return a == b || a == null || a.equals("x"); } }', 'class A { String s = "a == b"; boolean f(int x) { return x == 3 && x >= 1 && x <= 5 && x != 2; } }', 'class A { char c; boolean f() { return c == \'a\'; } }']) {
    assert.deepStrictEqual(analyzeAll(ok).filter((x) => /equals/.test(x.message)), [], ok)
  }
})

test('직접 만든 메서드·생성자의 인수 개수가 틀리면 알린다', () => {
  const src = 'class A {\n A(int x) {}\n int f(int a, int b) { return a; }\n void g() { f(1); f(1, 2); new A(); new A(1); g(5); }\n}'
  const d = analyzeAll(src).filter((x) => /인수를/.test(x.message))
  assert.deepStrictEqual(d.map((x) => src.slice(x.start, x.end)), ['f', 'A', 'g'])
  assert.match(d[0].message, /2개 받는데 1개/)
})

test('인수 개수 점검: 오버로드, 가변 인수, 받는 변수가 있는 호출, 선언, 상속, 라이브러리 호출은 건너뛴다', () => {
  const ok = [
    'class A { int f(int a) { return a; } int f(int a, int b) { return a; } void g() { f(1); f(1, 2); } }',
    'class A { int f(int... a) { return 0; } void g() { f(); f(1, 2, 3); } }',
    'class A { int f(int a) { return a; } void g(B b) { b.f(1, 2); list.add(1, 2, 3); Math.max(1, 2); } }',
    'class A { void g() { String s = String.valueOf(1); System.out.println(1, 2); } }',
    'class A extends B { void g() { h(1); } void h() { } }',
    'class A { int[] a = new int[3]; void g() { int x = Math.max(f(1, 2), 3); } int f(int a, int b) { return a; } }',
  ]
  for (const src of ok) assert.deepStrictEqual(analyzeAll(src).filter((x) => /인수를/.test(x.message)), [], src)
})
