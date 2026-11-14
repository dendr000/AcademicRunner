// Copyright (c) dendr000. MIT License.
// Python 러너: 임시 폴더에 파일을 쓰고 python 으로 실행한다. 컴파일 확인은 문법 검사(py_compile)다.
const path = require('node:path')

// job: { source, fileName, mode, dir }, tools: { python() -> { python, args, version } | null }
function prepare(job, tools) {
  const py = tools.python()
  if (!py) {
    return { error: 'TOOL_MISSING', message: 'Python 3 을 찾을 수 없습니다. Python 을 설치하고 PATH 를 확인하세요.' }
  }
  const file = path.join(job.dir, job.fileName)
  // UTF-8 모드(-X utf8)와 비버퍼(-u): 한글 입출력이 깨지지 않고 출력이 바로 보인다.
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' }
  const base = [...py.args, '-X', 'utf8']
  const steps =
    job.mode === 'compile'
      ? [{ phase: 'compile', cmd: py.python, args: [...base, '-m', 'py_compile', file], env }]
      : [{ phase: 'run', cmd: py.python, args: [...base, '-u', file], env }]
  return { writes: [{ name: job.fileName, content: job.source }], steps, toolVersion: py.version }
}

module.exports = { language: 'python', prepare }
