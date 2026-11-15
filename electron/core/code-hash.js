// Copyright (c) dendr000. MIT License.
// 코드가 "같은가"를 줄바꿈(CRLF/LF), 줄 끝 공백, 끝의 빈 줄과 상관없이 비교하기 위한 정규화와 짧은 해시.
// 진행 현황에서 "시작 코드와 같은가", "통과했을 때와 같은 코드인가"를 판단하는 데 쓴다.
const crypto = require('node:crypto')

function normalizeCode(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
}

function codeHash(text) {
  return crypto.createHash('sha1').update(normalizeCode(text), 'utf8').digest('hex').slice(0, 16)
}

module.exports = { normalizeCode, codeHash }
