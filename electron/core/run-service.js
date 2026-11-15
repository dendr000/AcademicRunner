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
const { codeHash } = require('./code-hash')
const { compareJson, lastLine } = require('./json-compare')

const COMPILE_TIMEOUT_MS = 30000
// 실시간 입력 실행은 사람이 생각하는 시간이 있으므로 "마지막 입력 뒤" 5분까지 기다린다(그 전에 멈추려면 중지 버튼).
const INTERACTIVE_IDLE_MS = 5 * 60 * 1000

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
    let liveProc = null // 실시간 입력을 받는 실행 프로세스(interactive)
    let stoppedEarly = false
    const emit = (event) => {
      if (onEvent) onEvent(event)
    }

    let ranHash = ''
    const done = (async () => {
      const read = solutionFiles.readSolution(request.root, request.problemId, request.fileName)
      if (!read.ok) return prepareFailure(read.error, '풀이 파일을 읽을 수 없습니다 (' + read.error + ')')
      ranHash = codeHash(read.content)

      const language = languageOf(request.fileName)
      const runner = deps.runners[language]
      if (!runner) return prepareFailure('UNSUPPORTED', '아직 지원하지 않는 언어입니다 (' + language + ')')
      const withCases = Array.isArray(request.cases)
      const mode = request.mode === 'compile' ? 'compile' : 'run'
      const kind = kindOf(request.fileName)
      // 실시간 입력은 입출력 문제를 한 번 실행할 때만 쓴다(케이스 실행은 입력이 정해져 있다).
      const interactive = request.interactive === true && mode === 'run' && kind === 'io' && !withCases
      if (mode === 'run' && kind !== 'io' && !withCases) {
        return prepareFailure('NOT_IO_PROBLEM', '함수 작성 문제는 입력을 읽지 않아 단독 실행할 수 없습니다. 케이스 탭에서 케이스(인수와 기대 반환값)를 만든 뒤 "전부 실행(F7)"을 누르세요. 컴파일 확인(F6)은 가능합니다.')
      }
      if (withCases && request.cases.length === 0) return prepareFailure('NO_CASES', '실행할 케이스가 없습니다')

      let dir
      try {
        dir = fs.mkdtempSync(path.join(tmpBase, 'ar-run-'))
      } catch (e) {
        return prepareFailure('TMP_FAILED', '임시 폴더를 만들 수 없습니다 (' + (e.code || e.message) + ')')
      }

      try {
        const prepared = runner.prepare({ source: read.content, fileName: request.fileName, mode, dir, kind, cases: withCases ? request.cases : undefined }, deps.tools)
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
            interactive: streaming && step.phase === 'run' && interactive,
            timeoutMs:
              step.phase === 'run' ? (interactive ? INTERACTIVE_IDLE_MS : request.timeoutMs || DEFAULT_TIMEOUT_MS) : COMPILE_TIMEOUT_MS,
            onOutput: streaming ? (stream, text) => emit({ type: 'output', phase: step.phase, stream, text: clean(text) }) : undefined,
          })
          current = proc
          if (step.phase === 'run' && interactive) liveProc = proc
          const result = await proc.done
          current = null
          liveProc = null
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
            // 러너가 케이스마다 인수·입력을 따로 정하면(Java 함수 문제: 케이스 번호) 그것을 쓴다.
            const spec = step.perCase ? step.perCase(c, i) : null
            const r = await exec(spec ? { ...step, args: spec.args } : step, spec && spec.input !== undefined ? spec.input : c.input || '', false)
            const result = classifyCase(c, r, clean, kind)
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
    })().then((r) => (r && typeof r === 'object' ? { ...r, codeHash: ranHash } : r))

    return {
      done,
      stop() {
        stoppedEarly = true
        if (current) current.stop()
      },
      write: (text) => (liveProc ? liveProc.write(text) : false),
      endInput: () => (liveProc ? liveProc.endInput() : false),
    }
  }

  return { start }
}

// 케이스 하나의 실행 결과를 pass / fail / timeout / error / truncated / stopped 로 분류한다.
function classifyCase(c, r, clean, kind) {
  const base = { id: c.id, exitCode: r.code, durationMs: r.durationMs, stdout: r.stdout, stderr: clean(r.stderr) }
  if (r.stopped) return { ...base, status: 'stopped' }
  if (r.timedOut) return { ...base, status: 'timeout' }
  if (r.truncated) return { ...base, status: 'truncated' }
  if (r.spawnError || r.code !== 0) return { ...base, status: 'error', spawnError: r.spawnError }
  if (kind === 'function') {
    // 함수 문제: 마지막 줄이 반환값(JSON). 값으로 비교한다(공백·키 순서·1 과 1.0 은 같다).
    const line = lastLine(r.stdout)
    if (line === '') return { ...base, status: 'error', message: '반환값이 출력되지 않았습니다' }
    const cmp = compareJson(c.expected, line)
    if (cmp.pass) return { ...base, status: 'pass' }
    return { ...base, status: 'fail', diff: { value: true, expected: cmp.expectedText, actual: cmp.actualText, error: cmp.error } }
  }
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
