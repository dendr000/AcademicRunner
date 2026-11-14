// Copyright (c) dendr000. MIT License.
// 외부 프로그램(javac, java, python 등)을 한 번 실행하고 결과를 모은다.
//   - 시간 제한, 출력 크기 상한, 중지(프로세스 트리 전체 종료)를 지킨다.
//   - 입력은 Buffer 로 직접 넣는다(PowerShell 파이프처럼 BOM 이 붙지 않는다).
//   - 출력은 UTF-8 로 읽고, 글자가 청크 경계에서 깨지지 않게 StringDecoder 를 쓴다.
const { spawn } = require('node:child_process')
const { StringDecoder } = require('node:string_decoder')

const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_MAX_BYTES = 1024 * 1024

function killTree(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    // /T: 자식 프로세스까지, /F: 강제. java 가 띄운 하위 프로세스가 남지 않게 한다.
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    killer.on('error', () => child.kill())
  } else {
    child.kill('SIGKILL')
  }
}

// options: { cmd, args, cwd, env, input, timeoutMs, maxBytes, onOutput(stream, text) }
// 반환: { done: Promise<result>, stop() }
// result: { code, timedOut, truncated, stopped, durationMs, stdout, stderr, spawnError }
function startProcess(options) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES
  const startedAt = Date.now()
  let timedOut = false
  let truncated = false
  let stopped = false
  let totalBytes = 0
  let stdout = ''
  let stderr = ''
  let child = null
  let timer = null

  const done = new Promise((resolve) => {
    let finished = false
    const finish = (code, spawnError) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve({ code, timedOut, truncated, stopped, durationMs: Date.now() - startedAt, stdout, stderr, spawnError })
    }

    try {
      child = spawn(options.cmd, options.args || [], {
        cwd: options.cwd,
        env: options.env || process.env,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (e) {
      finish(null, e.code || String(e.message || e))
      return
    }

    const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') }
    const onData = (stream) => (chunk) => {
      if (truncated) return
      let data = chunk
      if (totalBytes + data.length > maxBytes) {
        data = data.subarray(0, Math.max(0, maxBytes - totalBytes))
        truncated = true
      }
      totalBytes += data.length
      const text = decoders[stream].write(data)
      if (stream === 'stdout') stdout += text
      else stderr += text
      if (text && options.onOutput) options.onOutput(stream, text)
      if (truncated) killTree(child)
    }
    child.stdout.on('data', onData('stdout'))
    child.stderr.on('data', onData('stderr'))

    child.on('error', (e) => finish(null, e.code || String(e.message || e)))
    child.on('close', (code) => {
      for (const stream of ['stdout', 'stderr']) {
        const rest = decoders[stream].end()
        if (rest) {
          if (stream === 'stdout') stdout += rest
          else stderr += rest
          if (options.onOutput) options.onOutput(stream, rest)
        }
      }
      finish(code)
    })

    // 입력을 다 읽지 않고 끝나는 프로그램에서 EPIPE 가 나도 앱이 죽지 않게 한다.
    child.stdin.on('error', () => {})
    const input = options.input
    child.stdin.end(typeof input === 'string' && input !== '' ? Buffer.from(input, 'utf8') : undefined)

    timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, timeoutMs)
  })

  return {
    done,
    stop() {
      stopped = true
      if (child) killTree(child)
    },
  }
}

module.exports = { startProcess, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_BYTES }
