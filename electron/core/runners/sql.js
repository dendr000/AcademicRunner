// Copyright (c) dendr000. MIT License.
// SQL 러너: 앱에 들어 있는 Node 의 내장 SQLite(메모리 DB)로 풀이 .sql 을 실행한다. 따로 DB 설치가 필요 없다.
// 시험용 표와 데이터는 입력 탭(또는 케이스의 입력)에 CREATE TABLE / INSERT 문으로 적는다. 결과는 탭으로 구분한 표로 나온다.
// 컴파일 확인은 문법만 보기 위해 빈 DB 에서 문장을 prepare 만 해 본다(표가 없으면 "no such table" 이 나오므로 실행으로 확인한다).
const fs = require('node:fs')
const path = require('node:path')

const SCRIPT_NAME = 'ar-sql-run.cjs'

// job: { source, fileName, mode, dir, kind, cases }, tools: { node() -> { node, version } }
function prepare(job, tools) {
  const node = tools.node()
  const script = fs.readFileSync(path.join(__dirname, 'sql-script.cjs'), 'utf8')
  const file = path.join(job.dir, job.fileName)
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  return {
    writes: [
      { name: job.fileName, content: job.source },
      { name: SCRIPT_NAME, content: script },
    ],
    steps: [{ phase: job.mode === 'compile' ? 'compile' : 'run', cmd: node.node, args: ['--no-warnings', path.join(job.dir, SCRIPT_NAME), file, ...(job.mode === 'compile' ? ['--check'] : [])], env }],
    // 입력 탭은 준비 SQL 을 받는 용도라 실시간 입력 모드를 쓰지 않는다.
    noInteractive: true,
    toolVersion: 'SQLite (' + node.version + ')',
  }
}

module.exports = { language: 'sql', prepare }
