// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { staticChecks, worst, compileItem, casesItem } = require('../src/ui/submit-check')

const levels = (items) => items.map((i) => i.level)
const has = (items, level, part) => items.some((i) => i.level === level && i.text.includes(part))

test('빈 코드는 실패', () => {
  assert.deepStrictEqual(levels(staticChecks('java', 'io', '  \n')), ['fail'])
  assert.deepStrictEqual(levels(staticChecks('java', 'io', undefined)), ['fail'])
})

test('Java 입출력: 정상 코드는 실패·주의가 없다', () => {
  const src = 'import java.util.*;\npublic class Main {\n  public static void main(String[] a) {\n    System.out.println(1);\n  }\n}\n'
  assert.strictEqual(worst(staticChecks('java', 'io', src)), 'ok')
})

test('Java 입출력: package 선언, 클래스 이름, main 누락', () => {
  assert.ok(has(staticChecks('java', 'io', 'package a.b;\npublic class Main { public static void main(String[] x){ System.out.println(); } }'), 'fail', 'package'))
  assert.ok(has(staticChecks('java', 'io', 'public class Foo { public static void main(String[] x){ System.out.println(); } }'), 'fail', 'Foo'))
  assert.ok(has(staticChecks('java', 'io', 'public class Main { }'), 'fail', 'main'))
  assert.ok(has(staticChecks('java', 'io', 'class Main { public static void main(String[] x){ System.out.println(); } }'), 'warn', 'public class'))
})

test('주석 안의 package·TODO 는 package 로 세지 않고, TODO 는 주의로 센다', () => {
  const src = '// package x;\n/* package y; */\npublic class Main {\n  // TODO fix\n  public static void main(String[] a) { System.out.println(1); }\n}'
  const items = staticChecks('java', 'io', src)
  assert.ok(!has(items, 'fail', 'package'))
  assert.ok(has(items, 'warn', 'TODO'))
})

test('Java 함수 문제: Solution 클래스와 solution 메서드', () => {
  assert.strictEqual(worst(staticChecks('java', 'function', 'class Solution { public int solution(int n) { return n; } }')), 'ok')
  assert.ok(has(staticChecks('java', 'function', 'class Other { }'), 'fail', 'Solution'))
  assert.ok(has(staticChecks('java', 'function', 'class Solution { int f() { return 1; } }'), 'fail', 'solution'))
  assert.ok(has(staticChecks('java', 'function', 'class Solution { int solution(int n) { new java.util.Scanner(System.in); return n; } }'), 'warn', '표준 입력'))
})

test('Python: solution 함수, 디버거, print 없음', () => {
  assert.strictEqual(worst(staticChecks('python', 'function', 'def solution(n):\n    return n\n')), 'ok')
  assert.ok(has(staticChecks('python', 'function', 'def other(n):\n    return n\n'), 'fail', 'solution'))
  assert.ok(has(staticChecks('python', 'io', 'x = input()\n'), 'warn', 'print'))
  assert.ok(has(staticChecks('python', 'io', 'breakpoint()\nprint(1)\n'), 'warn', '디버거'))
  assert.ok(!has(staticChecks('python', 'function', '# def solution(n)\ndef solution(n):\n    return n\n'), 'fail', 'solution'))
})

test('JavaScript: solution 함수 형태 세 가지, debugger', () => {
  for (const src of ['function solution(n) { return n }', 'const solution = (n) => n', 'let solution = function(n) { return n }']) {
    assert.strictEqual(worst(staticChecks('javascript', 'function', src)), 'ok', src)
  }
  assert.ok(has(staticChecks('javascript', 'function', 'function other() {}'), 'fail', 'solution'))
  assert.ok(has(staticChecks('javascript', 'io', 'debugger\nconsole.log(1)'), 'warn', 'debugger'))
})

test('디버그 출력이 남은 코드는 주의', () => {
  const src = 'public class Main { public static void main(String[] a) { System.out.println("DEBUG x"); } }'
  assert.ok(has(staticChecks('java', 'io', src), 'warn', '디버그'))
})

test('worst: 가장 나쁜 단계를 고른다', () => {
  assert.strictEqual(worst([{ level: 'ok' }, { level: 'warn' }]), 'warn')
  assert.strictEqual(worst([{ level: 'ok' }, { level: 'warn' }, { level: 'fail' }]), 'fail')
  assert.strictEqual(worst([]), 'ok')
})

test('컴파일 결과를 항목으로 바꾼다', () => {
  assert.strictEqual(compileItem({ ok: true, phase: 'compile' }).level, 'ok')
  assert.strictEqual(compileItem({ ok: false, phase: 'compile' }).level, 'fail')
  assert.strictEqual(compileItem({ ok: false, phase: 'prepare', message: 'JDK 없음' }).level, 'warn')
  assert.strictEqual(compileItem(null).level, 'warn')
})

test('케이스 결과를 항목으로 바꾼다', () => {
  assert.strictEqual(casesItem(null, 0).level, 'warn')
  assert.strictEqual(casesItem({ phase: 'cases', ok: true, passed: 3, total: 3 }, 3).level, 'ok')
  assert.strictEqual(casesItem({ phase: 'cases', ok: false, passed: 2, total: 3 }, 3).level, 'fail')
  assert.strictEqual(casesItem({ phase: 'cases', ok: false, stopped: true, passed: 0, total: 3 }, 3).level, 'warn')
  assert.strictEqual(casesItem({ phase: 'compile', ok: false }, 3).level, 'fail')
  assert.strictEqual(casesItem(null, 2).level, 'warn')
})
