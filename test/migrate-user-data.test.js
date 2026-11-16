// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { migrateUserData } = require('../electron/core/migrate-user-data')

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'puliteo-migrate-'))
}
function put(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

test('옛 폴더의 설정·케이스·SQL 데이터·화면 저장소를 새 폴더로 복사한다', () => {
  const appData = temp()
  const oldDir = path.join(appData, 'AcademicRunner')
  put(path.join(oldDir, 'settings.json'), '{"root":"x"}')
  put(path.join(oldDir, 'cases.json'), '{"a":1}')
  put(path.join(oldDir, 'Local Storage', 'leveldb', '000003.log'), 'data')
  put(path.join(oldDir, 'Local Storage', 'leveldb', 'LOCK'), '')
  put(path.join(oldDir, 'Cache', 'big'), 'cache')
  const userData = path.join(appData, 'Puliteo')
  const r = migrateUserData(appData, userData)
  assert.equal(r.migrated, true)
  assert.deepEqual(r.failed, [])
  assert.equal(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'), '{"root":"x"}')
  assert.equal(fs.readFileSync(path.join(userData, 'Local Storage', 'leveldb', '000003.log'), 'utf8'), 'data')
  assert.equal(fs.existsSync(path.join(userData, 'Local Storage', 'leveldb', 'LOCK')), false)
  assert.equal(fs.existsSync(path.join(userData, 'Cache')), false)
  // 옛 폴더는 그대로 남는다.
  assert.equal(fs.existsSync(path.join(oldDir, 'settings.json')), true)
  fs.rmSync(appData, { recursive: true, force: true })
})

test('새 폴더에 이미 데이터가 있으면 덮어쓰지 않는다', () => {
  const appData = temp()
  put(path.join(appData, 'AcademicRunner', 'settings.json'), 'old')
  put(path.join(appData, 'Puliteo', 'settings.json'), 'new')
  const r = migrateUserData(appData, path.join(appData, 'Puliteo'))
  assert.equal(r.migrated, false)
  assert.equal(fs.readFileSync(path.join(appData, 'Puliteo', 'settings.json'), 'utf8'), 'new')
  fs.rmSync(appData, { recursive: true, force: true })
})

test('새 폴더가 캐시만 있는 빈 폴더여도 옛 데이터를 가져온다', () => {
  const appData = temp()
  put(path.join(appData, 'AcademicRunner', 'sql-presets.json'), '[]')
  put(path.join(appData, 'Puliteo', 'GPUCache', 'x'), '1')
  const r = migrateUserData(appData, path.join(appData, 'Puliteo'))
  assert.deepEqual(r.copied, ['sql-presets.json'])
  fs.rmSync(appData, { recursive: true, force: true })
})

test('옛 폴더가 없으면 아무것도 하지 않는다', () => {
  const appData = temp()
  const userData = path.join(appData, 'Puliteo')
  const r = migrateUserData(appData, userData)
  assert.equal(r.migrated, false)
  assert.equal(fs.existsSync(userData), false)
  fs.rmSync(appData, { recursive: true, force: true })
})

test('새 폴더와 옛 폴더가 같으면 건너뛴다', () => {
  const appData = temp()
  put(path.join(appData, 'AcademicRunner', 'settings.json'), 'x')
  const r = migrateUserData(appData, path.join(appData, 'AcademicRunner'))
  assert.equal(r.migrated, false)
  fs.rmSync(appData, { recursive: true, force: true })
})
