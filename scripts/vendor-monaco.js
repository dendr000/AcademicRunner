// Copyright (c) dendr000. MIT License.
// monaco-editor 의 min/vs 에서 필요한 부분만 src/vendor/monaco/vs 로 복사한다.
// 편집기 글자 색 입히기(Java·Python·JS)에 필요한 것만 두고, 언어 서비스(language), 번역(nls), 소스맵은 뺀다.
// npm install 뒤(postinstall)에 자동으로 실행되고, 결과 폴더(src/vendor)는 git 에 올리지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs')
const target = path.join(root, 'src', 'vendor', 'monaco', 'vs')

// 복사하지 않는 경로(source 기준, / 구분). 편집기 본체는 language 폴더 없이도 동작해야 한다.
const SKIP = [/^language(\/|$)/, /^nls\.messages\./, /\.map$/]

function copyDir(from, to, relative) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name
    if (SKIP.some((re) => re.test(rel))) continue
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dst, rel)
    else fs.copyFileSync(src, dst)
  }
}

// JS 파일을 열면 편집기가 언어 서비스(vs/language/typescript/tsMode)를 불러오려 한다. 그 폴더는 용량 때문에 뺐으므로,
// 아무 일도 하지 않는 빈 모듈을 대신 둔다(없으면 파일 열 때마다 "파일을 찾을 수 없음" 오류가 난다). 글자 색은 이것과 무관하다.
const TS_MODE_STUB = [
  "define('vs/language/typescript/tsMode', ['require', 'exports'], function (require, exports) {",
  "  const none = function () {}",
  "  exports.setupTypeScript = none",
  "  exports.setupJavaScript = none",
  "  exports.getTypeScriptWorker = function () { return Promise.reject(new Error('언어 서비스가 들어 있지 않습니다')) }",
  "  exports.getJavaScriptWorker = exports.getTypeScriptWorker",
  "})",
  "",
].join('\n')

function writeTsModeStub() {
  const dir = path.join(target, 'language', 'typescript')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'tsMode.js'), TS_MODE_STUB)
}

function main() {
  if (!fs.existsSync(path.join(source, 'loader.js'))) {
    console.log('monaco-editor 가 아직 설치되지 않아 건너뜁니다 (npm install 후 npm run vendor).')
    return
  }
  fs.rmSync(target, { recursive: true, force: true })
  copyDir(source, target, '')
  writeTsModeStub()
  console.log('monaco-editor 를 복사했습니다:', path.relative(root, target))
}

main()
