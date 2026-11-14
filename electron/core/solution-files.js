// Copyright (c) dendr000. MIT License.
// 풀이 파일을 읽고 쓰는 유일한 통로. 화면에서 온 값(문제 id, 파일 이름)은 믿지 않고 모두 검사한다.
//   - 문제 id 는 "Lv숫자_이름/숫자_이름" 꼴만 허용, 파일 이름은 폴더 구분자 없이 알려진 확장자만 허용
//   - 결과 경로가 문제 루트 밖이면 거부(경로 조작 방지)
//   - 시작 코드(original 폴더)는 읽기만 하고 절대 쓰지 않는다
const fs = require('node:fs')
const path = require('node:path')
const { languageOf } = require('./scanner')

const LEVEL_RE = /^Lv\d+_.+$/
const PROBLEM_RE = /^\d+_.+$/
const ORIGINAL_FOLDER = 'original'
const MAX_BYTES = 1024 * 1024 // 풀이 파일은 1MB 를 넘지 않는다고 본다(거대 파일로 앱이 멈추는 것을 막음)

function fail(error, extra) {
  return { ok: false, error, ...extra }
}

function isInside(parent, child) {
  const rel = path.relative(parent, child)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

// base 폴더 아래의 <단계>/<문제>/<파일> 경로를 만든다. 검사에 실패하면 { error } 를 돌려준다.
function resolveUnder(base, problemId, fileName) {
  if (typeof base !== 'string' || base === '') return { error: 'ROOT_NOT_FOUND' }
  if (typeof problemId !== 'string' || typeof fileName !== 'string') return { error: 'BAD_ARGUMENT' }
  const parts = problemId.split('/')
  if (parts.length !== 2 || !LEVEL_RE.test(parts[0]) || !PROBLEM_RE.test(parts[1])) return { error: 'BAD_PROBLEM_ID' }
  if (fileName === '' || fileName !== path.basename(fileName) || fileName.includes('\\') || fileName.includes('/')) {
    return { error: 'BAD_FILE_NAME' }
  }
  if (!languageOf(fileName)) return { error: 'BAD_FILE_NAME' }
  const resolved = path.resolve(base, parts[0], parts[1], fileName)
  if (!isInside(path.resolve(base), resolved)) return { error: 'OUTSIDE_ROOT' }
  return { path: resolved }
}

function readFileSafe(file) {
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    return fail('FILE_NOT_FOUND')
  }
  if (!stat.isFile()) return fail('FILE_NOT_FOUND')
  if (stat.size > MAX_BYTES) return fail('FILE_TOO_LARGE')
  // UTF-8 로 읽는다. 맨 앞 BOM 은 편집기에 이상한 글자로 보이므로 떼고, 저장할 때는 BOM 없이 쓴다.
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
  return { ok: true, content: text, mtimeMs: stat.mtimeMs, size: stat.size }
}

function readSolution(root, problemId, fileName) {
  const r = resolveUnder(root, problemId, fileName)
  if (r.error) return fail(r.error)
  return readFileSafe(r.path)
}

// 시작 코드를 읽는다(문제 루트의 original 폴더에 같은 구조로 있다).
function readOriginal(root, problemId, fileName) {
  if (typeof root !== 'string' || root === '') return fail('ROOT_NOT_FOUND')
  const r = resolveUnder(path.join(root, ORIGINAL_FOLDER), problemId, fileName)
  if (r.error) return fail(r.error)
  const result = readFileSafe(r.path)
  return result.ok ? result : fail('ORIGINAL_NOT_FOUND')
}

// 파일의 수정 시각만 확인한다(외부 편집 감지용).
function statSolution(root, problemId, fileName) {
  const r = resolveUnder(root, problemId, fileName)
  if (r.error) return fail(r.error)
  try {
    const stat = fs.statSync(r.path)
    return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size }
  } catch {
    return fail('FILE_NOT_FOUND')
  }
}

// 저장. baseMtimeMs 는 화면이 마지막으로 읽거나 저장했을 때의 수정 시각이다.
// 그 사이 다른 프로그램(VS Code 등)이 파일을 바꿨으면 덮어쓰지 않고 CONFLICT 를 알린다. force 면 덮어쓴다.
function writeSolution(root, problemId, fileName, content, baseMtimeMs, force) {
  const r = resolveUnder(root, problemId, fileName)
  if (r.error) return fail(r.error)
  if (typeof content !== 'string') return fail('BAD_ARGUMENT')
  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) return fail('FILE_TOO_LARGE')

  let current
  try {
    current = fs.statSync(r.path)
  } catch {
    return fail('FILE_NOT_FOUND') // 새 파일 만들기는 하지 않는다(문제 폴더의 기존 풀이 파일만 저장)
  }
  if (!force && typeof baseMtimeMs === 'number' && current.mtimeMs !== baseMtimeMs) {
    return fail('CONFLICT', { mtimeMs: current.mtimeMs })
  }

  // 임시 파일에 쓴 뒤 이름을 바꿔 교체한다: 쓰는 도중 꺼져도 원본이 반쯤 쓰인 채 남지 않는다.
  const tmp = path.join(path.dirname(r.path), `.${path.basename(r.path)}.${process.pid}.tmp`)
  try {
    fs.writeFileSync(tmp, content, 'utf8')
    fs.renameSync(tmp, r.path)
  } catch (e) {
    try {
      fs.rmSync(tmp, { force: true })
    } catch {
      // 임시 파일 정리 실패는 무시한다.
    }
    return fail('WRITE_FAILED', { message: e && e.code ? String(e.code) : 'unknown' })
  }
  const stat = fs.statSync(r.path)
  return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size }
}

// 시작 코드로 되돌린다: original 의 내용을 풀이 파일에 덮어쓰고 그 내용을 돌려준다.
function restoreOriginal(root, problemId, fileName) {
  const original = readOriginal(root, problemId, fileName)
  if (!original.ok) return original
  const written = writeSolution(root, problemId, fileName, original.content, undefined, true)
  if (!written.ok) return written
  return { ok: true, content: original.content, mtimeMs: written.mtimeMs, size: written.size }
}

module.exports = { readSolution, readOriginal, statSolution, writeSolution, restoreOriginal, resolveUnder, MAX_BYTES }
