// Copyright (c) dendr000. MIT License.
// Python 러너: 임시 폴더에 파일을 쓰고 python 으로 실행한다. 컴파일 확인은 문법 검사(py_compile)다.
// 함수 문제(Solution)는 풀이 뒤에 호출 코드를 이어 붙여 실행한다(인수는 표준 입력의 JSON 배열, 결과는 JSON 한 줄).
const path = require('node:path')

const HARNESS = `

import json as __ar_json, sys as __ar_sys
__ar_args = __ar_json.loads(__ar_sys.stdin.read() or "[]")
print()
print(__ar_json.dumps(solution(*__ar_args), ensure_ascii=False, default=lambda o: list(o) if isinstance(o, (set, frozenset, tuple)) else str(o)))
`

// job: { source, fileName, mode, dir, kind, cases }, tools: { python() -> { python, args, version } | null }
function prepare(job, tools) {
  const py = tools.python()
  if (!py) {
    return { error: 'TOOL_MISSING', message: 'Python 3 을 찾을 수 없습니다. Python 을 설치하고 PATH 를 확인하세요.' }
  }
  const file = path.join(job.dir, job.fileName)
  // UTF-8 모드(-X utf8)와 비버퍼(-u): 한글 입출력이 깨지지 않고 출력이 바로 보인다.
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' }
  const base = [...py.args, '-X', 'utf8']
  if (job.mode === 'compile') {
    return {
      writes: [{ name: job.fileName, content: job.source }],
      steps: [{ phase: 'compile', cmd: py.python, args: [...base, '-m', 'py_compile', file], env }],
      toolVersion: py.version,
    }
  }
  const functionCases = job.kind === 'function' && Array.isArray(job.cases)
  const content = functionCases ? job.source + HARNESS : job.source
  return {
    writes: [{ name: job.fileName, content }],
    steps: [{ phase: 'run', cmd: py.python, args: [...base, '-u', file], env }],
    toolVersion: py.version,
  }
}

module.exports = { language: 'python', prepare }
