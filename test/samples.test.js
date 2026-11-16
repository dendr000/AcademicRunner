// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { scanProblems } = require('../electron/core/scanner')
const { progressAll } = require('../electron/core/progress-status')
const { defaultRoot, DEFAULTS } = require('../electron/core/settings')

const SAMPLES = path.join(__dirname, '..', 'samples')

test('샘플 폴더에서 문제 5개를 읽는다', () => {
  const r = scanProblems(SAMPLES)
  assert.equal(r.ok, true)
  const ids = r.levels.flatMap((l) => l.problems.map((p) => p.id))
  assert.equal(ids.length, 5)
  assert.ok(ids.includes('Lv0_기초연습/01_A+B'))
})

test('샘플은 시작 코드 그대로라 어느 문제도 "작성함"으로 보이지 않는다', () => {
  const progress = progressAll(SAMPLES)
  const edited = Object.entries(progress).filter(([, info]) => info.edited)
  assert.deepEqual(edited, [])
})

test('샘플의 모든 풀이 파일이 original 에 같은 내용으로 있다', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  const originals = walk(path.join(SAMPLES, 'original')).map((f) => path.relative(path.join(SAMPLES, 'original'), f))
  const mains = walk(SAMPLES).map((f) => path.relative(SAMPLES, f)).filter((f) => !f.startsWith('original') && f !== 'README.md')
  assert.deepEqual(mains.sort(), originals.sort())
  for (const f of mains) assert.equal(fs.readFileSync(path.join(SAMPLES, f), 'utf8'), fs.readFileSync(path.join(SAMPLES, 'original', f), 'utf8'), f)
})

test('기본 문제 폴더: 내 PC 폴더가 있으면 그것, 없으면 샘플, 둘 다 없으면 내 PC 폴더', () => {
  assert.equal(defaultRoot(() => true), DEFAULTS.root)
  assert.equal(defaultRoot((p) => p !== DEFAULTS.root), SAMPLES)
  assert.equal(defaultRoot(() => false), DEFAULTS.root)
})
