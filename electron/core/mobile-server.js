// Copyright (c) dendr000. MIT License.
// 폰 브라우저용 읽기 전용 웹 서버. 문제 목록과 풀이 코드를 보여 주기만 하고 파일을 쓰거나 실행하지 않는다.
//   - GET/HEAD 만 허용, 같은 네트워크(사설 주소)에서 온 요청만 허용
//   - /api/* 는 토큰(Authorization: Bearer)이 맞아야 하고, 틀린 시도가 쌓이면 잠시 막는다
//   - 파일 읽기는 solution-files 가 경로를 검사한다(문제 폴더 밖은 못 읽음)
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const solutionFiles = require('./solution-files')
const { scanProblems } = require('./scanner')
const { progressAll } = require('./progress-status')
const { isPrivateAddress, tokensMatch, bearerToken, createFailureLimiter } = require('./mobile-auth')

const STATIC = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/m.css': { file: 'm.css', type: 'text/css; charset=utf-8' },
  '/m.js': { file: 'm.js', type: 'text/javascript; charset=utf-8' },
}
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

// deps: { getRoot(): 문제 폴더, getToken(): 접속 토큰, staticDir: 폰 화면 파일 폴더, isAllowedAddress?(ip) }
function createMobileServer(deps) {
  const allowed = deps.isAllowedAddress || isPrivateAddress
  const limiter = createFailureLimiter({ max: 10, windowMs: 60 * 1000 })
  let server = null

  function send(res, status, body, type, extra) {
    const data = typeof body === 'string' ? body : JSON.stringify(body)
    res.writeHead(status, {
      'Content-Type': type || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': CSP,
      ...extra,
    })
    res.end(data)
  }
  const json = (res, status, body) => send(res, status, body)

  function api(req, res, url, ip) {
    if (limiter.isBlocked(ip)) return json(res, 429, { ok: false, error: 'TOO_MANY_ATTEMPTS' })
    if (!tokensMatch(bearerToken(req.headers.authorization), deps.getToken())) {
      limiter.fail(ip)
      return json(res, 401, { ok: false, error: 'BAD_TOKEN' })
    }
    limiter.reset(ip)
    const root = deps.getRoot()
    if (url.pathname === '/api/problems') {
      const scan = scanProblems(root)
      if (!scan.ok) return json(res, 200, { ok: false, error: scan.error || 'SCAN_FAILED' })
      const levels = scan.levels.map((l) => ({
        level: l.level,
        label: l.label,
        problems: l.problems.map((p) => ({ id: p.id, number: p.number, title: p.title, kind: p.kind, files: p.files.map((f) => ({ name: f.name, language: f.language })) })),
      }))
      // 폰에는 "시작 코드에서 바뀌었는지"만 알려 준다(통과 기록은 PC 앱 화면 저장소에만 있다).
      const progress = progressAll(root)
      const edited = {}
      for (const [id, info] of Object.entries(progress)) edited[id] = info.edited === true
      return json(res, 200, { ok: true, levels, edited })
    }
    if (url.pathname === '/api/file') {
      const result = solutionFiles.readSolution(root, url.searchParams.get('problemId'), url.searchParams.get('fileName'))
      if (!result.ok) return json(res, 200, { ok: false, error: result.error })
      return json(res, 200, { ok: true, content: result.content })
    }
    return json(res, 404, { ok: false, error: 'NOT_FOUND' })
  }

  function handle(req, res) {
    const ip = req.socket.remoteAddress || ''
    if (!allowed(ip)) return send(res, 403, 'forbidden', 'text/plain; charset=utf-8')
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' })
    let url
    try {
      url = new URL(req.url, 'http://localhost')
    } catch {
      return send(res, 400, 'bad request', 'text/plain; charset=utf-8')
    }
    if (url.pathname.startsWith('/api/')) return api(req, res, url, ip)
    const item = STATIC[url.pathname]
    if (!item) return send(res, 404, 'not found', 'text/plain; charset=utf-8')
    let body
    try {
      body = fs.readFileSync(path.join(deps.staticDir, item.file), 'utf8')
    } catch {
      return send(res, 500, 'missing page', 'text/plain; charset=utf-8')
    }
    return send(res, 200, req.method === 'HEAD' ? '' : body, item.type)
  }

  return {
    // port 0 이면 빈 포트를 고른다. 반환: 실제 포트. 포트가 이미 쓰이면 reject.
    start(port) {
      return new Promise((resolve, reject) => {
        if (server) return resolve(server.address().port)
        const s = http.createServer(handle)
        s.once('error', reject)
        s.listen(port, '0.0.0.0', () => {
          s.removeListener('error', reject)
          server = s
          resolve(s.address().port)
        })
      })
    },
    stop() {
      return new Promise((resolve) => {
        if (!server) return resolve()
        const s = server
        server = null
        s.close(() => resolve())
        if (s.closeAllConnections) s.closeAllConnections()
      })
    },
    isRunning: () => server !== null,
  }
}

module.exports = { createMobileServer }
