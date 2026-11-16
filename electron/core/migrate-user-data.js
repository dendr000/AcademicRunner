// Copyright (c) dendr000. MIT License.
// 앱 이름이 AcademicRunner 에서 Puliteo(풀이터)로 바뀌면서 설정 폴더(%APPDATA%\<앱 이름>)도 달라졌다.
// 새 폴더에 아무 데이터가 없으면 옛 폴더에서 설정·시험 케이스·SQL 기본 데이터·화면 저장소(통과 기록 등)를 복사해 온다.
// 옛 폴더는 지우지 않는다(백업으로 남는다). 이미 새 데이터가 있으면 아무것도 하지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const OLD_NAME = 'AcademicRunner'
// 복사할 항목. 캐시(Cache, GPUCache 등)는 다시 만들어지므로 가져오지 않는다.
const ITEMS = ['settings.json', 'cases.json', 'sql-presets.json', 'Local Storage']

const exists = (p) => {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function copyItem(from, to) {
  const stat = fs.statSync(from)
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true })
    for (const name of fs.readdirSync(from)) {
      // 실행 중인 옛 앱이 잡고 있는 잠금 파일은 복사하지 않는다.
      if (name === 'LOCK') continue
      copyItem(path.join(from, name), path.join(to, name))
    }
  } else {
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL)
  }
}

// appData: %APPDATA%, userData: 새 설정 폴더. 결과: { migrated: boolean, copied: [항목], failed: [항목] }
function migrateUserData(appData, userData) {
  const oldDir = path.join(appData, OLD_NAME)
  const result = { migrated: false, copied: [], failed: [] }
  if (path.resolve(oldDir) === path.resolve(userData)) return result
  if (!exists(oldDir)) return result
  if (ITEMS.some((name) => exists(path.join(userData, name)))) return result
  fs.mkdirSync(userData, { recursive: true })
  for (const name of ITEMS) {
    const from = path.join(oldDir, name)
    if (!exists(from)) continue
    try {
      copyItem(from, path.join(userData, name))
      result.copied.push(name)
    } catch {
      result.failed.push(name)
    }
  }
  result.migrated = result.copied.length > 0
  return result
}

module.exports = { migrateUserData, OLD_NAME, ITEMS }
