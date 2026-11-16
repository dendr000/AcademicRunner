// Copyright (c) dendr000. MIT License.
// SQL 러너: 앱에 들어 있는 Node 의 내장 SQLite(메모리 DB)로 풀이 .sql 을 실행한다. 따로 DB 설치가 필요 없다.
// 기본 데이터: 풀이가 학원 사이트의 표(student/course/enroll, customers/products/orders/order_items)를 쓰면
//   그 표와 데이터를 미리 만들어 둔다. 그래서 SELECT 문만 적어도 바로 실행된다.
// 추가 데이터: 입력 탭(또는 케이스의 입력)에 CREATE TABLE / INSERT 문을 적으면 기본 데이터 위에 더해서 먼저 실행한다.
//   단 풀이 파일이나 입력에 CREATE TABLE 이 있으면 직접 표를 만드는 것으로 보고 기본 데이터는 넣지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const SCRIPT_NAME = 'ar-sql-run.cjs'

// 표 이름이 풀이에 나오면 해당 기본 데이터를 쓴다.
//   school: 사이트 SQL Lv0 (student, course, enroll)   shop: 사이트 SQL Lv1~5 (customers, products, orders, order_items)
//   dbms: 사이트 DBMS 이론 점검의 참고 테이블 (STUDENT, DEPT 대문자). school 의 student 와 열이 달라 함께 넣지 않는다.
// 첫머리 주석 `-- @data: school|shop|dbms|none` 으로 직접 고를 수도 있다(여러 개는 쉼표로, none 은 기본 데이터 없음).
const PRESETS = [
  { name: 'school', label: '학생·과목·수강' },
  { name: 'shop', label: '고객·상품·주문' },
  { name: 'dbms', label: 'DBMS 이론 STUDENT·DEPT' },
]

// 주석(-- ..., /* .. */)을 지운 글자. 주석에 적힌 표 이름 때문에 기본 데이터가 들어가지 않게 한다.
function withoutComments(sql) {
  return String(sql).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
}

function pickPresets(source) {
  const directive = /--\s*@data\s*:\s*([\w,\s]+)/i.exec(String(source))
  if (directive) {
    const wanted = directive[1].toLowerCase().split(/[\s,]+/).filter(Boolean)
    return PRESETS.filter((p) => wanted.includes(p.name))
  }
  const text = withoutComments(source)
  const dbms = /\b(STUDENT|DEPT)\b/.test(text) && !/\b(course|enroll)\b/i.test(text)
  const school = !dbms && /\b(student|course|enroll)\b/i.test(text)
  const shop = /\b(customers|products|orders|order_items)\b/i.test(text)
  const use = { dbms, school, shop }
  return PRESETS.filter((p) => use[p.name])
}

// job: { source, fileName, mode, dir, kind, cases }, tools: { node() -> { node, version } }
function prepare(job, tools) {
  const node = tools.node()
  const script = fs.readFileSync(path.join(__dirname, 'sql-script.cjs'), 'utf8')
  const file = path.join(job.dir, job.fileName)
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  const presets = pickPresets(job.source)
  const writes = [
    { name: job.fileName, content: job.source },
    { name: SCRIPT_NAME, content: script },
  ]
  const args = ['--no-warnings', path.join(job.dir, SCRIPT_NAME), file]
  if (job.mode === 'compile') args.push('--check')
  for (const p of presets) {
    const presetFile = 'ar-preset-' + p.name + '.sql'
    writes.push({ name: presetFile, content: fs.readFileSync(path.join(__dirname, 'sql-presets', p.name + '.sql'), 'utf8') })
    args.push('--preset', path.join(job.dir, presetFile))
  }
  return {
    writes,
    steps: [{ phase: job.mode === 'compile' ? 'compile' : 'run', cmd: node.node, args, env }],
    // 입력 탭은 추가 준비 SQL 을 받는 용도라 실시간 입력 모드를 쓰지 않는다.
    noInteractive: true,
    toolVersion: 'SQLite (' + node.version + ')' + (presets.length ? ' · 기본 데이터: ' + presets.map((p) => p.label).join(', ') : ''),
  }
}

module.exports = { language: 'sql', prepare, pickPresets, PRESETS }
