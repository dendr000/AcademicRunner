// Copyright (c) dendr000. MIT License.
// C / C++ 러너: 임시 폴더에 파일을 쓰고 gcc(g++) 또는 clang 으로 컴파일해 실행한다. 문제 폴더에는 실행 파일이 생기지 않는다.
// 컴파일 확인은 문법 검사(-fsyntax-only)다. 함수 문제(Solution)는 main 이 없어 케이스 시험을 아직 지원하지 않는다.
const path = require('node:path')

const INSTALL_HINT = 'PC 에 C/C++ 컴파일러(gcc, g++ 또는 clang)가 없습니다. 설치 방법 예: 관리자 권한 없이 PowerShell 에서 "winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT" 를 실행한 뒤 앱을 다시 켜세요. (MSYS2 의 mingw-w64 gcc 도 됩니다)'

// language: 'c' | 'cpp'
function createRunner(language) {
  const isCpp = language === 'cpp'

  // job: { source, fileName, mode, dir, kind, cases }, tools: { c() / cpp() -> { cmd, version } | null }
  function prepare(job, tools) {
    const compiler = isCpp ? tools.cpp() : tools.c()
    if (!compiler) return { error: 'TOOL_MISSING', message: INSTALL_HINT }
    const sourcePath = path.join(job.dir, job.fileName)
    const std = isCpp ? '-std=c++17' : '-std=c17'
    // 소스와 실행 글자를 UTF-8 로 맞춘다(한글 출력). -lm: 수학 함수.
    const common = [std, '-O1', '-Wall', '-finput-charset=UTF-8', '-fexec-charset=UTF-8']
    const writes = [{ name: job.fileName, content: job.source }]

    if (job.mode === 'compile') {
      return { writes, steps: [{ phase: 'compile', cmd: compiler.cmd, args: [...common, '-fsyntax-only', sourcePath] }], toolVersion: compiler.version }
    }
    if (job.kind === 'function') {
      return { error: 'NOT_SUPPORTED', message: (isCpp ? 'C++' : 'C') + ' 함수 문제(Solution)는 main 이 없어 케이스 시험을 아직 지원하지 않습니다. 컴파일 확인(F6)만 가능합니다.' }
    }
    const exe = path.join(job.dir, 'main.exe')
    return {
      writes,
      steps: [
        { phase: 'compile', cmd: compiler.cmd, args: [...common, '-o', exe, sourcePath, '-lm'] },
        { phase: 'run', cmd: exe, args: [] },
      ],
      toolVersion: compiler.version,
    }
  }

  return { language, prepare }
}

module.exports = { createRunner, INSTALL_HINT }
