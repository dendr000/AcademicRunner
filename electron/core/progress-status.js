// Copyright (c) dendr000. MIT License.
// 문제별 진행 정보: 첫 풀이 파일이 시작 코드(original)와 달라졌는지(edited), 지금 코드의 해시(hash).
// 파일은 읽기만 한다. "통과" 여부는 시험 케이스를 실행했을 때 기록하므로 여기서는 판단하지 않는다.
const solutionFiles = require('./solution-files')
const { scanProblems } = require('./scanner')
const { normalizeCode, codeHash } = require('./code-hash')

// 반환: { fileName, edited, hash } 또는 null(풀이 파일이 없거나 읽을 수 없음)
function progressOf(root, problem) {
  if (!problem || !Array.isArray(problem.files) || problem.files.length === 0) return null
  const fileName = problem.files[0].name
  const current = solutionFiles.readSolution(root, problem.id, fileName)
  if (!current.ok) return null
  const original = solutionFiles.readOriginal(root, problem.id, fileName)
  // 시작 코드를 찾을 수 없으면 비어 있지 않은 코드는 작성한 것으로 본다.
  const edited = original.ok ? normalizeCode(current.content) !== normalizeCode(original.content) : current.content.trim() !== ''
  return { fileName, edited, hash: codeHash(current.content) }
}

// 모든 문제의 진행 정보: { [problemId]: { fileName, edited, hash } }
function progressAll(root) {
  const scan = scanProblems(root)
  const result = {}
  if (!scan.ok) return result
  for (const level of scan.levels) {
    for (const problem of level.problems) {
      const info = progressOf(root, problem)
      if (info) result[problem.id] = info
    }
  }
  return result
}

// 문제 하나의 진행 정보(저장 직후 갱신용). 없으면 null.
function progressOne(root, problemId) {
  const scan = scanProblems(root)
  if (!scan.ok) return null
  for (const level of scan.levels) {
    const problem = level.problems.find((p) => p.id === problemId)
    if (problem) return progressOf(root, problem)
  }
  return null
}

module.exports = { progressOf, progressAll, progressOne }
