// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const { createRunner, INSTALL_HINT } = require('../electron/core/runners/c-family')
const { kindOf } = require('../electron/core/scanner')
const realTools = require('../electron/core/tool-locator')

let hasSqlite = true
try {
  require('node:sqlite')
} catch {
  hasSqlite = false
}
const skipNoSqlite = hasSqlite ? false : 'node:sqlite 가 없어 건너뜀'

const SETUP = "CREATE TABLE student(id INTEGER, name TEXT, score INTEGER);\nINSERT INTO student VALUES (1,'가나',90),(2,'다라',NULL);"

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-sql-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-sql-tmp-'))
  for (const [id, name, content] of files) {
    const dir = path.join(root, ...id.split('/'))
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), content)
  }
  const service = createRunService({ runners, tools: realTools, tmpBase })
  return {
    root,
    service,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true })
      fs.rmSync(tmpBase, { recursive: true, force: true })
    },
  }
}

const req = (root, id, name, extra = {}) => ({ root, problemId: id, fileName: name, mode: 'run', input: '', ...extra })

test('SQL 파일은 입출력(io) 문제로 본다', () => {
  assert.strictEqual(kindOf('Solution.sql'), 'io')
  assert.strictEqual(kindOf('Main.sql'), 'io')
  assert.strictEqual(kindOf('Solution.c'), 'function')
})

test('SQL: 입력 탭의 준비 SQL 위에서 SELECT 결과를 탭 구분 표로 낸다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/01_조회', 'Solution.sql', 'SELECT name, score\nFROM student ORDER BY id;']])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/01_조회', 'Solution.sql', { input: SETUP })).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'name\tscore\n가나\t90\n다라\tNULL')
  } finally {
    f.cleanup()
  }
})

test('SQL: 문자열 안의 세미콜론과 주석은 문장을 나누지 않는다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/02_문자열', 'Solution.sql', "-- 설명; 무시\nSELECT 'a;b' AS v; /* x; y */ SELECT 2 AS w;"]])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/02_문자열', 'Solution.sql')).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'v\na;b\n\nw\n2')
  } finally {
    f.cleanup()
  }
})

test('SQL: 표가 없으면 입력 탭 안내와 함께 실패한다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/03_없음', 'Solution.sql', 'SELECT * FROM no_such_table_x;']])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/03_없음', 'Solution.sql')).done
    assert.strictEqual(r.ok, false)
    assert.match(r.stderr, /no such table/)
    assert.match(r.stderr, /입력 탭/)
  } finally {
    f.cleanup()
  }
})

test('SQL: 컴파일 확인은 문법 오류만 잡고 표가 없는 것은 넘긴다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([
    ['Lv0_기초/04_정상', 'Solution.sql', 'SELECT * FROM no_such_table_x;'],
    ['Lv0_기초/05_오타', 'Solution.sql', 'SELEC * FROM student;'],
  ])
  try {
    const ok = await f.service.start(req(f.root, 'Lv0_기초/04_정상', 'Solution.sql', { mode: 'compile' })).done
    assert.strictEqual(ok.ok, true, JSON.stringify(ok).slice(0, 300))
    const bad = await f.service.start(req(f.root, 'Lv0_기초/05_오타', 'Solution.sql', { mode: 'compile' })).done
    assert.strictEqual(bad.ok, false)
  } finally {
    f.cleanup()
  }
})

test('SQL: 실시간 입력 요청이 와도 입력 탭 방식으로 실행된다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/06_실시간', 'Solution.sql', 'SELECT COUNT(*) AS n FROM student;']])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/06_실시간', 'Solution.sql', { input: SETUP, interactive: true })).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'n\n2')
  } finally {
    f.cleanup()
  }
})

const job = (extra) => ({ source: 'int main(){return 0;}', fileName: 'Main.c', mode: 'run', dir: path.join(os.tmpdir(), 'x'), kind: 'io', ...extra })
const fakeTools = { c: () => ({ cmd: 'gcc', version: 'gcc 13' }), cpp: () => ({ cmd: 'g++', version: 'g++ 13' }) }

test('C: 컴파일러가 없으면 TOOL_MISSING 과 설치 안내를 준다', () => {
  const r = createRunner('c').prepare(job(), { c: () => null })
  assert.strictEqual(r.error, 'TOOL_MISSING')
  assert.strictEqual(r.message, INSTALL_HINT)
})

test('C/C++: 실행은 컴파일 단계 뒤에 실행 단계가 오고 표준이 다르다', () => {
  const c = createRunner('c').prepare(job(), fakeTools)
  assert.deepStrictEqual(c.steps.map((s) => s.phase), ['compile', 'run'])
  assert.ok(c.steps[0].args.includes('-std=c17'))
  assert.strictEqual(c.steps[0].cmd, 'gcc')
  const cpp = createRunner('cpp').prepare(job({ fileName: 'Main.cpp' }), fakeTools)
  assert.ok(cpp.steps[0].args.includes('-std=c++17'))
  assert.strictEqual(cpp.steps[0].cmd, 'g++')
})

