// Copyright (c) dendr000. MIT License.
// SQL 러너: 앱에 들어 있는 Node 의 내장 SQLite(메모리 DB)로 풀이 .sql 을 실행한다. 따로 DB 설치가 필요 없다.
// 기본 데이터("묶음"): 풀이에 그 묶음의 표 이름이 나오면 표와 데이터를 미리 만들어 둔다. SELECT 문만 적어도 바로 실행된다.
//   내장 묶음: school(student/course/enroll, 사이트 SQL Lv0), shop(customers/products/orders/order_items, Lv1~5), dbms(STUDENT/DEPT 대문자, DBMS 이론 점검)
//   사용자가 고친 내용과 새로 만든 묶음은 tools.sqlPresets() 가 돌려준다(메인 프로세스의 저장소). 없으면 내장 원본을 쓴다.
// 추가 데이터: 입력 탭(또는 케이스의 입력)의 SQL 은 기본 데이터 위에 더해서 먼저 실행한다.
//   풀이나 입력에 CREATE TABLE 이 있으면 직접 표를 만드는 것으로 보고 기본 데이터는 넣지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const SCRIPT_NAME = 'ar-sql-run.cjs'
const PRESET_DIR = path.join(__dirname, 'sql-presets')

// 내장 묶음. 선택 순서(school, shop, dbms)가 곧 실행 순서다.
const BUILTIN = [
  { id: 'school', label: '학생·과목·수강 (사이트 SQL Lv0)' },
  { id: 'shop', label: '고객·상품·주문 (사이트 SQL Lv1~5)' },
  { id: 'dbms', label: 'DBMS 이론 STUDENT·DEPT' },
]

// 내장 원본 목록: [{ id, label, builtin: true, sql }]
function builtinList() {
  return BUILTIN.map((b) => ({ ...b, builtin: true, sql: fs.readFileSync(path.join(PRESET_DIR, b.id + '.sql'), 'utf8') }))
}

// 주석(-- ..., /* .. */)을 지운 글자. 주석에 적힌 표 이름 때문에 기본 데이터가 들어가지 않게 한다.
function withoutComments(sql) {
  return String(sql).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
}

// SQL 안의 CREATE TABLE 표 이름들(소문자)
function tablesOf(sql) {
  const names = []
  const re = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([A-Za-z_][A-Za-z0-9_]*)/gi
  let m
  const text = withoutComments(sql)
  while ((m = re.exec(text)) !== null) names.push(m[1].toLowerCase())
  return [...new Set(names)]
}

function mentions(text, names) {
  return names.length > 0 && new RegExp('\\b(' + names.join('|') + ')\\b', 'i').test(text)
}

// 내장 원본이 만드는 표 이름들
const originalTables = (id) => tablesOf(fs.readFileSync(path.join(PRESET_DIR, id + '.sql'), 'utf8'))

// 사용자가 내장 묶음에 새 표를 더했을 때를 위해, 원본에 없고 다른 내장 묶음과도 겹치지 않는 추가 표 이름만 고른다.
function extraNames(preset) {
  const base = originalTables(preset.id)
  const others = new Set(BUILTIN.filter((b) => b.id !== preset.id).flatMap((b) => originalTables(b.id)))
  return tablesOf(preset.sql).filter((n) => !base.includes(n) && !others.has(n))
}

// 풀이(source)에 쓸 묶음을 고른다. list 는 [{ id, label, sql }] (사용자 묶음 먼저, 내장 묶음 뒤).
// 첫머리 주석 `-- @data: school|shop|dbms|이름|none` 으로 직접 고를 수도 있다(여러 개는 쉼표로, none 은 기본 데이터 없음).
// 자동 선택에서는 앞 묶음과 표 이름이 겹치는 뒷 묶음은 넣지 않는다(같은 이름 표를 두 번 만들 수 없다).
function pickPresets(source, list) {
  const all = (list || builtinList()).map((p) => ({ ...p, name: p.id }))
  const directive = /--\s*@data\s*:\s*([\w,\s]+)/i.exec(String(source))
  if (directive) {
    const wanted = directive[1].toLowerCase().split(/[\s,]+/).filter(Boolean)
    return all.filter((p) => wanted.includes(p.id.toLowerCase()))
  }
  const text = withoutComments(source)
  const dbmsHit = /\b(STUDENT|DEPT)\b/.test(text) && !/\b(course|enroll)\b/i.test(text)
  const chosen = []
  const taken = new Set()
  for (const p of all) {
    let hit
    if (p.id === 'dbms') hit = dbmsHit || mentions(text, extraNames(p))
    else if (p.id === 'school') hit = (!dbmsHit && /\b(student|course|enroll)\b/i.test(text)) || mentions(text, extraNames(p))
    else if (p.id === 'shop') hit = /\b(customers|products|orders|order_items)\b/i.test(text) || mentions(text, extraNames(p))
    else hit = mentions(text, tablesOf(p.sql))
    if (!hit) continue
    const mine = tablesOf(p.sql)
    if (mine.some((n) => taken.has(n))) continue
    mine.forEach((n) => taken.add(n))
    chosen.push(p)
  }
  return chosen
}

// job: { source, fileName, mode, dir, kind, cases }, tools: { node() -> { node, version }, sqlPresets?() -> [{ id, label, sql }] }
function prepare(job, tools) {
  const node = tools.node()
  const script = fs.readFileSync(path.join(__dirname, 'sql-script.cjs'), 'utf8')
  const file = path.join(job.dir, job.fileName)
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  const list = typeof tools.sqlPresets === 'function' ? tools.sqlPresets() : builtinList()
  const presets = pickPresets(job.source, list)
  const writes = [
    { name: job.fileName, content: job.source },
    { name: SCRIPT_NAME, content: script },
  ]
  const args = ['--no-warnings', path.join(job.dir, SCRIPT_NAME), file]
  if (job.mode === 'compile') args.push('--check')
  for (const p of presets) {
    const presetFile = 'ar-preset-' + p.id + '.sql'
    writes.push({ name: presetFile, content: p.sql })
    args.push('--preset', path.join(job.dir, presetFile))
  }
  return {
    writes,
    steps: [{ phase: job.mode === 'compile' ? 'compile' : 'run', cmd: node.node, args, env }],
    // 입력 탭은 추가 준비 SQL 을 받는 용도라 실시간 입력 모드를 쓰지 않는다.
    noInteractive: true,
    toolVersion: 'SQLite (' + node.version + ')' + (presets.length ? ' · 기본 데이터: ' + presets.map((p) => p.label.replace(/ \(.*\)$/, '')).join(', ') : ''),
  }
}

module.exports = { language: 'sql', prepare, pickPresets, builtinList, tablesOf, BUILTIN }
