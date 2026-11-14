// Copyright (c) dendr000. MIT License.
// 풀이 파일 하나를 임시 폴더에서 컴파일·실행하고 결과를 돌려준다.
//   1) 풀이 파일을 안전하게 읽는다(solution-files)  2) 러너가 만든 단계(컴파일 -> 실행)를 차례로 실행
//   3) 끝나면 임시 폴더를 지운다. 문제 폴더에는 아무것도 쓰지 않는다.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const solutionFiles = require('./solution-files')
const { startProcess, DEFAULT_TIMEOUT_MS } = require('./process-runner')
const { languageOf, kindOf } = require('./scanner')

// deps: { runners: { [language]: runner }, tools, tmpBase }
function createRunService(deps) {
  const tmpBase = deps.tmpBase || os.tmpdir()

  // request: { root, problemId, fileName, mode: 'run' | 'compile', input, timeoutMs }
  // onEvent: ({ type: 'phase', phase } | { type: 'output', phase, stream, text })
  // 반환: { stop(), done: Promise<result> }
  //   result: { ok, phase, error?, message?, exitCode, timedOut, truncated, stopped, durationMs, stdout, stderr, toolVersion }
  function start(request, onEvent) {
    let current = null
    let stoppedEarly = false
    const emit = (event) => {
      if (onEvent) onEvent(event)
    }

    const done = (async () => {
      const read = solutionFiles.readSolution(request.root, request.problemId, request.fileName)
      if (!read.ok) return { ok: false, phase: 'prepare', error: read.error, message: '풀이 파일을 읽을 수 없습니다 (' + read.error + ')' }

      const language = languageOf(request.fileName)
      const runner = deps.runners[language]
      if (!runner) return { ok: false, phase: 'prepare', error: 'UNSUPPORTED', message: '아직 지원하지 않는 언어입니다 (' + language + ')' }
      const mode = request.mode === 'compile' ? 'compile' : 'run'
      if (mode === 'run' && kindOf(request.fileName) !== 'io') {
        return { ok: false, phase: 'prepare', error: 'NOT_IO_PROBLEM', message: '함수 작성 문제는 아직 실행할 수 없습니다(시험 케이스 단계에서 지원). 컴파일 확인은 가능합니다.' }
      }

      let dir
      try {
        dir = fs.mkdtempSync(path.join(tmpBase, 'ar-run-'))
      } catch (e) {
        return { ok: false, phase: 'prepare', error: 'TMP_FAILED', message: '임시 폴더를 만들 수 없습니다 (' + (e.code || e.message) + ')' }
      }

      try {
        const prepared = runner.prepare({ source: read.content, fileName: request.fileName, mode, dir }, deps.tools)
        if (prepared.error) return { ok: false, phase: 'prepare', error: prepared.error, message: prepared.message }
        // 오류 메시지에 임시 폴더 경로가 길게 나오지 않게 파일 이름만 남긴다.
        const clean = (text) => text.split(dir + path.sep).join('')
        for (const w of prepared.writes) fs.writeFileSync(path.join(dir, w.name), w.content, 'utf8')

        let compileOutput = ''
        let last = null
        for (const step of prepared.steps) {
          if (stoppedEarly) break
          emit({ type: 'phase', phase: step.phase })
          const proc = startProcess({
            cmd: step.cmd,
            args: step.args,
            cwd: dir,
            env: step.env,
            input: step.phase === 'run' ? request.input : '',
            timeoutMs: step.phase === 'run' ? request.timeoutMs || DEFAULT_TIMEOUT_MS : 30000,
            onOutput: (stream, text) => emit({ type: 'output', phase: step.phase, stream, text: clean(text) }),
          })
          current = proc
          last = await proc.done
          current = null
          if (step.phase === 'compile') compileOutput = clean((last.stderr + last.stdout).trim())
          const failed = last.spawnError || last.code !== 0 || last.timedOut || last.truncated || last.stopped
          if (failed) return finalResult(step.phase, last, compileOutput, prepared, false)
        }
        if (!last) return { ok: false, phase: 'prepare', error: 'STOPPED', message: '중지했습니다', stopped: true, stdout: '', stderr: '' }
        return finalResult(prepared.steps[prepared.steps.length - 1].phase, last, compileOutput, prepared, true)
      } finally {
        try {
          fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        } catch {
          // 임시 폴더 정리에 실패해도 결과에는 영향이 없다(다음 실행은 새 폴더를 쓴다).
        }
      }
    })()

    return {
      done,
      stop() {
        stoppedEarly = true
        if (current) current.stop()
      },
    }
  }

  return { start }
}

// stdout/stderr 는 마지막으로 실행한 단계의 것이다(컴파일 경고가 프로그램 출력에 섞이지 않게 compileOutput 은 따로 준다).
function finalResult(phase, last, compileOutput, prepared, ok) {
  return {
    ok,
    phase,
    exitCode: last.code,
    timedOut: last.timedOut,
    truncated: last.truncated,
    stopped: last.stopped,
    spawnError: last.spawnError,
    durationMs: last.durationMs,
    stdout: last.stdout,
    stderr: last.stderr,
    compileOutput,
    toolVersion: prepared.toolVersion,
  }
}

module.exports = { createRunService }
