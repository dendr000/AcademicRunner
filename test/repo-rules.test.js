// Copyright (c) dendr000. MIT License.
// CLAUDE.md 의 올리지 않는 것 규칙을 지키는지 확인한다(지문 파일, 외부 문제 사이트 연동).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const SKIP = new Set(['node_modules', '.git', 'dist', 'out', 'release', 'vendor'])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return []
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full) : [full]
  })
}

test('지문 파일 이름(문제.md, 지문, statement)이 저장소에 없다', () => {
  const bad = walk(ROOT).map((f) => path.relative(ROOT, f)).filter((f) => /(^|[\/])(문제\.md|problem\.md|지문|statement)/i.test(f))
  assert.deepEqual(bad, [])
})

test('앱 코드가 외부 문제 사이트(백준, 프로그래머스 등)를 호출하지 않는다', () => {
  const pattern = new RegExp(['acmicpc', 'programmers\.co\.kr', 'leetcode\.com', 'codeforces'].join('|'), 'i')
  const files = [...walk(path.join(ROOT, 'electron')), ...walk(path.join(ROOT, 'src'))].filter((f) => /\.(js|cjs|mjs|html)$/.test(f))
  const hits = files.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f))
  assert.deepEqual(hits, [])
})