test('C/C++: 컴파일 확인은 문법 검사 한 단계만 한다', () => {
  const r = createRunner('c').prepare(job({ mode: 'compile' }), fakeTools)
  assert.strictEqual(r.steps.length, 1)
  assert.ok(r.steps[0].args.includes('-fsyntax-only'))
})

test('C/C++: 함수 문제를 실행하려 하면 NOT_SUPPORTED, 컴파일 확인은 가능', () => {
  const run = createRunner('c').prepare(job({ fileName: 'Solution.c', kind: 'function' }), fakeTools)
  assert.strictEqual(run.error, 'NOT_SUPPORTED')
  const compile = createRunner('c').prepare(job({ fileName: 'Solution.c', kind: 'function', mode: 'compile' }), fakeTools)
  assert.ok(!compile.error)
})

test('러너 목록에 c, cpp, sql 이 들어 있다', () => {
  for (const l of ['c', 'cpp', 'sql']) assert.ok(runners[l], l)
})

test('SQL 기본 데이터: 학교 표 이름을 쓰면 SELECT 만 적어도 실행된다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/10_학교', 'Solution.sql', 'SELECT name, dept FROM student ORDER BY id LIMIT 2;']])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/10_학교', 'Solution.sql')).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'name\tdept\n김민준\t컴퓨터공학\n이서연\t경영')
    assert.match(r.toolVersion || '', /기본 데이터/)
  } finally {
    f.cleanup()
  }
})

test('SQL 기본 데이터: 쇼핑 표도 쓰고, 입력 탭의 INSERT 가 그 위에 더해진다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv1_입문/01_쇼핑', 'Solution.sql', 'SELECT COUNT(*) AS n FROM customers;']])
  try {
    const base = await f.service.start(req(f.root, 'Lv1_입문/01_쇼핑', 'Solution.sql')).done
    assert.strictEqual(base.stdout.trim(), 'n\n12')
    const more = await f.service.start(req(f.root, 'Lv1_입문/01_쇼핑', 'Solution.sql', { input: "INSERT INTO customers(id,name) VALUES (99,'추가');" })).done
    assert.strictEqual(more.stdout.trim(), 'n\n13')
  } finally {
    f.cleanup()
  }
})

test('SQL 기본 데이터: 풀이에 CREATE TABLE 이 있으면 기본 데이터를 넣지 않는다', { skip: skipNoSqlite }, async () => {
  const f = makeFixture([['Lv0_기초/11_직접', 'Solution.sql', 'CREATE TABLE student(id INTEGER, name TEXT);\nINSERT INTO student VALUES (1,\'가\');\nSELECT COUNT(*) AS n FROM student;']])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/11_직접', 'Solution.sql')).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'n\n1')
  } finally {
    f.cleanup()
  }
})

test('SQL 기본 데이터: 주석에만 적힌 표 이름은 무시하고, 없는 열은 컴파일 확인이 잡는다', { skip: skipNoSqlite }, async () => {
  const { pickPresets } = require('../electron/core/runners/sql')
  assert.deepStrictEqual(pickPresets('-- student 표\nSELECT 1;').map((p) => p.name), [])
  assert.deepStrictEqual(pickPresets('SELECT * FROM orders JOIN student').map((p) => p.name), ['school', 'shop'])
  const f = makeFixture([['Lv0_기초/12_열오타', 'Solution.sql', 'SELECT nam FROM student;']])
  try {
    const bad = await f.service.start(req(f.root, 'Lv0_기초/12_열오타', 'Solution.sql', { mode: 'compile' })).done
    assert.strictEqual(bad.ok, false)
  } finally {
    f.cleanup()
  }
})

test('SQL 기본 데이터: 대문자 STUDENT/DEPT 는 DBMS 이론 표, 주석 지시로 직접 고를 수 있다', { skip: skipNoSqlite }, async () => {
  const { pickPresets } = require('../electron/core/runners/sql')
  assert.deepStrictEqual(pickPresets('SELECT * FROM STUDENT s JOIN DEPT d ON s.dept = d.dept').map((p) => p.name), ['dbms'])
  assert.deepStrictEqual(pickPresets('SELECT * FROM student').map((p) => p.name), ['school'])
  assert.deepStrictEqual(pickPresets('-- @data: none\nSELECT * FROM student').map((p) => p.name), [])
  assert.deepStrictEqual(pickPresets('-- @data: dbms\nSELECT * FROM student').map((p) => p.name), ['dbms'])
  const f = makeFixture([['Lv0_기초/13_이론', 'Solution.sql', "-- 이론 문제\nBEGIN;\nDELETE FROM STUDENT WHERE dept = 'IT';\nROLLBACK;\nSELECT COUNT(*) AS n FROM STUDENT;\nSELECT s.name, d.dname FROM STUDENT s LEFT JOIN DEPT d ON s.dept = d.dept WHERE s.id = 4;"]])
  try {
    const r = await f.service.start(req(f.root, 'Lv0_기초/13_이론', 'Solution.sql')).done
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300))
    assert.strictEqual(r.stdout.trim(), 'n\n5\n\nname\tdname\n최유나\tNULL')
  } finally {
    f.cleanup()
  }
})
