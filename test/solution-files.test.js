// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const files = require('../electron/core/solution-files')

const ID = 'Lv0_기초연습/01_A+B'

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-files-'))
  fs.mkdirSync(path.join(root, 'Lv0_기초연습', '01_A+B'), { recursive: true })
  fs.mkdirSync(path.join(root, 'original', 'Lv0_기초연습', '01_A+B'), { recursive: true })
  fs.writeFileSync(path.join(root, 'Lv0_기초연습', '01_A+B', 'Main.java'), 'class Main {}\r\n')
  fs.writeFileSync(path.join(root, 'original', 'Lv0_기초연습', '01_A+B', 'Main.java'), 'START\n')
  return root
}

function withRoot(fn) {
  const root = makeRoot()
  try {
    fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('풀이 파일을 읽으면 내용과 수정 시각이 온다(줄바꿈은 그대로)', () => {
  withRoot((root) => {
    const r = files.readSolution(root, ID, 'Main.java')
    assert.strictEqual(r.ok, true)
    assert.strictEqual(r.content, 'class Main {}\r\n')
    assert.strictEqual(typeof r.mtimeMs, 'number')
  })
})

test('맨 앞 BOM 은 떼고 읽는다', () => {
  withRoot((root) => {
    fs.writeFileSync(path.join(root, 'Lv0_기초연습', '01_A+B', 'Main.java'), '\uFEFFabc')
    assert.strictEqual(files.readSolution(root, ID, 'Main.java').content, 'abc')
  })
})

test('없는 파일과 폴더는 FILE_NOT_FOUND', () => {
  withRoot((root) => {
    assert.strictEqual(files.readSolution(root, ID, 'Nope.java').error, 'FILE_NOT_FOUND')
    assert.strictEqual(files.readSolution(root, 'Lv0_기초연습/09_없음', 'Main.java').error, 'FILE_NOT_FOUND')
  })
})

test('경로 조작과 잘못된 이름은 거부한다', () => {
  withRoot((root) => {
    const bad = [
      ['Lv0_기초연습/../../x', 'Main.java'],
      ['../01_A+B', 'Main.java'],
      [ID, '../Main.java'],
      [ID, '..\\Main.java'],
      [ID, 'C:\\Windows\\win.ini'],
      [ID, 'Main.exe'],
      [ID, ''],
      ['original/01_A+B', 'Main.java'],
      ['Lv0_기초연습', 'Main.java'],
    ]
    for (const [id, name] of bad) {
      const r = files.readSolution(root, id, name)
      assert.strictEqual(r.ok, false, `${id} | ${name}`)
    }
    assert.strictEqual(files.readSolution(root, 5, 'Main.java').error, 'BAD_ARGUMENT')
    assert.strictEqual(files.readSolution('', ID, 'Main.java').error, 'ROOT_NOT_FOUND')
  })
})

test('저장하면 내용이 바뀌고 새 수정 시각을 돌려준다', () => {
  withRoot((root) => {
    const before = files.readSolution(root, ID, 'Main.java')
    const w = files.writeSolution(root, ID, 'Main.java', '새 내용', before.mtimeMs)
    assert.strictEqual(w.ok, true)
    assert.strictEqual(files.readSolution(root, ID, 'Main.java').content, '새 내용')
    assert.strictEqual(files.statSolution(root, ID, 'Main.java').mtimeMs, w.mtimeMs)
    // 임시 파일이 남지 않는다
    const left = fs.readdirSync(path.join(root, 'Lv0_기초연습', '01_A+B'))
    assert.deepStrictEqual(left, ['Main.java'])
  })
})

test('다른 프로그램이 먼저 고쳤으면 덮어쓰지 않고 CONFLICT, force 면 덮어쓴다', () => {
  withRoot((root) => {
    const file = path.join(root, 'Lv0_기초연습', '01_A+B', 'Main.java')
    const before = files.readSolution(root, ID, 'Main.java')
    fs.writeFileSync(file, '외부 수정')
    const future = new Date(Date.now() + 5000)
    fs.utimesSync(file, future, future)
    const w = files.writeSolution(root, ID, 'Main.java', '내 수정', before.mtimeMs)
    assert.strictEqual(w.ok, false)
    assert.strictEqual(w.error, 'CONFLICT')
    assert.strictEqual(fs.readFileSync(file, 'utf8'), '외부 수정')
    assert.strictEqual(files.writeSolution(root, ID, 'Main.java', '내 수정', before.mtimeMs, true).ok, true)
    assert.strictEqual(fs.readFileSync(file, 'utf8'), '내 수정')
  })
})

test('없는 파일을 새로 만들지 않고, 문자열이 아니거나 너무 크면 거부한다', () => {
  withRoot((root) => {
    assert.strictEqual(files.writeSolution(root, ID, 'Other.java', 'x', 0).error, 'FILE_NOT_FOUND')
    assert.strictEqual(fs.existsSync(path.join(root, 'Lv0_기초연습', '01_A+B', 'Other.java')), false)
    assert.strictEqual(files.writeSolution(root, ID, 'Main.java', null, 0).error, 'BAD_ARGUMENT')
    assert.strictEqual(files.writeSolution(root, ID, 'Main.java', 'a'.repeat(files.MAX_BYTES + 1), undefined, true).error, 'FILE_TOO_LARGE')
  })
})

test('시작 코드(original)는 읽을 수 있고, 저장 경로로는 쓸 수 없다', () => {
  withRoot((root) => {
    assert.strictEqual(files.readOriginal(root, ID, 'Main.java').content, 'START\n')
    assert.strictEqual(files.readOriginal(root, ID, 'Nope.java').error, 'ORIGINAL_NOT_FOUND')
    assert.strictEqual(files.writeSolution(root, 'original/01_A+B', 'Main.java', 'x', 0, true).ok, false)
  })
})

test('시작 코드로 되돌리면 풀이 파일이 original 과 같아지고 original 은 그대로', () => {
  withRoot((root) => {
    files.writeSolution(root, ID, 'Main.java', '내가 쓴 코드', undefined, true)
    const r = files.restoreOriginal(root, ID, 'Main.java')
    assert.strictEqual(r.ok, true)
    assert.strictEqual(r.content, 'START\n')
    assert.strictEqual(files.readSolution(root, ID, 'Main.java').content, 'START\n')
    assert.strictEqual(files.readOriginal(root, ID, 'Main.java').content, 'START\n')
  })
})

test('original 에 없으면 되돌리기는 실패하고 풀이 파일은 그대로', () => {
  withRoot((root) => {
    fs.rmSync(path.join(root, 'original'), { recursive: true })
    const r = files.restoreOriginal(root, ID, 'Main.java')
    assert.strictEqual(r.ok, false)
    assert.strictEqual(files.readSolution(root, ID, 'Main.java').content, 'class Main {}\r\n')
  })
})
