// Copyright (c) dendr000. MIT License.
// 문제 폴더 스캔 시험. 임시 폴더에 가짜 문제만 만들어 쓰고, 끝나면 지운다.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { scanProblems, kindOf, languageOf } = require('../electron/core/scanner')
const { createSettingsStore } = require('../electron/core/settings')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'acadrunner-test-'))
}

function put(root, relPath, text = '') {
  const file = path.join(root, relPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

test('단계와 문제를 번호 순서대로 찾는다', () => {
  const root = makeTempDir()
  try {
    put(root, 'Lv1_입문/02_나머지_구하기/Solution.java')
    put(root, 'Lv1_입문/01_세_수의_합/Solution.java')
    put(root, 'Lv0_기초연습/02_구구단/Main.java')
    put(root, 'Lv0_기초연습/01_A+B/Main.java')
    const result = scanProblems(root)
    assert.strictEqual(result.ok, true)
    assert.deepStrictEqual(result.levels.map((l) => l.level), [0, 1])
    assert.strictEqual(result.levels[0].label, '기초연습')
    assert.deepStrictEqual(result.levels[0].problems.map((p) => p.title), ['A+B', '구구단'])
    assert.deepStrictEqual(result.levels[1].problems.map((p) => p.number), [1, 2])
    assert.strictEqual(result.problemCount, 4)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('폴더 이름의 밑줄은 제목에서 공백이 된다', () => {
  const root = makeTempDir()
  try {
    put(root, 'Lv0_기초연습/18_소수_개수_(효율성)/Solution.java')
    const p = scanProblems(root).levels[0].problems[0]
    assert.strictEqual(p.title, '소수 개수 (효율성)')
    assert.strictEqual(p.id, 'Lv0_기초연습/18_소수_개수_(효율성)')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('규칙에 맞지 않는 폴더와 파일은 건너뛴다', () => {
  const root = makeTempDir()
  try {
    put(root, 'Lv0_기초연습/01_A+B/Main.java')
    put(root, 'original/Lv0_기초연습/01_A+B/Main.java')
    put(root, 'docs/readme.md')
    put(root, '.git/config')
    put(root, 'Lv0_기초연습/memo.txt')
    put(root, 'Lv0_기초연습/없는번호/Main.java')
    put(root, 'Lv0_기초연습/01_A+B/notes.md')
    const result = scanProblems(root)
    assert.strictEqual(result.levels.length, 1)
    assert.strictEqual(result.problemCount, 1)
    assert.deepStrictEqual(result.levels[0].problems[0].files.map((f) => f.name), ['Main.java'])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('문제 유형은 파일 이름으로, 언어는 확장자로 판별한다', () => {
  assert.strictEqual(kindOf('Main.java'), 'io')
  assert.strictEqual(kindOf('main.py'), 'io')
  assert.strictEqual(kindOf('Solution.java'), 'function')
  assert.strictEqual(kindOf('Helper.java'), 'unknown')
  assert.strictEqual(languageOf('A.java'), 'java')
  assert.strictEqual(languageOf('a.PY'), 'python')
  assert.strictEqual(languageOf('a.js'), 'javascript')
  assert.strictEqual(languageOf('a.txt'), null)
})

test('한 문제 폴더에 여러 언어 파일이 있으면 모두 담는다', () => {
  const root = makeTempDir()
  try {
    put(root, 'Lv0_기초연습/07_합/Solution.java')
    put(root, 'Lv0_기초연습/07_합/solution.py')
    const p = scanProblems(root).levels[0].problems[0]
    assert.deepStrictEqual(p.files.map((f) => f.language).sort(), ['java', 'python'])
    assert.strictEqual(p.kind, 'function')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('없는 폴더, 파일, 빈 값은 오류 코드로 알린다', () => {
  assert.deepStrictEqual(scanProblems(path.join(os.tmpdir(), 'acadrunner-없는폴더-xyz')).error, 'ROOT_NOT_FOUND')
  assert.strictEqual(scanProblems('').error, 'ROOT_NOT_FOUND')
  assert.strictEqual(scanProblems(undefined).error, 'ROOT_NOT_FOUND')
  const root = makeTempDir()
  try {
    put(root, 'a.txt', 'x')
    assert.strictEqual(scanProblems(path.join(root, 'a.txt')).error, 'ROOT_NOT_DIRECTORY')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('문제 75개 규모도 한 번에 찾는다 (수락 기준)', () => {
  const root = makeTempDir()
  try {
    const counts = [21, 12, 12, 10, 6, 5, 5, 4]
    counts.forEach((n, level) => {
      for (let i = 1; i <= n; i++) {
        const num = String(i).padStart(2, '0')
        put(root, `Lv${level}_단계${level}/${num}_문제${i}/Solution.java`)
      }
    })
    const started = Date.now()
    const result = scanProblems(root)
    assert.strictEqual(result.problemCount, 75)
    assert.strictEqual(result.levels.length, 8)
    assert.ok(Date.now() - started < 1000, '1초 안에 끝나야 한다')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('설정은 기본값을 주고, 저장하면 다시 읽을 수 있다', () => {
  const dir = makeTempDir()
  try {
    const store = createSettingsStore(dir)
    assert.ok(store.get().root.length > 0)
    store.set({ root: 'D:\\다른\\폴더' })
    assert.strictEqual(createSettingsStore(dir).get().root, 'D:\\다른\\폴더')
    store.set({ root: '' })
    assert.strictEqual(store.get().root, 'D:\\다른\\폴더', '빈 값으로는 바꾸지 않는다')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('깨진 설정 파일은 기본값으로 대체한다', () => {
  const dir = makeTempDir()
  try {
    fs.writeFileSync(path.join(dir, 'settings.json'), '{깨진 json')
    const store = createSettingsStore(dir)
    assert.ok(store.get().root.length > 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// 실제 문제 폴더가 있으면 읽기만 해서 구조를 확인한다. 없으면 건너뛴다.
test('실제 문제 폴더(읽기 전용): 75문제, 8단계', { skip: !fs.existsSync('C:\\dev\\AcademicTest') }, () => {
  const result = scanProblems('C:\\dev\\AcademicTest')
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.levels.length, 8)
  assert.strictEqual(result.problemCount, 75)
})
