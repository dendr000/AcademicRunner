// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const realTools = require('../electron/core/tool-locator')

const ID = 'Lv0_기초/07_합'
const skipNoJdk = realTools.java() ? false : 'JDK 가 없어 건너뜀'
const skipNoPython = realTools.python() ? false : 'Python 3 가 없어 건너뜀'

function makeFixture(name, content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-func-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-func-tmp-'))
  const dir = path.join(root, 'Lv0_기초', '07_합')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
  return {
    root,
    dir,
    tmpBase,
    service: createRunService({ runners, tools: realTools, tmpBase }),
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true })
      fs.rmSync(tmpBase, { recursive: true, force: true })
    },
  }
}

const req = (f, name, cases, extra = {}) => ({ root: f.root, problemId: ID, fileName: name, mode: 'run', cases, ...extra })

test('함수 문제는 케이스 없이 실행하면 안내와 함께 거절한다', async () => {
  const f = makeFixture('Solution.js', 'function solution(n) { return n }\n')
  try {
    const r = await f.service.start({ root: f.root, problemId: ID, fileName: 'Solution.js', mode: 'run', input: '' }).done
    assert.strictEqual(r.error, 'NOT_IO_PROBLEM')
    assert.ok(r.message.includes('케이스'))
  } finally {
    f.cleanup()
  }
})

test('JavaScript 함수 문제: 반환값을 JSON 으로 비교하고 풀이의 디버그 출력은 무시한다', async () => {
  const f = makeFixture('Solution.js', 'function solution(a, s) { console.log("debug"); return { total: a.reduce((x, y) => x + y, 0), s } }\n')
  try {
    const cases = [
      { id: 'a', input: '[[1,2,3], "가"]', expected: '{"s":"가","total":6}' },
      { id: 'b', input: '[[1,2,3], "가"]', expected: '{"s":"가","total":7}' },
    ]
    const r = await f.service.start(req(f, 'Solution.js', cases)).done
    assert.strictEqual(r.phase, 'cases')
    assert.strictEqual(r.caseResults[0].status, 'pass')
    assert.strictEqual(r.caseResults[1].status, 'fail')
    assert.strictEqual(r.caseResults[1].diff.value, true)
    assert.strictEqual(r.passed, 1)
  } finally {
    f.cleanup()
  }
})

test('JavaScript 함수 문제: 예외는 오류, 기대 값이 JSON 이 아니면 실패로 알린다', async () => {
  const f = makeFixture('Solution.js', 'function solution(n) { if (n === 0) throw new Error("boom"); return n }\n')
  try {
    const cases = [
      { id: 'a', input: '[0]', expected: '0' },
      { id: 'b', input: '[5]', expected: 'abc' },
    ]
    const r = await f.service.start(req(f, 'Solution.js', cases)).done
    assert.strictEqual(r.caseResults[0].status, 'error')
    assert.ok(r.caseResults[0].stderr.includes('boom'))
    assert.strictEqual(r.caseResults[1].status, 'fail')
    assert.strictEqual(r.caseResults[1].diff.error, 'BAD_EXPECTED')
  } finally {
    f.cleanup()
  }
})

test('Python 함수 문제', { skip: skipNoPython }, async () => {
  const f = makeFixture('Solution.py', 'def solution(n, words):\n    print("dbg")\n    return [n * 2, len(words)]\n')
  try {
    const cases = [
      { id: 'a', input: '[4, ["x","y"]]', expected: '[8, 2]' },
      { id: 'b', input: '[4, ["x"]]', expected: '[8, 2]' },
    ]
    const r = await f.service.start(req(f, 'Solution.py', cases)).done
    assert.strictEqual(r.caseResults[0].status, 'pass')
    assert.strictEqual(r.caseResults[1].status, 'fail')
  } finally {
    f.cleanup()
  }
})

const JAVA_SOLUTION = [
  'import java.util.*;',
  'class Solution {',
  '    public int[] solution(int n, String s) {',
  '        System.out.print("debug");',
  '        if (n < 0) throw new IllegalStateException("negative");',
  '        return new int[] { n * 2, s.length() };',
  '    }',
  '}',
  '',
].join('\n')

test('Java 함수 문제: 컴파일 한 번 + 케이스별 호출, 통과/실패/예외/잘못된 인수 구분', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Solution.java', JAVA_SOLUTION)
  try {
    const cases = [
      { id: 'a', input: '[4, "가나"]', expected: '[8, 2]' },
      { id: 'b', input: '[4, "가나"]', expected: '[8, 3]' },
      { id: 'c', input: '[-1, "x"]', expected: '[0, 0]' },
      { id: 'd', input: '["x", "x"]', expected: '[0, 0]' },
    ]
    const events = []
    const r = await f.service.start(req(f, 'Solution.java', cases), (e) => events.push(e)).done
    assert.strictEqual(r.phase, 'cases', JSON.stringify(r))
    assert.deepStrictEqual(
      r.caseResults.map((x) => x.status),
      ['pass', 'fail', 'error', 'error'],
    )
    assert.ok(r.caseResults[2].stderr.includes('negative'))
    assert.ok(r.caseResults[3].stderr.includes('int'))
    assert.strictEqual(events.filter((e) => e.type === 'phase' && e.phase === 'compile').length, 1)
    // 문제 폴더에는 아무것도 생기지 않는다.
    assert.deepStrictEqual(fs.readdirSync(f.dir), ['Solution.java'])
  } finally {
    f.cleanup()
  }
})

test('Java 함수 문제: solution 이 없으면 안내한다', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Solution.java', 'class Solution { }\n')
  try {
    const r = await f.service.start(req(f, 'Solution.java', [{ id: 'a', input: '[]', expected: '0' }])).done
    assert.strictEqual(r.error, 'NO_SIGNATURE')
  } finally {
    f.cleanup()
  }
})

test('Java 함수 문제: void 반환은 거절한다', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Solution.java', 'class Solution { public void solution(int n) { } }\n')
  try {
    const r = await f.service.start(req(f, 'Solution.java', [{ id: 'a', input: '[1]', expected: '0' }])).done
    assert.strictEqual(r.error, 'VOID_RETURN')
  } finally {
    f.cleanup()
  }
})

test('Java 함수 문제: 컴파일 확인(compile)은 케이스 없이도 된다', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Solution.java', JAVA_SOLUTION)
  try {
    const r = await f.service.start({ root: f.root, problemId: ID, fileName: 'Solution.java', mode: 'compile' }).done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
  } finally {
    f.cleanup()
  }
})
