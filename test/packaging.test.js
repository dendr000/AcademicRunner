// Copyright (c) dendr000. MIT License.
// M0 점검: 아이콘 파일의 크기 구성과 메인 프로세스 설정이 지침대로인지 확인한다.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')

function readIcoSizes(file) {
  const buf = fs.readFileSync(file)
  assert.strictEqual(buf.readUInt16LE(0), 0, 'ICO 예약 필드')
  assert.strictEqual(buf.readUInt16LE(2), 1, 'ICO 종류(아이콘)')
  const count = buf.readUInt16LE(4)
  const sizes = []
  for (let i = 0; i < count; i++) {
    const w = buf.readUInt8(6 + i * 16)
    sizes.push(w === 0 ? 256 : w)
  }
  return sizes
}

test('build/icon.ico 에 16~256 크기가 모두 들어 있다', () => {
  const sizes = readIcoSizes(path.join(root, 'build', 'icon.ico'))
  assert.deepStrictEqual(sizes.sort((a, b) => a - b), [16, 24, 32, 48, 64, 128, 256])
})

test('메인 프로세스가 창을 만들기 전에 AppUserModelId 를 지정한다', () => {
  const src = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8')
  const aumid = src.indexOf('app.setAppUserModelId(')
  const create = src.indexOf('app.whenReady()')
  assert.ok(aumid > -1, 'setAppUserModelId 호출이 있어야 한다')
  assert.ok(aumid < create, 'whenReady 보다 먼저 호출해야 한다')
})

test('화면은 contextIsolation 이고 Node 를 직접 쓰지 않는다', () => {
  const src = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8')
  assert.match(src, /contextIsolation:\s*true/)
  assert.match(src, /nodeIntegration:\s*false/)
})

test('패키징 설정에 아이콘과 파일 정보가 들어 있다', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'package-win.js'), 'utf8')
  assert.match(src, /icon:\s*path\.join\(root,\s*'build',\s*'icon\.ico'\)/)
  assert.match(src, /win32metadata/)
  assert.match(src, /ProductName:\s*'Puliteo'/)
})

test('exe 이름은 로마자이고 package.json 과 일치한다', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.match(pkg.productName, /^[A-Za-z0-9]+$/)
  const src = fs.readFileSync(path.join(root, 'scripts', 'package-win.js'), 'utf8')
  assert.match(src, new RegExp(`APP_NAME = '${pkg.productName}'`))
})
