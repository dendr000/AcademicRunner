// Copyright (c) dendr000. MIT License.
// JavaScript 러너: 앱에 들어 있는 Node(Electron 을 ELECTRON_RUN_AS_NODE 로 실행)로 돌린다. 따로 Node 설치가 필요 없다.
// 컴파일 확인은 문법 검사(node --check)다.
const path = require('node:path')

// job: { source, fileName, mode, dir }, tools: { node() -> { node, version } }
function prepare(job, tools) {
  const node = tools.node()
  const file = path.join(job.dir, job.fileName)
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  const steps =
    job.mode === 'compile'
      ? [{ phase: 'compile', cmd: node.node, args: ['--check', file], env }]
      : [{ phase: 'run', cmd: node.node, args: [file], env }]
  return { writes: [{ name: job.fileName, content: job.source }], steps, toolVersion: node.version }
}

module.exports = { language: 'javascript', prepare }
