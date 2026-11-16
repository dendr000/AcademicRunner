// Copyright (c) dendr000. MIT License.
// 문제 루트 폴더를 읽어 단계(Lv)와 문제 목록을 만든다. 파일은 읽기만 하고 바꾸지 않는다.
//
// 기대하는 구조:
//   <root>/Lv0_기초연습/01_A+B/Main.java
//   <root>/Lv0_기초연습/07_1부터_n까지의_합/Solution.java
// 위 규칙에 맞지 않는 폴더(original, docs, .git 등)는 건너뛴다.
const fs = require('node:fs')
const path = require('node:path')

const LEVEL_RE = /^Lv(\d+)_(.+)$/
const PROBLEM_RE = /^(\d+)_(.+)$/

const LANGUAGES = {
  '.java': 'java',
  '.py': 'python',
  '.js': 'javascript',
  '.c': 'c',
  '.cpp': 'cpp',
  '.sql': 'sql',
}

// 입출력 문제는 Main, 함수 작성 문제는 Solution 으로 시작하는 파일이다(사이트 시작 코드 규칙).
function kindOf(fileName) {
  const base = path.parse(fileName).name.toLowerCase()
  if (base === 'main' || path.extname(fileName).toLowerCase() === '.sql') return 'io'
  if (base === 'solution') return 'function'
  return 'unknown'
}

function languageOf(fileName) {
  return LANGUAGES[path.extname(fileName).toLowerCase()] || null
}

function listProblemFiles(problemDir) {
  const files = []
  for (const entry of fs.readdirSync(problemDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const language = languageOf(entry.name)
    if (!language) continue
    files.push({ name: entry.name, language, kind: kindOf(entry.name) })
  }
  files.sort((a, b) => a.name.localeCompare(b.name))
  return files
}

function titleFromFolder(rest) {
  return rest.replace(/_/g, ' ')
}

// 반환: { ok: true, root, levels: [{ level, folder, label, problems: [...] }], problemCount }
//       { ok: false, error: 'ROOT_NOT_FOUND' | 'ROOT_NOT_DIRECTORY', root }
function scanProblems(root) {
  if (typeof root !== 'string' || root.trim() === '') return { ok: false, error: 'ROOT_NOT_FOUND', root }
  let stat
  try {
    stat = fs.statSync(root)
  } catch {
    return { ok: false, error: 'ROOT_NOT_FOUND', root }
  }
  if (!stat.isDirectory()) return { ok: false, error: 'ROOT_NOT_DIRECTORY', root }

  const levels = []
  let problemCount = 0
  for (const levelEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!levelEntry.isDirectory()) continue
    const levelMatch = LEVEL_RE.exec(levelEntry.name)
    if (!levelMatch) continue

    const levelNumber = Number(levelMatch[1])
    const levelDir = path.join(root, levelEntry.name)
    const problems = []
    for (const problemEntry of fs.readdirSync(levelDir, { withFileTypes: true })) {
      if (!problemEntry.isDirectory()) continue
      const problemMatch = PROBLEM_RE.exec(problemEntry.name)
      if (!problemMatch) continue
      const files = listProblemFiles(path.join(levelDir, problemEntry.name))
      problems.push({
        id: `${levelEntry.name}/${problemEntry.name}`,
        level: levelNumber,
        number: Number(problemMatch[1]),
        title: titleFromFolder(problemMatch[2]),
        folder: problemEntry.name,
        files,
        kind: files.length > 0 ? files[0].kind : 'unknown',
      })
    }
    problems.sort((a, b) => a.number - b.number || a.folder.localeCompare(b.folder))
    problemCount += problems.length
    levels.push({ level: levelNumber, folder: levelEntry.name, label: titleFromFolder(levelMatch[2]), problems })
  }
  levels.sort((a, b) => a.level - b.level)
  return { ok: true, root, levels, problemCount }
}

module.exports = { scanProblems, kindOf, languageOf }
