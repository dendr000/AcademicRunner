// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { describeResult, formatMs } = require('../src/ui/run-summary')

test('formatMs: 1초 미만은 ms, 이상은 초', () => {
  assert.strictEqual(formatMs(250.4), '250ms')
  assert.strictEqual(formatMs(1500), '1.50초')
  assert.strictEqual(formatMs(undefined), '')
})

test('성공: 실행과 컴파일을 구분한다', () => {
  assert.deepStrictEqual(describeResult({ ok: true, phase: 'run', durationMs: 120, toolVersion: 'javac 25' }, 10), {
    kind: 'ok',
    text: '실행 완료, 종료 코드 0, 120ms (javac 25)',
  })
  assert.strictEqual(describeResult({ ok: true, phase: 'compile', durationMs: 900 }, 10).text, '컴파일 성공 900ms')
})

test('시간 초과는 제한 시간을 알려 준다', () => {
  const r = describeResult({ ok: false, phase: 'run', timedOut: true }, 7)
  assert.strictEqual(r.kind, 'fail')
  assert.match(r.text, /7초/)
})

test('중지, 출력 초과, 컴파일 오류, 비정상 종료, 준비 실패를 구분한다', () => {
  assert.match(describeResult({ ok: false, stopped: true }, 10).text, /중지/)
  assert.match(describeResult({ ok: false, truncated: true }, 10).text, /너무 많아/)
  assert.strictEqual(describeResult({ ok: false, phase: 'compile', exitCode: 1 }, 10).text, '컴파일 오류')
  assert.match(describeResult({ ok: false, phase: 'run', exitCode: 1, durationMs: 80 }, 10).text, /종료 코드 1/)
  assert.strictEqual(describeResult({ ok: false, phase: 'prepare', message: 'JDK 없음' }, 10).text, 'JDK 없음')
  assert.match(describeResult({ ok: false, phase: 'run', spawnError: 'ENOENT' }, 10).text, /ENOENT/)
})

test('결과가 없으면 실패로 본다', () => {
  assert.strictEqual(describeResult(null, 10).kind, 'fail')
})
