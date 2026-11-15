// Copyright (c) dendr000. MIT License.
// 폰 접속(내장 웹 서버)의 보안 부품: 접속 주소 검사, 토큰 생성·비교, 틀린 토큰 횟수 제한. 서버·화면을 몰라서 시험할 수 있다.
const crypto = require('node:crypto')

// 같은 네트워크(사설 주소)에서 온 요청만 허용한다: 127.x(내 PC), 10.x, 172.16~31.x, 192.168.x, 100.64~127.x(Tailscale), IPv6 로컬(::1, fc00::/7, fe80::/10).
function isPrivateAddress(address) {
  if (typeof address !== 'string' || address === '') return false
  let a = address.toLowerCase()
  if (a.startsWith('::ffff:')) a = a.slice(7) // IPv4 를 IPv6 모양으로 감싼 것
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(a)
  if (v4) {
    const [o1, o2, o3, o4] = v4.slice(1).map(Number)
    if ([o1, o2, o3, o4].some((n) => n > 255)) return false
    return o1 === 127 || o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) || (o1 === 100 && o2 >= 64 && o2 <= 127)
  }
  if (a === '::1') return true
  return /^f[cd][0-9a-f]{2}:/.test(a) || /^fe[89ab][0-9a-f]:/.test(a)
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex')
}

// 토큰 비교는 걸리는 시간으로 값을 짐작하지 못하게 일정 시간 비교를 쓴다.
function tokensMatch(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || expected === '') return false
  const a = crypto.createHash('sha256').update(given).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

// "Authorization: Bearer <token>" 에서 토큰만 뽑는다. 모양이 다르면 ''.
function bearerToken(header) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{8,200})$/.exec(typeof header === 'string' ? header : '')
  return m ? m[1] : ''
}

// 주소(ip)마다 windowMs 안에 max 번 실패하면 그 시간 동안 막는다.
function createFailureLimiter({ max, windowMs, now }) {
  const clock = now || (() => Date.now())
  const failures = new Map() // ip -> [시각...]
  function recent(ip) {
    const t = clock()
    const list = (failures.get(ip) || []).filter((x) => t - x < windowMs)
    if (list.length === 0) failures.delete(ip)
    else failures.set(ip, list)
    return list
  }
  return {
    isBlocked: (ip) => recent(ip).length >= max,
    fail(ip) {
      const list = recent(ip)
      list.push(clock())
      failures.set(ip, list)
    },
    reset: (ip) => failures.delete(ip),
  }
}

module.exports = { isPrivateAddress, generateToken, tokensMatch, bearerToken, createFailureLimiter }
