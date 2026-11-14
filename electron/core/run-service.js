// Copyright (c) dendr000. MIT License.
// 풀이 파일 하나를 임시 폴더에서 컴파일·실행하고 결과를 돌려준다.
//   1) 풀이 파일을 안전하게 읽는다(solution-files)  2) 러너가 만든 단계(컴파일 -> 실행)를 차례로 실행
//   3) 끝나면 임시 폴더를 지운다. 문제 폴더에는 아무것도 쓰지 않는다.
// request.cases 가 있으면 컴파일은 한 번만 하고 케이스마다 실행해 기대 출력과 비교한다.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const solutionFiles = require('./solution-files')
const { startProcess, DEFAULT_TIMEOUT_MS } = require('./process-runner')
const { languageOf, kindOf } = require('./scanner')
const { compareOutput } = require('./output-compare')

const COMPILE_TIMEOUT_MS = 30000

function prepareFailure(error, message, extra) {
  return { ok: false, phase: 'prepare', error, message, ...extra }
}

// deps: { runners: { [language]: runner }, tools, tmpBase }
function createRunService(deps) {
  const tmpBase = deps.tmpBase || os.tmpdir()

  // request: { root, problemId, fileName, mode: 'run' | 'compile', input, timeoutMs, cases?: [{ id, input, expected }] }
  // onEvent: { type: 'phase', phase } | { type: 'output', phase, stream, text }
  //        | { type: 'case-start', index, id } | { type: 'case-done', index, id, result }
  // 반환: { stop(), done: Promise<result> }
  //   일반 result: { ok, phase, error?, message?, exitCode, timedOut, truncated, stopped, durationMs, stdout, stderr, compileOutput, toolVersion }
  //   케이스 result: { ok, phase: 'cases', passed, total, caseResults: [...], compileOutput, toolVersion }
  function start(request, onEvent) {
    let current = null
    let stoppedEarly = false
    const emit = (event) => {
      if (onEvent) onEvent(event)
    }

    const done = (async () => {
      const read = solutionFiles.readSolution(request.root, request.problemId, request.fileName)
      if (!read.ok) return prepareFailure(read.error, '풀이 파일을 읽을 수 없습니다 (' + read.error + ')')

      const language = languageOf(request.fileName)
      const runner = deps.runners[language]
      if (!runner) return prepareFailure('UNSUPPORTED', '아직 지원하지 않는 언어입니다 (' + language + ')')
      const withCases = Array.isArray(request.cases)
      const mode = request.mode === 'compile' ? 'compile' : 'run'
      if (mode === 'run' && kindOf(request.fileName) !== 'io') {
        return prepareFailure('NOT_IO_PROBLEM', '함수 작성 문제는 아직 실행할 수 없습니다(시험 케이스 단계에서 지원). 컴파일 확인은 가능합니다.')
      }
      if (withCases && request.cases.length === 0) return prepareFailure('NO_CASES', '실행할 케이스가 없습니다')

      let dir
      try {
        dir = fs.mkdtempSync(path.join(tmpBase, 'ar-run-'))
      } catch (e) {
        return prepareFailure('TMP_FAILED', '임시 폴더를 만들 수 없습니다 (' + (e.code || e.message) + ')')
      }

      try {
        const prepared = runner.prepare({ source: read.content, fileName: request.fileName, mode, dir }, deps.tools)
        if (prepared.error) return prepareFailure(prepared.error, prepared.message)
        // 오류 메시지에 임시 폴더 경로가 길게 나오지 않게 파일 이름만 남긴다.
        const clean = (text) => text.split(dir + path.sep).join('')
        for (const w of prepared.writes) fs.writeFileSync(path.join(dir, w.name), w.content, 'utf8')

        const exec = async (step, input, streaming) => {
          const proc = startProcess({
            cmd: step.cmd,
            args: step.args,
            cwd: dir,
            env: step.env,
            input,
            timeoutMs: step.phase === 'run' ? request.timeoutMs || DEFAULT_TIMEOUT_MS : COMPILE_TIMEOUT_MS,
            onOutput: streaming ? (stream, text) => emit({ type: 'output', phase: step.phase, stream, text: clean(text) }) : undefined,
          })
          current = proc
          const result = await proc.done
          current = null
          return result
        }
        const isFailure = (r) => r.spawnError || r.code !== 0 || r.timedOut || r.truncated || r.stopped

        // 1) 컴파일 등 준비 단계(run 이 아닌 단계)
        let compileOutput = ''
        let last = null
        const runStep = prepared.steps.find((s) => s.phase === 'run')
        for (const step of prepared.steps) {
          if (step.phase === 'run') continue
          if (stoppedEarly) break
          emit({ type: 'phase', phase: step.phase })
          last = await exec(step, '', true)
          compileOutput = clean((last.stderr + last.stdout).trim())
          if (isFailure(last)) return finalResult(step.phase, last, compileOutput, prepared, false)
        }
        if (stoppedEarly) return { ok: false, phase: 'prepare', error: 'STOPPED', message: '중지했습니다', stopped: true, stdout: '', stderr: '' }

        // 2) 케이스 전체 실행
        if (withCases && runStep) return await runCases(runStep, compileOutput, prepared)

        // 3) 한 번 실행
        if (runStep) {
          emit({ type: 'phase', phase: 'run' })
          last = await exec(runStep, request.input, true)
          return finalResult('run', last, compileOutput, prepared, !isFailure(last))
        }
        return finalResult(prepared.steps[prepared.steps.length - 1].phase, last, compileOutput, prepared, true)

        async function runCases(step, compiled, prep) {
          emit({ type: 'phase', phase: 'run' })
          const caseResults = []
          for (let i = 0; i < request.cases.length; i++) {
            const c = request.cases[i]
            if (stoppedEarly) {
              caseResults.push({ id: c.id, status: 'skipped' })
              continue
            }
            emit({ type: 'case-start', index: i, id: c.id })
            const r = await exec(step, c.input || '', false)
            const result = classifyCase(c, r, clean)
            caseResults.push(result)
            emit({ type: 'case-done', index: i, id: c.id, result })
          }
          const passed = caseResults.filter((r) => r.status === 'pass').length
          return {
            ok: passed === caseResults.length,
            phase: 'cases',
            passed,
            total: caseResults.length,
            stopped: stoppedEarly,
            caseResults,
            compileOutput: compiled,
            toolVersion: prep.toolVersion,
          }
        }
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

// 케이스 하나의 실행 결과를 pass / fail / timeout / error / truncated / stopped 로 분류한다.
function classifyCase(c, r, clean) {
  const base = { id: c.id, exitCode: r.code, durationMs: r.durationMs, stdout: r.stdout, stderr: clean(r.stderr) }
  if (r.stopped) return { ...base, status: 'stopped' }
  if (r.timedOut) return { ...base, status: 'timeout' }
  if (r.truncated) return { ...base, status: 'truncated' }
  if (r.spawnError || r.code !== 0) return { ...base, status: 'error', spawnError: r.spawnError }
  const diff = compareOutput(c.expected, r.stdout)
  return diff.pass ? { ...base, status: 'pass' } : { ...base, status: 'fail', diff }
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
