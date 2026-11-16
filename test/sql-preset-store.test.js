// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createSqlPresetStore } = require('../electron/core/sql-preset-store')
const sqlRunner = require('../electron/core/runners/sql')
const { createRunService } = require('../electron/core/run-service')
const { runners } = require('../electron/core/runners')
const realTools = require('../electron/core/tool-locator')

let hasSqlite = true
try {
  require('node:sqlite')
} catch {
  hasSqlite = false
}
const skip = hasSqlite ? false : 'node:sqlite 가 없어 건너뜀'

function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-preset-'))
  const store = createSqlPresetStore(dir, sqlRunner.builtinList())
  return { dir, store, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

test('목록: 내장 묶음 3개가 먼저, 수정 표시는 처음엔 없다', () => {
  const s = makeStore()
  try {
    const l = s.store.list()
    assert.deepStrictEqual(l.map((p) => p.id), ['school', 'shop', 'dbms'])
    assert.ok(l.every((p) => p.builtin && !p.modified))
  } finally {
    s.cleanup()
  }
})

test('내장 묶음 수정은 저장되고 처음 상태로 되돌릴 수 있다', { skip }, () => {
  const s = makeStore()
  try {
    const r = s.store.save('school', 'CREATE TABLE student(id INTEGER, name TEXT);\nINSERT INTO student VALUES (1,\'가\');')
    assert.strictEqual(r.ok, true)
    const p = s.store.list().find((x) => x.id === 'school')
    assert.strictEqual(p.modified, true)
    assert.match(p.sql, /'가'/)
    // 파일에 남아 다시 만든 저장소에서도 보인다
    const again = createSqlPresetStore(s.dir, sqlRunner.builtinList())
    assert.strictEqual(again.list().find((x) => x.id === 'school').modified, true)
    assert.strictEqual(s.store.reset('school').ok, true)
    assert.strictEqual(s.store.list().find((x) => x.id === 'school').modified, false)
    // 원본과 같은 내용으로 저장하면 수정 표시가 붙지 않는다
    const original = sqlRunner.builtinList().find((x) => x.id === 'shop').sql
    s.store.save('shop', original)
    assert.strictEqual(s.store.list().find((x) => x.id === 'shop').modified, false)
  } finally {
    s.cleanup()
  }
})

test('실행되지 않는 SQL 과 빈 SQL 은 저장하지 않는다', { skip }, () => {
  const s = makeStore()
  try {
    const bad = s.store.save('school', 'CREATE TABEL x(id INTEGER);')
    assert.strictEqual(bad.ok, false)
    assert.strictEqual(bad.error, 'SQL_ERROR')
    assert.strictEqual(s.store.save('school', '   ').ok, false)
    assert.strictEqual(s.store.list().find((x) => x.id === 'school').modified, false)
  } finally {
    s.cleanup()
  }
})

test('새 묶음: 이름 규칙·중복·삭제', { skip }, () => {
  const s = makeStore()
  try {
    const sql = 'CREATE TABLE memo(id INTEGER, title TEXT);\nINSERT INTO memo VALUES (1,\'a\');'
    assert.strictEqual(s.store.add('mydb', sql).ok, true)
    assert.strictEqual(s.store.add('mydb', sql).error, 'NAME_TAKEN')
    assert.strictEqual(s.store.add('school', sql).error, 'NAME_TAKEN')
    assert.strictEqual(s.store.add('none', sql).error, 'NAME_TAKEN')
    assert.strictEqual(s.store.add('Bad Name', sql).error, 'BAD_NAME')
    assert.strictEqual(s.store.add('1abc', sql).error, 'BAD_NAME')
    assert.deepStrictEqual(s.store.forRun().map((p) => p.id), ['mydb', 'school', 'shop', 'dbms'])
    assert.strictEqual(s.store.remove('school').ok, false)
    assert.strictEqual(s.store.remove('mydb').ok, true)
    assert.strictEqual(s.store.list().length, 3)
  } finally {
    s.cleanup()
  }
})

test('깨진 설정 파일은 기본 상태로 읽는다', () => {
  const s = makeStore()
  try {
    fs.writeFileSync(path.join(s.dir, 'sql-presets.json'), '{ 깨짐', 'utf8')
    assert.strictEqual(s.store.list().length, 3)
    fs.writeFileSync(path.join(s.dir, 'sql-presets.json'), JSON.stringify({ overrides: { school: 5 }, custom: [{ id: 'SCHOOL', sql: 'x' }, { id: 'ok_1', sql: 'CREATE TABLE a(x INTEGER);' }] }), 'utf8')
    const l = s.store.list()
    assert.strictEqual(l.find((p) => p.id === 'school').modified, false)
    assert.deepStrictEqual(l.filter((p) => !p.builtin).map((p) => p.id), ['ok_1'])
  } finally {
    s.cleanup()
  }
})

test('pickPresets: 사용자 묶음은 자기 표 이름으로 선택되고 먼저 온 묶음과 표가 겹치면 빠진다', () => {
  const list = [
    { id: 'mine', label: 'mine', sql: 'CREATE TABLE student(id INTEGER);' },
    ...sqlRunner.builtinList(),
  ]
  assert.deepStrictEqual(sqlRunner.pickPresets('SELECT * FROM student', list).map((p) => p.id), ['mine'])
  const only = [{ id: 'mine', label: 'mine', sql: 'CREATE TABLE memo(id INTEGER);' }, ...sqlRunner.builtinList()]
  assert.deepStrictEqual(sqlRunner.pickPresets('SELECT * FROM memo JOIN customers', only).map((p) => p.id), ['mine', 'shop'])
  assert.deepStrictEqual(sqlRunner.pickPresets('-- @data: mine\nSELECT 1', only).map((p) => p.id), ['mine'])
})

test('내장 묶음에 사용자가 더한 새 표 이름으로도 그 묶음이 선택된다', () => {
  const list = sqlRunner.builtinList().map((p) => (p.id === 'school' ? { ...p, sql: p.sql + '\nCREATE TABLE teacher(id INTEGER, name TEXT);' } : p))
  assert.deepStrictEqual(sqlRunner.pickPresets('SELECT * FROM teacher', list).map((p) => p.id), ['school'])
  assert.deepStrictEqual(sqlRunner.pickPresets('SELECT 1', list).map((p) => p.id), [])
})

test('실행: 고친 기본 데이터와 새 묶음이 실제 실행에 쓰인다', { skip }, async () => {
  const s = makeStore()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-preset-root-'))
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-preset-tmp-'))
  try {
    s.store.save('school', "CREATE TABLE student(id INTEGER, name TEXT, dept TEXT, grade INTEGER, score INTEGER);\nINSERT INTO student VALUES (1,'고침','경영',1,50);")
    s.store.add('mydb', "CREATE TABLE memo(id INTEGER, title TEXT);\nINSERT INTO memo VALUES (7,'내표');")
    const put = (id, sql) => {
      const d = path.join(root, ...id.split('/'))
      fs.mkdirSync(d, { recursive: true })
      fs.writeFileSync(path.join(d, 'Solution.sql'), sql)
    }
    put('Lv0_기초/01_고침', 'SELECT name FROM student;')
    put('Lv0_기초/02_내표', 'SELECT title FROM memo;')
    const service = createRunService({ runners, tools: { ...realTools, sqlPresets: () => s.store.forRun() }, tmpBase })
    const a = await service.start({ root, problemId: 'Lv0_기초/01_고침', fileName: 'Solution.sql', mode: 'run', input: '' }).done
    assert.strictEqual(a.stdout.trim(), 'name\n고침')
    const b = await service.start({ root, problemId: 'Lv0_기초/02_내표', fileName: 'Solution.sql', mode: 'run', input: '' }).done
    assert.strictEqual(b.stdout.trim(), 'title\n내표')
    assert.match(b.toolVersion || '', /mydb/)
  } finally {
    s.cleanup()
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(tmpBase, { recursive: true, force: true })
  }
})
