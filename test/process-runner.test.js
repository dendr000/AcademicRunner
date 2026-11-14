// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { startProcess } = require('../electron/core/process-runner')

const NODE = process.execPath
const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

function run(script, extra = {}) {
  return startProcess({ cmd: NODE, args: ['-e', script], env: nodeEnv, ...extra })
}

test('표준 출력과 종료 코드를 모은다', async () => {
  const r = await run("process.stdout.write('hello'); process.stderr.write('warn'); process.exit(3)").done
  assert.strictEqual(r.stdout, 'hello')
  assert.strictEqual(r.stderr, 'warn')
  assert.strictEqual(r.code, 3)
  assert.strictEqual(r.timedOut, false)
})

test('입력을 BOM 없이 그대로 전달한다(한글 포함)', async () => {
  const script = "let b=[];process.stdin.on('data',d=>b.push(d));process.stdin.on('end',()=>{const t=Buffer.concat(b);process.stdout.write(JSON.stringify([...t.subarray(0,3)])+'|'+t.toString('utf8'))})"
  const r = await run(script, { input: '가나 1 2\n' }).done
  assert.strictEqual(r.stdout, '[234,176,128]|가나 1 2\n') // 맨 앞이 EF BB BF 가 아니라 '가'(EA B0 80)
})

test('입력이 비어 있어도 입력을 기다리며 멈추지 않는다', async () => {
  const r = await run("process.stdin.on('data',()=>{});process.stdin.on('end',()=>process.stdout.write('끝'))", { input: '' }).done
  assert.strictEqual(r.stdout, '끝')
})

test('시간 제한을 넘기면 종료하고 timedOut 으로 알린다', async () => {
  const started = Date.now()
  const r = await run('setInterval(()=>{},1000)', { timeoutMs: 500 }).done
  assert.strictEqual(r.timedOut, true)
  assert.ok(Date.now() - started < 5000)
})

test('출력이 상한을 넘으면 잘라서 종료한다', async () => {
  const r = await run("for(;;){process.stdout.write('x'.repeat(10000))}", { maxBytes: 50000, timeoutMs: 8000 }).done
  assert.strictEqual(r.truncated, true)
  assert.ok(r.stdout.length <= 50000)
})

test('stop 은 실행 중인 프로세스를 끝낸다', async () => {
  const p = run('setInterval(()=>{},1000)', { timeoutMs: 8000 })
  setTimeout(() => p.stop(), 300)
  const r = await p.done
  assert.strictEqual(r.stopped, true)
  assert.strictEqual(r.timedOut, false)
})

test('없는 프로그램은 spawnError 로 알린다', async () => {
  const r = await startProcess({ cmd: 'C:\\no\\such\\program.exe', args: [] }).done
  assert.ok(r.spawnError)
  assert.strictEqual(r.code, null)
})

test('여러 바이트 글자가 청크 경계에서 쪼개져도 깨지지 않는다', async () => {
  const script = "const b=Buffer.from('한글테스트');process.stdout.write(b.subarray(0,2));setTimeout(()=>process.stdout.write(b.subarray(2)),100)"
  const events = []
  const r = await run(script, { onOutput: (s, t) => events.push(t) }).done
  assert.strictEqual(r.stdout, '한글테스트')
  assert.strictEqual(events.join(''), '한글테스트')
})
