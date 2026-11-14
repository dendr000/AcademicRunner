// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { SNIPPETS } = require('../src/ui/snippet-data')

const LANGS = ['java', 'python', 'javascript']

test('Java·Python·JavaScript 스니펫이 모두 있다', () => {
  assert.deepStrictEqual(Object.keys(SNIPPETS).sort(), [...LANGS].sort())
  for (const lang of LANGS) assert.ok(SNIPPETS[lang].length >= 20, lang)
})

test('필수 단축 입력이 들어 있다', () => {
  const labels = (lang) => SNIPPETS[lang].map((s) => s.label)
  for (const need of ['sout', 'soutv', 'psvm', 'fori', 'for', 'foreach', 'if', 'while', 'sc', 'try']) assert.ok(labels('java').includes(need), 'java ' + need)
  for (const need of ['print', 'for', 'fori', 'if', 'def', 'inpl']) assert.ok(labels('python').includes(need), 'python ' + need)
  for (const need of ['log', 'for', 'forof', 'if', 'fn', 'arrow']) assert.ok(labels('javascript').includes(need), 'js ' + need)
})

test('같은 언어 안에서 label 이 겹치지 않고 모두 글자·숫자뿐이다', () => {
  for (const lang of LANGS) {
    const labels = SNIPPETS[lang].map((s) => s.label)
    assert.strictEqual(new Set(labels).size, labels.length, lang + ' 중복')
    for (const l of labels) assert.match(l, /^[A-Za-z][A-Za-z0-9]*$/, l)
  }
})

test('모든 스니펫에 설명과 본문이 있다', () => {
  for (const lang of LANGS) {
    for (const s of SNIPPETS[lang]) {
      assert.ok(typeof s.detail === 'string' && s.detail !== '', lang + ' ' + s.label + ' detail')
      assert.ok(typeof s.body === 'string' && s.body !== '', lang + ' ' + s.label + ' body')
    }
  }
})

test('본문의 ${...} 자리가 닫혀 있고 $0 은 최대 한 번이다', () => {
  for (const lang of LANGS) {
    for (const s of SNIPPETS[lang]) {
      let depth = 0
      for (let i = 0; i < s.body.length; i++) {
        if (s.body[i] === '$' && s.body[i + 1] === '{') depth++
        else if (s.body[i] === '}' && depth > 0) depth--
      }
      assert.strictEqual(depth, 0, lang + ' ' + s.label + ' 닫히지 않은 자리')
      assert.ok((s.body.match(/\$0/g) || []).length <= 1, lang + ' ' + s.label + ' $0')
    }
  }
})

test('같은 번호의 자리는 기본값이 서로 같다(함께 바뀌는 자리의 모양 일치)', () => {
  for (const lang of LANGS) {
    for (const s of SNIPPETS[lang]) {
      const seen = new Map()
      for (const m of s.body.matchAll(/\$\{(\d+):([^}]*)\}/g)) {
        if (seen.has(m[1])) assert.strictEqual(seen.get(m[1]), m[2], `${lang} ${s.label} 자리 ${m[1]}`)
        else seen.set(m[1], m[2])
      }
    }
  }
})

test('이모지가 없다', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  for (const lang of LANGS) for (const s of SNIPPETS[lang]) assert.ok(!emoji.test(s.body + s.detail), lang + ' ' + s.label)
})

test('핵심 본문 모양: sout, fori', () => {
  assert.strictEqual(SNIPPETS.java.find((s) => s.label === 'sout').body, 'System.out.println(${1});$0')
  assert.ok(SNIPPETS.java.find((s) => s.label === 'fori').body.startsWith('for (int ${1:i} = 0;'))
  assert.ok(SNIPPETS.python.find((s) => s.label === 'fori').body.startsWith('for ${1:i} in range('))
})
