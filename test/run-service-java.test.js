// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const javaRunner = require('../electron/core/runners/java')
const realTools = require('../electron/core/tool-locator')

const HAS_JDK = realTools.java() !== null
const skipNoJdk = HAS_JDK ? false : 'JDK(javac)가 없어 건너뜀'

const ADD = [
  'import java.util.*;',
  'public class Main {',
  '  public static void main(String[] a) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int x = sc.nextInt(); int y = sc.nextInt();',
  '    System.out.println("합: " + (x + y));',
  '  }',
  '}',
  '',
].join('\n')

const LOOP = 'public class Main { public static void main(String[] a) { while (true) {} } }\n'
const BROKEN = 'public class Main { public static void main(String[] a) { int x = ; } }\n'
const SOLUTION = 'class Solution { public int solution(int n) { return n * 2; } }\n'

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-java-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-java-tmp-'))
  const put = (id, name, content) => {
    const dir = path.join(root, ...id.split('/'))
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), content)
  }
  put('Lv0_기초/01_더하기', 'Main.java', ADD)
  put('Lv0_기초/02_무한', 'Main.java', LOOP)
  put('Lv0_기초/03_오류', 'Main.java', BROKEN)
  put('Lv0_기초/04_함수', 'Solution.java', SOLUTION)
  const service = createRunService({ runners, tools: realTools, tmpBase })
  const cleanup = () => {
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(tmpBase, { recursive: true, force: true })
  }
  return { root, tmpBase, service, cleanup }
}

const req = (root, id, name, extra = {}) => ({ root, problemId: id, fileName: name, mode: 'run', input: '', ...extra })

test('publicClassName: 공개 클래스를 찾고 주석 속 이름은 무시한다', () => {
  assert.strictEqual(javaRunner.publicClassName('public class Main {}'), 'Main')
  assert.strictEqual(javaRunner.publicClassName('// public class Fake {}\nclass A {}\npublic final class Real {}'), 'Real')
  assert.strictEqual(javaRunner.publicClassName('/* public class Fake */ class Solution {}'), null)
})

test('stripPackage: package 선언만 같은 길이 공백으로 지우고 줄 번호는 유지한다', () => {
  const src = '// 설명\npackage a.b;\npublic class Main {}\n'
  const out = javaRunner.stripPackage(src)
  assert.strictEqual(out.length, src.length)
  assert.ok(!out.includes('package'))
  assert.strictEqual(out.split('\n').length, src.split('\n').length)
  assert.strictEqual(javaRunner.stripPackage('class A { String package_x; }'), 'class A { String package_x; }')
  assert.strictEqual(javaRunner.stripPackage('import java.util.*;\nclass A {}'), 'import java.util.*;\nclass A {}')
})

test('package 선언이 있는 파일도 실행된다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const src = 'package demo.app;\npublic class Main {\n  public static void main(String[] a) { System.out.println("ok"); }\n}\n'
    const dir = path.join(f.root, 'Lv0_기초', '05_패키지')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'Main.java'), src)
    const r = await f.service.start(req(f.root, 'Lv0_기초/05_패키지', 'Main.java')).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.match(r.stdout, /ok/)
  } finally {
    f.cleanup()
  }
})

test('JDK 가 없으면 TOOL_MISSING 안내를 준다', async () => {
  const f = makeFixture()
  try {
    const service = createRunService({ runners, tools: { java: () => null }, tmpBase: f.tmpBase })
    const r = await service.start(req(f.root, 'Lv0_기초/01_더하기', 'Main.java')).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.error, 'TOOL_MISSING')
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
  } finally {
    f.cleanup()
  }
})

test('입출력 문제를 컴파일·실행하고 입력을 넣어 한글 출력을 받는다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const events = []
    const r = await f.service.start(req(f.root, 'Lv0_기초/01_더하기', 'Main.java', { input: '3 4\n' }), (e) => events.push(e)).done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
    assert.strictEqual(r.phase, 'run')
    assert.strictEqual(r.exitCode, 0)
    assert.strictEqual(r.stdout.trim(), '합: 7')
    assert.ok(events.some((e) => e.type === 'phase' && e.phase === 'compile'))
    assert.ok(events.some((e) => e.type === 'phase' && e.phase === 'run'))
    assert.ok(events.some((e) => e.type === 'output' && e.stream === 'stdout'))
  } finally {
    f.cleanup()
  }
})

test('실행이 끝나면 임시 폴더가 지워지고 문제 폴더에는 .class 가 생기지 않는다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    await f.service.start(req(f.root, 'Lv0_기초/01_더하기', 'Main.java', { input: '1 2' })).done
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
    assert.deepStrictEqual(fs.readdirSync(path.join(f.root, 'Lv0_기초', '01_더하기')), ['Main.java'])
    assert.strictEqual(fs.readFileSync(path.join(f.root, 'Lv0_기초', '01_더하기', 'Main.java'), 'utf8'), ADD)
  } finally {
    f.cleanup()
  }
})

test('입력이 모자라 예외가 나면 실패(종료 코드 1)와 stderr 를 돌려준다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/01_더하기', 'Main.java', { input: '3' })).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.phase, 'run')
    assert.strictEqual(r.exitCode, 1)
    assert.match(r.stderr, /NoSuchElementException|InputMismatch/)
  } finally {
    f.cleanup()
  }
})

test('컴파일 오류는 compile 단계 실패와 오류 내용을 돌려준다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/03_오류', 'Main.java')).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.phase, 'compile')
    assert.match(r.compileOutput, /error/)
    assert.ok(!r.compileOutput.includes(f.tmpBase), '임시 폴더 경로가 결과에 보이면 안 된다')
    assert.match(r.compileOutput, /^Main.java:1:/)
  } finally {
    f.cleanup()
  }
})

test('무한 반복은 시간 제한에서 끝난다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/02_무한', 'Main.java', { timeoutMs: 1500 })).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.timedOut, true)
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
  } finally {
    f.cleanup()
  }
})

test('stop 으로 실행 중인 프로그램을 멈춘다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const job = f.service.start(req(f.root, 'Lv0_기초/02_무한', 'Main.java', { timeoutMs: 20000 }), (e) => {
      if (e.type === 'phase' && e.phase === 'run') setTimeout(() => job.stop(), 500)
    })
    const r = await job.done
    assert.strictEqual(r.stopped, true)
    assert.strictEqual(r.timedOut, false)
  } finally {
    f.cleanup()
  }
})

test('함수 문제는 실행을 거부하지만 컴파일 확인은 된다', { skip: skipNoJdk }, async () => {
  const f = makeFixture()
  try {
    const run = await f.service.start(req(f.root, 'Lv0_기초/04_함수', 'Solution.java')).done
    assert.strictEqual(run.error, 'NOT_IO_PROBLEM')
    const compile = await f.service.start(req(f.root, 'Lv0_기초/04_함수', 'Solution.java', { mode: 'compile' })).done
    assert.strictEqual(compile.ok, true, JSON.stringify(compile))
    assert.strictEqual(compile.phase, 'compile')
  } finally {
    f.cleanup()
  }
})

test('잘못된 문제 id 나 파일 이름은 읽기 단계에서 거부한다', async () => {
  const f = makeFixture()
  try {
    const r = await f.service.start(req(f.root, '../x', 'Main.java')).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.phase, 'prepare')
  } finally {
    f.cleanup()
  }
})
