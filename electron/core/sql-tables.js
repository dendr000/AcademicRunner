// Copyright (c) dendr000. MIT License.
// SQL 풀이에서 "지금 쓸 수 있는 표"를 보여 주기 위한 조사: 실행할 때와 같은 방식으로 메모리 DB 를 만들고
// 표 이름, 열(이름·종류), 앞쪽 행을 읽어 돌려 준다(SELECT * FROM 표 와 같은 내용). 파일은 만들지 않는다.
const { pickPresets, builtinList, tablesOf } = require('./runners/sql')
const { splitStatements } = require('./runners/sql-script.cjs')

const MAX_ROWS = 200
const MAX_TABLES = 40
const MAX_CELL = 200

const stripComments = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
const quote = (name) => '"' + String(name).replace(/"/g, '""') + '"'

function show(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'bigint') return v.toString()
  if (v instanceof Uint8Array) return '[BLOB ' + v.length + 'B]'
  const s = String(v)
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL) + '...' : s
}

// source: 풀이 SQL, setup: 입력 탭의 준비 SQL, list: [{ id, label, sql }] (없으면 내장 원본)
// 결과: { ok: true, presets: [라벨], tables: [{ name, columns: [{ name, type, pk }], rows: [[값|null]], rowCount, truncated }] }
//       { ok: false, error: 글 }
function inspectTables(source, setup, list) {
  let DatabaseSync
  try {
    ;({ DatabaseSync } = require('node:sqlite'))
  } catch {
    return { ok: false, error: '이 환경에는 SQLite 가 없어 표를 보여 줄 수 없습니다.' }
  }
  const src = String(source || '')
  const prep = String(setup || '')
  const db = new DatabaseSync(':memory:')
  try {
    const ownTables = /\bCREATE\s+TABLE\b/i.test(stripComments(prep + '\n' + src))
    const all = list || builtinList()
    let presets = ownTables ? [] : pickPresets(src, all)
    // 풀이에 아직 표 이름이 없으면(빈 파일 등) 기본 표를 모두 보여 준다. 실제 실행에서는 표 이름을 쓰면 그때 들어간다.
    let guessed = false
    if (!ownTables && presets.length === 0 && !/--\s*@data\s*:/i.test(src)) {
      const names = ['student', 'customers', ...all.filter((p) => !['school', 'shop', 'dbms'].includes(p.id)).flatMap((p) => tablesOf(p.sql))]
      presets = pickPresets(names.join(' '), all)
      guessed = presets.length > 0
    }
    for (const p of presets) {
      try {
        db.exec(p.sql)
      } catch (e) {
        return { ok: false, error: 'SQL 기본 데이터(' + p.id + ') 오류: ' + e.message }
      }
    }
    if (prep.trim() !== '') {
      try {
        db.exec(prep)
      } catch (e) {
        return { ok: false, error: '준비 SQL(입력 탭) 오류: ' + e.message }
      }
    }
    // 풀이가 직접 만든 표도 보이게, 풀이 안의 조회가 아닌 문장(CREATE, INSERT 등)은 실행해 본다. 오류는 건너뛴다.
    if (ownTables) {
      for (const s of splitStatements(src)) {
        // 조회와 재귀 문장은 건너뛴다(끝나지 않는 쿼리가 앱을 멈추게 하지 않도록).
        if (/^\s*(SELECT|WITH|EXPLAIN|PRAGMA|VALUES)\b/i.test(s) || /\bRECURSIVE\b/i.test(s)) continue
        try {
          db.exec(s)
        } catch {
          // 아직 완성되지 않은 문장일 수 있다.
        }
      }
    }
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
      .all()
      .map((r) => r.name)
      .slice(0, MAX_TABLES)
    const tables = names.map((name) => {
      const columns = db.prepare('PRAGMA table_info(' + quote(name) + ')').all().map((c) => ({ name: c.name, type: c.type || '', pk: Number(c.pk) > 0 }))
      const rowCount = Number(db.prepare('SELECT COUNT(*) AS n FROM ' + quote(name)).get().n)
      const stmt = db.prepare('SELECT * FROM ' + quote(name) + ' LIMIT ' + MAX_ROWS)
      stmt.setReturnArrays(true)
      const rows = stmt.all().map((row) => row.map(show))
      return { name, columns, rows, rowCount, truncated: rowCount > rows.length }
    })
    return { ok: true, guessed, presets: presets.map((p) => p.label.replace(/ \(.*\)$/, '')), tables }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  } finally {
    db.close()
  }
}

module.exports = { inspectTables, MAX_ROWS }
