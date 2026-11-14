// Copyright (c) dendr000. MIT License.
// 함수 문제의 기대 반환값(JSON 글자)과 실제 반환값(JSON 글자)을 값으로 비교한다.
//   - 공백, 키 순서, 정수/실수 표기(1 과 1.0)는 같은 값으로 본다.
//   - 소수는 상대 오차 1e-9 안이면 같은 값으로 본다.

const TOLERANCE = 1e-9

function sameNumber(a, b) {
  if (a === b) return true
  return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b))
}

function deepEqual(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return sameNumber(a, b)
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

// 프로그램 출력에서 반환값 줄을 고른다: 마지막 비어 있지 않은 줄. (풀이가 디버그 출력을 섞어도 하니스는 마지막 줄에 결과를 쓴다)
function lastLine(stdout) {
  const lines = String(stdout || '').replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
  return lines.length > 0 ? lines[lines.length - 1].trim() : ''
}

// 반환: { pass, expectedText, actualText, error? }  error: 'BAD_EXPECTED' | 'BAD_ACTUAL'
function compareJson(expectedText, actualText) {
  let expected
  try {
    expected = JSON.parse(String(expectedText).trim() === '' ? 'null' : expectedText)
  } catch {
    return { pass: false, error: 'BAD_EXPECTED', expectedText: String(expectedText), actualText }
  }
  let actual
  try {
    actual = JSON.parse(actualText)
  } catch {
    return { pass: false, error: 'BAD_ACTUAL', expectedText: JSON.stringify(expected), actualText }
  }
  return { pass: deepEqual(expected, actual), expectedText: JSON.stringify(expected), actualText: JSON.stringify(actual) }
}

module.exports = { compareJson, deepEqual, lastLine }
