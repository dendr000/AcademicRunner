// Copyright (c) dendr000. MIT License.
// JavaScript 러너: 앱에 들어 있는 Node(Electron 을 ELECTRON_RUN_AS_NODE 로 실행)로 돌린다. 따로 Node 설치가 필요 없다.
// 컴파일 확인은 문법 검사(node --check)다.
// 함수 문제(Solution)는 풀이 뒤에 호출 코드를 이어 붙여 실행한다(인수는 표준 입력의 JSON 배열, 결과는 JSON 한 줄).
const path = require('node:path')

const HARNESS = `

;(function () {
  const __arArgs = JSON.parse(require('fs').readFileSync(0, 'utf8') || '[]')
  const __arResult = solution(...__arArgs)
  console.log('')
  console.log(JSON.stringify(__arResult === undefined ? null : __arResult))
})()
`

// job: { source, fileName, mode, dir, kind, cases }, tools: { node() -> { node, version } }
function prepare(job, tools) {
  const node = tools.node()
  const file = path.join(job.dir, job.fileName)
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  if (job.mode === 'compile') {
    return {
      writes: [{ name: job.fileName, content: job.source }],
      steps: [{ phase: 'compile', cmd: node.node, args: ['--check', file], env }],
      toolVersion: node.version,
    }
  }
  const functionCases = job.kind === 'function' && Array.isArray(job.cases)
  const content = functionCases ? job.source + HARNESS : job.source
  return {
    writes: [{ name: job.fileName, content }],
    steps: [{ phase: 'run', cmd: node.node, args: [file], env }],
    toolVersion: node.version,
  }
}

module.exports = { language: 'javascript', prepare }
