// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { normalizeCode, codeHash } = require('../electron/core/code-hash')
const { progressAll, progressOne } = require('../electron/core/progress-status')

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-prog-'))
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text, 'utf8')
  }
  return { root, write, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) }
}

test('정규화: 줄바꿈·줄 끝 공백·끝의 빈 줄은 무시한다', () => {
  assert.strictEqual(normalizeCode('a  \r\nb\t\r\n\r\n'), 'a\nb')
  assert.strictEqual(codeHash('a\nb\n'), codeHash('a  \r\nb\r\n\r\n'))
  assert.notStrictEqual(codeHash('a\nb'), codeHash('a\nc'))
  assert.strictEqual(normalizeCode(null), '')
})

test('시작 코드와 같으면 edited=false, 다르면 true', () => {
  const t = makeRoot()
  try {
    t.write('original/Lv0_기초/01_A/Main.java', 'class Main {}\n')
    t.write('Lv0_기초/01_A/Main.java', 'class Main {}\r\n')
    t.write('original/Lv0_기초/02_B/Main.java', 'class Main {}\n')
    t.write('Lv0_기초/02_B/Main.java', 'class Main { int x; }\n')
    const all = progressAll(t.root)
    assert.strictEqual(all['Lv0_기초/01_A'].edited, false)
    assert.strictEqual(all['Lv0_기초/02_B'].edited, true)
    assert.strictEqual(all['Lv0_기초/01_A'].fileName, 'Main.java')
    assert.match(all['Lv0_기초/02_B'].hash, /^[0-9a-f]{16}$/)
  } finally {
    t.cleanup()
  }
})

test('시작 코드가 없으면 내용이 있는 코드는 작성한 것, 빈 코드는 아님', () => {
  const t = makeRoot()
  try {
    t.write('Lv0_기초/01_A/Main.java', '  \n')
    t.write('Lv0_기초/02_B/Main.java', 'class Main {}')
    const all = progressAll(t.root)
    assert.strictEqual(all['Lv0_기초/01_A'].edited, false)
    assert.strictEqual(all['Lv0_기초/02_B'].edited, true)
  } finally {
    t.cleanup()
  }
})

test('문제 하나만 조회, 없는 문제와 없는 폴더는 빈 결과', () => {
  const t = makeRoot()
  try {
    t.write('Lv0_기초/01_A/Main.java', 'x')
    assert.strictEqual(progressOne(t.root, 'Lv0_기초/01_A').edited, true)
    assert.strictEqual(progressOne(t.root, 'Lv0_기초/99_없음'), null)
    assert.deepStrictEqual(progressAll(path.join(t.root, 'nope')), {})
    assert.strictEqual(progressOne(path.join(t.root, 'nope'), 'Lv0_기초/01_A'), null)
  } finally {
    t.cleanup()
  }
})

test('풀이 파일이 없는 문제는 진행 정보에서 빠진다', () => {
  const t = makeRoot()
  try {
    fs.mkdirSync(path.join(t.root, 'Lv0_기초', '01_A'), { recursive: true })
    assert.deepStrictEqual(progressAll(t.root), {})
  } finally {
    t.cleanup()
  }
})
