// Copyright (c) dendr000. MIT License.
// 실시간 입력(콘솔처럼 실행 중에 한 줄씩 넣기) 시험.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { startProcess } = require('../electron/core/process-runner')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const realTools = require('../electron/core/tool-locator')

const NODE = process.execPath
const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
const skipNoJdk = realTools.java() ? false : 'JDK 가 없어 건너뜀'
const skipNoPython = realTools.python() ? false : 'Python 3 가 없어 건너뜀'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(check, ms = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (check()) return true
    await sleep(25)
  }
  return false
}

// 한 줄 읽을 때마다 "got:<줄>" 을 출력하고, 입력이 끝나면 "end" 를 출력하는 프로그램
const ECHO_SCRIPT =
  "let buf='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{buf+=d;let i;while((i=buf.indexOf(String.fromCharCode(10)))>=0){process.stdout.write('got:'+buf.slice(0,i)+'|');buf=buf.slice(i+1)}});process.stdin.on('end',()=>process.stdout.write('end'))"

test('process-runner: 실행 중에 보낸 입력을 프로그램이 바로 받는다', async () => {
  let out = ''
  const p = startProcess({ cmd: NODE, args: ['-e', ECHO_SCRIPT], env: nodeEnv, interactive: true, onOutput: (s, t) => (out += t) })
  assert.strictEqual(p.write('첫째\n'), true)
  assert.ok(await waitFor(() => out.includes('got:첫째|')), '첫 입력에 반응해야 함: ' + out)
  assert.strictEqual(p.write('둘째\n'), true)
  assert.ok(await waitFor(() => out.includes('got:둘째|')))
  assert.strictEqual(p.endInput(), true)
  const r = await p.done
  assert.strictEqual(r.stdout, 'got:첫째|got:둘째|end')
  assert.strictEqual(r.code, 0)
})

test('process-runner: 미리 넣은 입력(input)을 먼저 보내고 이어서 실시간 입력도 받는다', async () => {
  let out = ''
  const p = startProcess({ cmd: NODE, args: ['-e', ECHO_SCRIPT], env: nodeEnv, interactive: true, input: '미리\n', onOutput: (s, t) => (out += t) })
  assert.ok(await waitFor(() => out.includes('got:미리|')))
  p.write('나중\n')
  assert.ok(await waitFor(() => out.includes('got:나중|')))
  p.endInput()
  assert.strictEqual((await p.done).stdout, 'got:미리|got:나중|end')
})

test('process-runner: interactive 가 아니면 write 는 거절하고 입력은 자동으로 닫힌다', async () => {
  const p = startProcess({ cmd: NODE, args: ['-e', ECHO_SCRIPT], env: nodeEnv, input: 'x\n' })
  assert.strictEqual(p.write('y\n'), false)
  assert.strictEqual(p.endInput(), false)
  assert.strictEqual((await p.done).stdout, 'got:x|end')
})

test('process-runner: 끝난 프로세스에 write 해도 오류 없이 false', async () => {
  const p = startProcess({ cmd: NODE, args: ['-e', 'process.exit(0)'], env: nodeEnv, interactive: true })
  await p.done
  assert.strictEqual(p.write('늦은 입력\n'), false)
  assert.strictEqual(p.endInput(), false)
})

test('process-runner: 입력할 때마다 시간 제한을 다시 잰다', async () => {
  let out = ''
  const p = startProcess({ cmd: NODE, args: ['-e', ECHO_SCRIPT], env: nodeEnv, interactive: true, timeoutMs: 1200, onOutput: (s, t) => (out += t) })
  for (let i = 0; i < 3; i++) {
    await sleep(700) // 합치면 제한(1.2초)을 넘지만 매번 입력하므로 살아 있어야 한다
    assert.strictEqual(p.write('k' + i + '\n'), true)
  }
  assert.ok(await waitFor(() => out.includes('got:k2|')))
  p.endInput()
  const r = await p.done
  assert.strictEqual(r.timedOut, false)
  assert.strictEqual(r.code, 0)
})

test('process-runner: 입력이 없으면 interactive 여도 제한 시간 뒤에 끝낸다', async () => {
  const p = startProcess({ cmd: NODE, args: ['-e', ECHO_SCRIPT], env: nodeEnv, interactive: true, timeoutMs: 600 })
  const r = await p.done
  assert.strictEqual(r.timedOut, true)
})

