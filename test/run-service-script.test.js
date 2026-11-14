// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const realTools = require('../electron/core/tool-locator')

const skipNoPython = realTools.python() ? false : 'Python 3 가 없어 건너뜀'
const ID = 'Lv0_기초/01_더하기'

const PY_ADD = 'a, b = map(int, input().split())\nprint("합:", a + b)\n'
const JS_ADD = [
  "const lines = require('fs').readFileSync(0, 'utf8').split(String.fromCharCode(10))",
  "const [a, b] = lines[0].split(' ').map(Number)",
  "console.log('합: ' + (a + b))",
  '',
].join('\n')

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-script-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-script-tmp-'))
  const dir = path.join(root, 'Lv0_기초', '01_더하기')
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content)
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

const req = (f, name, extra = {}) => ({ root: f.root, problemId: ID, fileName: name, mode: 'run', input: '', ...extra })

test('Python: 입력을 넣어 실행하고 한글 출력을 받는다', { skip: skipNoPython }, async () => {
  const f = makeFixture({ 'Main.py': PY_ADD })
  try {
    const r = await f.service.start(req(f, 'Main.py', { input: '3 4\n' })).done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
    assert.strictEqual(r.stdout.trim(), '합: 7')
    assert.match(r.toolVersion, /^Python 3/)
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
    assert.deepStrictEqual(fs.readdirSync(path.join(f.root, 'Lv0_기초', '01_더하기')), ['Main.py'])
  } finally {
    f.cleanup()
  }
})

test('Python: 예외는 종료 코드 1 과 traceback 을 돌려준다', { skip: skipNoPython }, async () => {
  const f = makeFixture({ 'Main.py': PY_ADD })
  try {
    const r = await f.service.start(req(f, 'Main.py', { input: 'x y\n' })).done
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.exitCode, 1)
    assert.match(r.stderr, /ValueError/)
  } finally {
    f.cleanup()
  }
})

test('Python: 컴파일 확인은 문법 오류를 compile 단계 실패로 알린다', { skip: skipNoPython }, async () => {
  const f = makeFixture({ 'Main.py': 'print(\n', 'Solution.py': 'def solution(n):\n    return n\n' })
  try {
    const bad = await f.service.start(req(f, 'Main.py', { mode: 'compile' })).done
    assert.strictEqual(bad.ok, false)
    assert.strictEqual(bad.phase, 'compile')
    const good = await f.service.start(req(f, 'Solution.py', { mode: 'compile' })).done
    assert.strictEqual(good.ok, true, JSON.stringify(good))
  } finally {
    f.cleanup()
  }
})

test('Python: 무한 반복은 시간 제한에서 끝난다', { skip: skipNoPython }, async () => {
  const f = makeFixture({ 'Main.py': 'while True:\n    pass\n' })
  try {
    const r = await f.service.start(req(f, 'Main.py', { timeoutMs: 1000 })).done
    assert.strictEqual(r.timedOut, true)
  } finally {
    f.cleanup()
  }
})

test('Python 이 없으면 TOOL_MISSING 안내', async () => {
  const f = makeFixture({ 'Main.py': PY_ADD })
  try {
    const service = createRunService({ runners, tools: { python: () => null }, tmpBase: f.tmpBase })
    const r = await service.start(req(f, 'Main.py')).done
    assert.strictEqual(r.error, 'TOOL_MISSING')
  } finally {
    f.cleanup()
  }
})

test('JavaScript: 입력을 읽어 실행하고 한글 출력을 받는다', async () => {
  const f = makeFixture({ 'Main.js': JS_ADD })
  try {
    const r = await f.service.start(req(f, 'Main.js', { input: '3 4\n' })).done
    assert.strictEqual(r.ok, true, JSON.stringify(r))
    assert.strictEqual(r.stdout.trim(), '합: 7')
    assert.match(r.toolVersion, /^Node /)
    assert.deepStrictEqual(fs.readdirSync(f.tmpBase), [])
  } finally {
    f.cleanup()
  }
})

test('JavaScript: 예외와 문법 오류, 시간 초과', async () => {
  const f = makeFixture({ 'Main.js': 'throw new Error("boom")\n', 'Loop.js': 'for(;;){}\n', 'Bad.js': 'const = ;\n' })
  try {
    const thrown = await f.service.start(req(f, 'Main.js')).done
    assert.strictEqual(thrown.ok, false)
    assert.strictEqual(thrown.exitCode, 1)
    assert.match(thrown.stderr, /boom/)
    const bad = await f.service.start(req(f, 'Bad.js', { mode: 'compile' })).done
    assert.strictEqual(bad.ok, false)
    assert.strictEqual(bad.phase, 'compile')
    // Loop.js 는 Main/Solution 이 아니어서 입출력 문제로 보지 않으므로 실행이 거부된다.
    assert.strictEqual((await f.service.start(req(f, 'Loop.js')).done).error, 'NOT_IO_PROBLEM')
  } finally {
    f.cleanup()
  }
})

test('JavaScript: 무한 반복은 시간 제한에서 끝난다', async () => {
  const f = makeFixture({ 'Main.js': 'for(;;){}\n' })
  try {
    const r = await f.service.start(req(f, 'Main.js', { timeoutMs: 1000 })).done
    assert.strictEqual(r.timedOut, true)
  } finally {
    f.cleanup()
  }
})
