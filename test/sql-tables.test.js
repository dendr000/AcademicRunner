// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert/strict')
const { inspectTables, MAX_ROWS } = require('../electron/core/sql-tables')

const names = (r) => r.tables.map((t) => t.name)

test('풀이에 student 가 나오면 학교 기본 표의 열과 행을 돌려준다', () => {
  const r = inspectTables('SELECT * FROM student', '')
  assert.equal(r.ok, true)
  assert.equal(r.guessed, false)
  assert.deepEqual(names(r), ['student', 'course', 'enroll'])
  const student = r.tables[0]
  assert.deepEqual(student.columns.map((c) => c.name), ['id', 'name', 'dept', 'grade', 'score'])
  assert.equal(student.columns[0].pk, true)
  assert.equal(student.rowCount, student.rows.length)
  assert.equal(student.truncated, false)
})

test('풀이에 표 이름이 없으면 기본 표를 모두 보여 주고 추측했다고 표시한다', () => {
  const r = inspectTables('SELECT 1', '')
  assert.equal(r.ok, true)
  assert.equal(r.guessed, true)
  assert.ok(names(r).includes('student'))
  assert.ok(names(r).includes('customers'))
})

test('-- @data: none 이면 기본 표를 넣지 않고 추측도 하지 않는다', () => {
  const r = inspectTables('-- @data: none\nSELECT 1', '')
  assert.equal(r.ok, true)
  assert.equal(r.guessed, false)
  assert.deepEqual(r.tables, [])
})

test('대문자 STUDENT 는 DBMS 이론 표를 보여 준다', () => {
  const r = inspectTables('SELECT * FROM STUDENT', '')
  assert.deepEqual(names(r), ['STUDENT', 'DEPT'])
})

test('풀이가 직접 만든 표(CREATE TABLE, INSERT)는 기본 표 없이 그 표만 보여 준다', () => {
  const r = inspectTables('CREATE TABLE a(x INTEGER, y TEXT);\nINSERT INTO a VALUES (1, NULL);\nSELECT * FROM a;', '')
  assert.equal(r.ok, true)
  assert.deepEqual(names(r), ['a'])
  assert.deepEqual(r.tables[0].rows, [['1', null]])
  assert.deepEqual(r.presets, [])
})

test('입력 탭의 준비 SQL 도 반영한다', () => {
  const r = inspectTables('SELECT * FROM memo', 'CREATE TABLE memo(id INTEGER);INSERT INTO memo VALUES (7);')
  assert.deepEqual(names(r), ['memo'])
  assert.deepEqual(r.tables[0].rows, [['7']])
})

test('준비 SQL 에 오류가 있으면 오류 글을 돌려준다', () => {
  const r = inspectTables('SELECT 1', 'CREATE TABLE')
  assert.equal(r.ok, false)
  assert.match(r.error, /준비 SQL/)
})

test('기본 데이터 SQL 이 깨졌으면 어느 묶음인지 알려 준다', () => {
  const r = inspectTables('SELECT * FROM student', '', [{ id: 'school', label: '학교', sql: 'CREATE TABLE student(' }])
  assert.equal(r.ok, false)
  assert.match(r.error, /school/)
})

test('행이 많으면 앞쪽만 돌려주고 전체 줄 수를 알려 준다', () => {
  const total = MAX_ROWS + 25
  const values = Array.from({ length: total }, (_, i) => '(' + (i + 1) + ')').join(',')
  const sql = 'CREATE TABLE big(n INTEGER);\nINSERT INTO big VALUES ' + values + ';'
  const r = inspectTables(sql, '')
  assert.equal(r.ok, true)
  assert.equal(r.tables[0].rows.length, MAX_ROWS)
  assert.equal(r.tables[0].rowCount, total)
  assert.equal(r.tables[0].truncated, true)
})

test('아직 완성되지 않은 풀이 문장은 건너뛰고 나머지는 보여 준다', () => {
  const r = inspectTables('CREATE TABLE ok(a INTEGER);\nINSERT INTO nothing VALUES (1);\nCREATE TABLE', '')
  assert.equal(r.ok, true)
  assert.deepEqual(names(r), ['ok'])
})

test('긴 글자 값은 줄여서 돌려준다', () => {
  const r = inspectTables("CREATE TABLE t(s TEXT);\nINSERT INTO t VALUES ('" + 'a'.repeat(500) + "');", '')
  assert.ok(r.tables[0].rows[0][0].length < 300)
  assert.ok(r.tables[0].rows[0][0].endsWith('...'))
})

test('재귀 문장은 실행하지 않고 건너뛴다(끝나지 않는 쿼리 방지)', () => {
  const r = inspectTables('CREATE TABLE t(n INTEGER);\nINSERT INTO t WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c) SELECT n FROM c;', '')
  assert.equal(r.ok, true)
  assert.equal(r.tables[0].rowCount, 0)
})
