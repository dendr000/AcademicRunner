// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const realTools = require('../electron/core/tool-locator')

const ID = 'Lv0_기초/01_더하기'
const skipNoJdk = realTools.java() ? false : 'JDK 가 없어 건너뜀'
const skipNoPython = realTools.python() ? false : 'Python 3 가 없어 건너뜀'

const JS_ADD = [
  "const lines = require('fs').readFileSync(0, 'utf8').split(String.fromCharCode(10))",
  "const [a, b] = lines[0].split(' ').map(Number)",
  "if (a === 99) { for (;;) {} }",
  "if (a === 98) { throw new Error('boom') }",
  "console.log('합: ' + (a + b))",
  '',
].join('\n')

const JAVA_ADD = [
  'import java.util.*;',
  'public class Main {',
  '  public static void main(String[] x) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int a = sc.nextInt(), b = sc.nextInt();',
  '    System.out.println("합: " + (a + b));',
  '  }',
  '}',
  '',
].join('\n')

function makeFixture(name, content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-cases-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-cases-tmp-'))
  const dir = path.join(root, 'Lv0_기초', '01_더하기')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
  return {
    root,
    tmpBase,
    service: createRunService({ runners, tools: realTools, tmpBase }),
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true })
      fs.rmSync(tmpBase, { recursive: true, force: true })
    },
  }
}

const req = (f, name, cases, extra = {}) => ({ root: f.root, problemId: ID, fileName: name, mode: 'run', cases, ...extra })

test('케이스를 차례로 실행해 통과·실패·시간 초과·오류를 구분한다', async () => {
  const f = makeFixture('Main.js', JS_ADD)
  try {
    const events = []
    const cases = [
      { id: 'a', input: '1 2\n', expected: '합: 3\n' },
      { id: 'b', input: '1 2\n', expected: '합: 4\n' },
      { id: 'c', input: '99 0\n', expected: '' },
      { id: 'd', input: '98 0\n', expected: '' },
    ]
    const r = await f.service.start(req(f, 'Main.js', cases, { timeoutMs: 1000 }), (e) => events.push(e)).done
    assert.strictEqual(r.phase, 'cases')
    assert.strictEqual(r.total, 4)
    assert.strictEqual(r.passed, 1)
    assert.strictEqual(r.ok, false)
    assert.deepStrictEqual(r.caseResults.map((x) => x.status), ['pass', 'fail', 'timeout', 'error'])
    assert.deepStrictEqual(r.caseResults[1].diff, { pass: false, line: 1, expected: '합: 4', actual: '합: 3' })
    assert.match(r.caseResults[3].stderr, /boom/)
    assert.strictEqual(events.filter((e) => e.type === 'case-start').length, 4)
    assert.strictEqual(events.filter((e) => e.type === 'case-done').length, 4)
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
  } finally {
    f.cleanup()
  }
})

test('줄 끝 공백과 끝의 빈 줄 차이는 통과로 본다', async () => {
  const f = makeFixture('Main.js', JS_ADD)
  try {
    const r = await f.service.start(req(f, 'Main.js', [{ id: 'a', input: '1 2', expected: '합: 3   \r\n\r\n' }])).done
    assert.strictEqual(r.ok, true)
    assert.strictEqual(r.passed, 1)
  } finally {
    f.cleanup()
  }
})

test('케이스가 없으면 NO_CASES, 컴파일 오류면 케이스를 실행하지 않는다', async () => {
  const f = makeFixture('Main.js', 'const = ;\n')
  try {
    assert.strictEqual((await f.service.start(req(f, 'Main.js', [])).done).error, 'NO_CASES')
    // JS 는 컴파일 단계가 없으므로 실행 단계에서 오류 상태(문법 오류)로 나온다.
    const r = await f.service.start(req(f, 'Main.js', [{ id: 'a', input: '', expected: '' }])).done
    assert.strictEqual(r.caseResults[0].status, 'error')
  } finally {
    f.cleanup()
  }
})

test('stop 하면 남은 케이스는 skipped', async () => {
  const f = makeFixture('Main.js', JS_ADD)
  try {
    const cases = [
      { id: 'a', input: '99 0\n', expected: '' }, // 무한 반복: 중지로 끝낸다
      { id: 'b', input: '1 2\n', expected: '합: 3' },
      { id: 'c', input: '1 2\n', expected: '합: 3' },
    ]
    const job = f.service.start(req(f, 'Main.js', cases, { timeoutMs: 20000 }), (e) => {
      if (e.type === 'case-start' && e.index === 0) setTimeout(() => job.stop(), 400)
    })
    const r = await job.done
    assert.deepStrictEqual(r.caseResults.map((x) => x.status), ['stopped', 'skipped', 'skipped'])
    assert.strictEqual(r.stopped, true)
  } finally {
    f.cleanup()
  }
})

test('Java: 컴파일은 한 번만 하고 여러 케이스를 실행한다', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Main.java', JAVA_ADD)
  try {
    const phases = []
    const cases = [
      { id: 'a', input: '1 2', expected: '합: 3' },
      { id: 'b', input: '10 20', expected: '합: 30' },
      { id: 'c', input: '5 5', expected: '합: 11' },
    ]
    const r = await f.service.start(req(f, 'Main.java', cases), (e) => {
      if (e.type === 'phase') phases.push(e.phase)
    }).done
    assert.strictEqual(r.passed, 2)
    assert.deepStrictEqual(phases, ['compile', 'run'])
    assert.deepStrictEqual(r.caseResults.map((x) => x.status), ['pass', 'pass', 'fail'])
  } finally {
    f.cleanup()
  }
})

test('Java: 컴파일 오류면 케이스 결과 없이 compile 단계 실패', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Main.java', 'public class Main { void x( }\n')
  try {
    const r = await f.service.start(req(f, 'Main.java', [{ id: 'a', input: '', expected: '' }])).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.phase, 'compile')
    assert.strictEqual(r.caseResults, undefined)
  } finally {
    f.cleanup()
  }
})

test('Python: 케이스 실행', { skip: skipNoPython }, async () => {
  const f = makeFixture('Main.py', 'a, b = map(int, input().split())\nprint("합:", a + b)\n')
  try {
    const r = await f.service.start(req(f, 'Main.py', [{ id: 'a', input: '2 3', expected: '합: 5' }])).done
    assert.strictEqual(r.ok, true)
  } finally {
    f.cleanup()
  }
})