const ID = 'Lv0_기초/01_더하기'
function makeFixture(name, content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-tmp-'))
  const dir = path.join(root, 'Lv0_기초', '01_더하기')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
  return {
    root,
    service: createRunService({ runners, tools: realTools, tmpBase }),
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true })
      fs.rmSync(tmpBase, { recursive: true, force: true })
    },
  }
}

const JAVA_TWO = [
  'import java.util.*;',
  'public class Main {',
  '  public static void main(String[] x) {',
  '    Scanner sc = new Scanner(System.in);',
  '    System.out.print("첫 번째: ");',
  '    int a = sc.nextInt();',
  '    System.out.print("두 번째: ");',
  '    int b = sc.nextInt();',
  '    System.out.println("합: " + (a + b));',
  '  }',
  '}',
  '',
].join('\n')

test('run-service(Java): Scanner 가 입력을 두 번 기다리고 입력한 만큼만 진행한다', { skip: skipNoJdk }, async () => {
  const f = makeFixture('Main.java', JAVA_TWO)
  try {
    let out = ''
    const job = f.service.start({ root: f.root, problemId: ID, fileName: 'Main.java', mode: 'run', interactive: true }, (e) => {
      if (e.type === 'output') out += e.text
    })
    assert.ok(await waitFor(() => out.includes('첫 번째: ')), '첫 안내문이 입력 전에 보여야 함: ' + out)
    assert.ok(!out.includes('두 번째'), '입력 전에는 다음 안내문이 없어야 함')
    assert.strictEqual(job.write('3\n'), true)
    assert.ok(await waitFor(() => out.includes('두 번째: ')))
    assert.ok(!out.includes('합:'))
    assert.strictEqual(job.write('4\n'), true)
    const r = await job.done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
    assert.ok(r.stdout.includes('합: 7'))
  } finally {
    f.cleanup()
  }
})

test('run-service(Python): 입력 끝(EOF)을 보내면 끝까지 읽는 프로그램이 끝난다', { skip: skipNoPython }, async () => {
  const f = makeFixture('Main.py', 'import sys\ntotal = 0\nfor line in sys.stdin:\n    total += int(line)\nprint("합계", total)\n')
  try {
    const job = f.service.start({ root: f.root, problemId: ID, fileName: 'Main.py', mode: 'run', interactive: true })
    await sleep(800)
    job.write('5\n')
    job.write('6\n')
    await sleep(200)
    assert.strictEqual(job.endInput(), true)
    const r = await job.done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
    assert.ok(r.stdout.includes('합계 11'))
  } finally {
    f.cleanup()
  }
})

test('run-service: 중지하면 입력을 기다리던 프로그램도 끝난다', async () => {
  const f = makeFixture('Main.js', "require('fs').readFileSync(0, 'utf8')\n")
  try {
    const job = f.service.start({ root: f.root, problemId: ID, fileName: 'Main.js', mode: 'run', interactive: true })
    await sleep(700)
    job.stop()
    const r = await job.done
    assert.strictEqual(r.stopped, true)
  } finally {
    f.cleanup()
  }
})

test('run-service: 함수 문제나 케이스 실행에는 interactive 가 적용되지 않는다', async () => {
  const f = makeFixture('Main.js', "console.log(require('fs').readFileSync(0, 'utf8').trim())\n")
  try {
    const job = f.service.start({
      root: f.root,
      problemId: ID,
      fileName: 'Main.js',
      mode: 'run',
      interactive: true,
      cases: [{ id: 'a', input: 'hi\n', expected: 'hi\n' }],
    })
    assert.strictEqual(job.write('x\n'), false)
    const r = await job.done
    assert.strictEqual(r.passed, 1)
  } finally {
    f.cleanup()
  }
})

test('run-service: 입력 없이 실행하는 job 에는 write 가 거절된다', async () => {
  const f = makeFixture('Main.js', "console.log(require('fs').readFileSync(0, 'utf8').trim())\n")
  try {
    const job = f.service.start({ root: f.root, problemId: ID, fileName: 'Main.js', mode: 'run', input: 'a\n' })
    assert.strictEqual(job.write('x\n'), false)
    assert.strictEqual((await job.done).ok, true)
  } finally {
    f.cleanup()
  }
})
