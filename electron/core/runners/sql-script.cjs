// Copyright (c) dendr000. MIT License.
// SQL 실행 스크립트: 앱에 들어 있는 Node(Electron 을 ELECTRON_RUN_AS_NODE 로 실행)의 내장 SQLite(node:sqlite)로 돌린다.
// 사용: <실행기> --no-warnings ar-sql-run.cjs <풀이 .sql 파일>   (표준 입력 = 먼저 실행할 준비 SQL: CREATE TABLE, INSERT 등)
// 메모리 DB 라서 파일이 생기지 않는다. SELECT 결과는 첫 줄이 열 이름이고 값은 탭으로 구분해 출력한다(NULL 은 NULL).
const fs = require('node:fs')
const { DatabaseSync } = require('node:sqlite')

// 문자열('..' ".." `..`)과 주석(-- ..., /* .. */) 안의 ; 는 무시하고 문장으로 나눈다.
function splitStatements(sql) {
  const out = []
  let cur = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const two = sql.slice(i, i + 2)
    if (two === '--') {
      const end = sql.indexOf('\n', i)
      i = end < 0 ? sql.length : end
      continue
    }
    if (two === '/*') {
      const end = sql.indexOf('*/', i + 2)
      i = end < 0 ? sql.length : end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2
          else break
        } else j++
      }
      cur += sql.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (ch === ';') {
      if (cur.trim() !== '') out.push(cur.trim())
      cur = ''
      i++
      continue
    }
    cur += ch
    i++
  }
  if (cur.trim() !== '') out.push(cur.trim())
  return out
}

const stripComments = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')

const show = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'bigint' ? v.toString() : v instanceof Uint8Array ? '[BLOB ' + v.length + 'B]' : String(v))

function main() {
  const file = process.argv[2]
  const check = process.argv.includes('--check')
  const presetFiles = []
  for (let i = 3; i < process.argv.length; i++) if (process.argv[i] === '--preset' && process.argv[i + 1]) presetFiles.push(process.argv[++i])
  const setup = fs.readFileSync(0, 'utf8')
  const source = fs.readFileSync(file, 'utf8')
  const db = new DatabaseSync(':memory:')
  // 풀이나 입력 탭에서 직접 표를 만들면(CREATE TABLE) 기본 데이터는 넣지 않는다(같은 이름 표가 겹치지 않게).
  const ownTables = /\bCREATE\s+TABLE\b/i.test(stripComments(setup + '\n' + source))
  const usePresets = !ownTables && presetFiles.length > 0
  if (usePresets) {
    for (const p of presetFiles) {
      try {
        db.exec(fs.readFileSync(p, 'utf8'))
      } catch (e) {
        process.stderr.write('SQL 기본 데이터(' + require('node:path').basename(p) + ') 오류: ' + e.message + '\n')
        process.exit(1)
      }
    }
  }
  if (setup.trim() !== '') {
    try {
      db.exec(setup)
    } catch (e) {
      process.stderr.write('준비 SQL(입력 탭) 오류: ' + e.message + '\n')
      process.exit(1)
    }
  }
  const statements = splitStatements(source)
  if (statements.length === 0) {
    process.stderr.write('실행할 SQL 문이 없습니다.\n')
    process.exit(1)
  }
  let printedSet = false
  for (let n = 0; n < statements.length; n++) {
    try {
      if (check) {
        // 문법 확인: 기본 데이터가 없는 빈 DB 에서는 표가 없다는 오류를 문법 문제로 보지 않고 넘긴다.
        try {
          db.prepare(statements[n])
        } catch (e) {
          if (usePresets || !/no such (table|column)/i.test(e.message)) throw e
        }
        continue
      }
      const stmt = db.prepare(statements[n])
      const columns = stmt.columns()
      if (columns.length > 0) {
        stmt.setReturnArrays(true)
        const rows = stmt.all()
        if (printedSet) process.stdout.write('\n')
        process.stdout.write(columns.map((c) => c.name).join('\t') + '\n')
        for (const row of rows) process.stdout.write(row.map(show).join('\t') + '\n')
        printedSet = true
      } else {
        stmt.run()
      }
    } catch (e) {
      let hint = ''
      if (/no such table|no such column/i.test(e.message)) {
        hint = usePresets
          ? '\n(힌트: 기본 데이터에 없는 표·열 이름입니다. 이름을 확인하거나 입력 탭에 CREATE TABLE 로 직접 만드세요)'
          : '\n(힌트: 입력 탭에 CREATE TABLE 과 INSERT 문으로 시험용 표를 먼저 만들어 두세요)'
      }
      process.stderr.write('SQL 오류 (' + (n + 1) + '번째 문): ' + e.message + hint + '\n')
      process.exit(1)
    }
  }
}

main()
