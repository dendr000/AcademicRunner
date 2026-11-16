// Copyright (c) dendr000. MIT License.
// SQL 기본 데이터 묶음의 저장소. 내장 묶음(school, shop, dbms)의 수정본과 사용자가 만든 묶음을 사용자 데이터 폴더의
// sql-presets.json 에 둔다. 저장 전에 SQL 이 실제로 실행되는지 메모리 DB 에서 확인한다. 저장은 임시 파일 뒤 이름 바꾸기 방식이다.
const fs = require('node:fs')
const path = require('node:path')

const MAX_SQL_CHARS = 200000
const MAX_CUSTOM = 20
const ID_PATTERN = /^[a-z][a-z0-9_]{0,19}$/
const RESERVED = ['none', 'all']

function fail(error, message) {
  return { ok: false, error, message }
}

// SQL 을 빈 메모리 DB 에서 실행해 본다. 문제가 없으면 null, 있으면 오류 글.
function checkSql(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') return 'SQL 이 비어 있습니다.'
  if (sql.length > MAX_SQL_CHARS) return 'SQL 이 너무 깁니다 (최대 ' + MAX_SQL_CHARS + '자).'
  let DatabaseSync
  try {
    ;({ DatabaseSync } = require('node:sqlite'))
  } catch {
    return null // 이 환경에는 SQLite 가 없어 확인하지 못한다(저장은 허용).
  }
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(sql)
    return null
  } catch (e) {
    return String(e && e.message ? e.message : e)
  } finally {
    db.close()
  }
}

// builtins: [{ id, label, sql }] 내장 원본. dir: 저장 폴더.
function createSqlPresetStore(dir, builtins) {
  const file = path.join(dir, 'sql-presets.json')

  function read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      const overrides = {}
      for (const b of builtins) if (parsed && parsed.overrides && typeof parsed.overrides[b.id] === 'string') overrides[b.id] = parsed.overrides[b.id]
      const custom = []
      const seen = new Set()
      for (const c of (parsed && Array.isArray(parsed.custom) ? parsed.custom : []).slice(0, MAX_CUSTOM)) {
        if (c && typeof c.id === 'string' && ID_PATTERN.test(c.id) && typeof c.sql === 'string' && !seen.has(c.id) && !builtins.some((b) => b.id === c.id)) {
          seen.add(c.id)
          custom.push({ id: c.id, sql: c.sql })
        }
      }
      return { overrides, custom }
    } catch {
      return { overrides: {}, custom: [] }
    }
  }

  function write(data) {
    fs.mkdirSync(dir, { recursive: true })
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, file)
  }

  // 화면 편집용 목록: 내장 묶음 먼저, 그다음 사용자 묶음
  function list() {
    const data = read()
    return [
      ...builtins.map((b) => ({ id: b.id, label: b.label, builtin: true, sql: data.overrides[b.id] ?? b.sql, modified: b.id in data.overrides })),
      ...data.custom.map((c) => ({ id: c.id, label: c.id, builtin: false, sql: c.sql, modified: false })),
    ]
  }

  // 실행기가 쓰는 목록: 사용자 묶음 먼저(표 이름이 겹치면 사용자 것이 이긴다), 내장 묶음 뒤
  function forRun() {
    const all = list()
    return [...all.filter((p) => !p.builtin), ...all.filter((p) => p.builtin)].map((p) => ({ id: p.id, label: p.label, sql: p.sql }))
  }

  function save(id, sql) {
    if (typeof id !== 'string') return fail('BAD_ARGUMENT', '묶음 이름이 올바르지 않습니다.')
    const message = checkSql(sql)
    if (message) return fail('SQL_ERROR', message)
    const data = read()
    const builtin = builtins.find((b) => b.id === id)
    if (builtin) {
      if (sql === builtin.sql) delete data.overrides[id]
      else data.overrides[id] = sql
    } else {
      const item = data.custom.find((c) => c.id === id)
      if (!item) return fail('NOT_FOUND', '없는 묶음입니다.')
      item.sql = sql
    }
    write(data)
    return { ok: true }
  }

  function reset(id) {
    if (!builtins.some((b) => b.id === id)) return fail('NOT_BUILTIN', '내장 묶음만 처음 상태로 되돌릴 수 있습니다.')
    const data = read()
    delete data.overrides[id]
    write(data)
    return { ok: true }
  }

  function add(id, sql) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return fail('BAD_NAME', '이름은 영문 소문자로 시작하고 영문 소문자·숫자·밑줄만 쓸 수 있습니다 (최대 20자).')
    if (RESERVED.includes(id) || builtins.some((b) => b.id === id)) return fail('NAME_TAKEN', '이미 쓰는 이름입니다.')
    const data = read()
    if (data.custom.some((c) => c.id === id)) return fail('NAME_TAKEN', '이미 쓰는 이름입니다.')
    if (data.custom.length >= MAX_CUSTOM) return fail('TOO_MANY', '묶음은 최대 ' + MAX_CUSTOM + '개까지 만들 수 있습니다.')
    const message = checkSql(sql)
    if (message) return fail('SQL_ERROR', message)
    data.custom.push({ id, sql })
    write(data)
    return { ok: true }
  }

  function remove(id) {
    const data = read()
    const before = data.custom.length
    data.custom = data.custom.filter((c) => c.id !== id)
    if (data.custom.length === before) return fail('NOT_FOUND', '없는 묶음이거나 내장 묶음입니다(내장 묶음은 지울 수 없습니다).')
    write(data)
    return { ok: true }
  }

  return { list, forRun, save, reset, add, remove }
}

module.exports = { createSqlPresetStore, checkSql, ID_PATTERN }
