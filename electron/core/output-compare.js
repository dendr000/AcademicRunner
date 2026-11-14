// Copyright (c) dendr000. MIT License.
// 기대 출력과 실제 출력을 비교한다. 채점 사이트처럼 줄 끝 공백과 끝의 빈 줄은 무시한다.
//   - 줄바꿈 CRLF/LF 차이 무시
//   - 각 줄 오른쪽 공백 무시
//   - 맨 끝의 빈 줄 무시
// 줄 안의 공백 개수와 대소문자는 구분한다(출력 형식도 문제의 일부이므로).

function normalize(text) {
  const lines = String(text === undefined || text === null ? '' : text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

// 반환: { pass: true } 또는 { pass: false, line, expected, actual }
// line 은 1부터 세는 처음 달라진 줄 번호, 한쪽이 먼저 끝났으면 없는 쪽은 null.
function compareOutput(expected, actual) {
  const e = normalize(expected)
  const a = normalize(actual)
  const max = Math.max(e.length, a.length)
  for (let i = 0; i < max; i++) {
    const ev = i < e.length ? e[i] : null
    const av = i < a.length ? a[i] : null
    if (ev !== av) return { pass: false, line: i + 1, expected: ev, actual: av }
  }
  return { pass: true }
}

module.exports = { compareOutput, normalize }
