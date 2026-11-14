// Copyright (c) dendr000. MIT License.
// 시험 케이스(입력과 기대 출력)를 앱 데이터 폴더의 cases.json 에 저장한다. 문제 폴더는 건드리지 않는다.
// 모양: { "Lv0_기초연습/01_A+B": [ { id, name, input, expected } ] }
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const PROBLEM_ID_RE = /^Lv\d+_[^/\\]+\/\d+_[^/\\]+$/
const MAX_CASES_PER_PROBLEM = 200
const MAX_TEXT_LENGTH = 100 * 1024 // 입력·기대 출력 각각 100KB 까지
const MAX_NAME_LENGTH = 80

function fail(error) {
  return { ok: false, error }
}

function createCaseStore(dir) {
  const file = path.join(dir, 'cases.json')

  function readAll() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      // 파일이 없거나 깨졌으면 빈 상태로 시작한다.
    }
    return {}
  }

  function writeAll(all) {
    fs.mkdirSync(dir, { recursive: true })
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(all, null, 2), 'utf8')
    fs.renameSync(tmp, file)
  }

  function list(problemId) {
    if (!PROBLEM_ID_RE.test(String(problemId))) return []
    const items = readAll()[problemId]
    return Array.isArray(items) ? items.filter((c) => c && typeof c.id === 'string') : []
  }

  // 새 케이스(id 없음)는 추가하고, id 가 있으면 그 케이스를 고친다. 결과의 case 에 id 가 들어 있다.
  function save(problemId, input) {
    if (!PROBLEM_ID_RE.test(String(problemId))) return fail('BAD_PROBLEM_ID')
    if (!input || typeof input !== 'object') return fail('BAD_ARGUMENT')
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    const inText = typeof input.input === 'string' ? input.input : ''
    const expected = typeof input.expected === 'string' ? input.expected : ''
    if (name.length > MAX_NAME_LENGTH) return fail('NAME_TOO_LONG')
    if (inText.length > MAX_TEXT_LENGTH || expected.length > MAX_TEXT_LENGTH) return fail('TEXT_TOO_LONG')

    const all = readAll()
    const items = Array.isArray(all[problemId]) ? all[problemId] : []
    let saved
    if (typeof input.id === 'string') {
      const index = items.findIndex((c) => c.id === input.id)
      if (index < 0) return fail('NOT_FOUND')
      saved = { id: input.id, name: name || items[index].name, input: inText, expected }
      items[index] = saved
    } else {
      if (items.length >= MAX_CASES_PER_PROBLEM) return fail('TOO_MANY_CASES')
      saved = { id: crypto.randomUUID(), name: name || `케이스 ${items.length + 1}`, input: inText, expected }
      items.push(saved)
    }
    all[problemId] = items
    writeAll(all)
    return { ok: true, case: saved }
  }

  function remove(problemId, id) {
    if (!PROBLEM_ID_RE.test(String(problemId))) return fail('BAD_PROBLEM_ID')
    const all = readAll()
    const items = Array.isArray(all[problemId]) ? all[problemId] : []
    const next = items.filter((c) => c.id !== id)
    if (next.length === items.length) return fail('NOT_FOUND')
    if (next.length === 0) delete all[problemId]
    else all[problemId] = next
    writeAll(all)
    return { ok: true }
  }

  return { list, save, remove, file }
}

module.exports = { createCaseStore, MAX_CASES_PER_PROBLEM, MAX_TEXT_LENGTH }
