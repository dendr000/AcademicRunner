// Copyright (c) dendr000. MIT License.
// AcademicRunner 를 win32-x64 독립 실행 폴더로 패키징한다 (@electron/packager).
// 이름은 로마자 AcademicRunner 로 고정한다(한글 이름은 패키저에서 경로가 어긋난 전례가 있다).
// 출력 경로를 바꾸지 않는다: 바꾸면 작업 표시줄에 고정한 바로가기가 깨진다.
const { packager } = require('@electron/packager')
const path = require('node:path')
const fs = require('node:fs')

const root = path.join(__dirname, '..')
const APP_NAME = 'AcademicRunner'
const outDir = path.join(root, 'release-packager', `${APP_NAME}-win32-x64`)

// 허용 목록: 실행에 필요한 것만 넣는다(소스 중 electron, src, assets 와 package.json, 라이선스).
// 테스트, 스크립트, 문서, 계획서, .git, 개발 의존성은 들어가지 않는다.
const ALLOW = [/^\/package\.json$/, /^\/LICENSE$/, /^\/electron(\/|$)/, /^\/src(\/|$)/, /^\/assets(\/|$)/, /^\/build\/icon\.ico$/]

function ignore(file) {
  if (file === '' || file === '/build') return false
  return !ALLOW.some((re) => re.test(file))
}

// packager 의 overwrite 는 출력 폴더를 통째로 지운다. 산출물이 아닌 파일이 섞여 있으면 빌드를 중단한다.
const KNOWN_TOP_LEVEL_ENTRIES = new Set([
  'LICENSE',
  'LICENSES.chromium.html',
  `${APP_NAME}.exe`,
  'chrome_100_percent.pak',
  'chrome_200_percent.pak',
  'd3dcompiler_47.dll',
  'dxcompiler.dll',
  'dxil.dll',
  'electron_wer.dll',
  'ffmpeg.dll',
  'icudtl.dat',
  'locales',
  'resources',
  'resources.pak',
  'snapshot_blob.bin',
  'v8_context_snapshot.bin',
  'version',
  'vk_swiftshader.dll',
  'vk_swiftshader_icd.json',
  'vulkan-1.dll',
])

async function main() {
  if (fs.existsSync(outDir)) {
    const unexpected = fs.readdirSync(outDir).filter((name) => !KNOWN_TOP_LEVEL_ENTRIES.has(name))
    if (unexpected.length > 0) {
      console.error(
        `\n빌드 중단: ${outDir} 안에 빌드 산출물이 아닌 항목이 있습니다 - ${unexpected.join(', ')}\n` +
          '다른 곳으로 옮긴 뒤 다시 빌드하세요. 정상 산출물인데 목록이 낡은 것뿐이면(Electron 버전업 등)\n' +
          'KNOWN_TOP_LEVEL_ENTRIES 에 추가하세요.\n',
      )
      process.exit(1)
    }
  }

  const appPaths = await packager({
    dir: root,
    out: path.join(root, 'release-packager'),
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    appCopyright: 'AcademicRunner - dendr000 - MIT',
    name: APP_NAME,
    // exe 에 아이콘을 넣지 않으면 기본 Electron 아이콘이 되어 작업 표시줄 고정 때 이상하게 보인다.
    icon: path.join(root, 'build', 'icon.ico'),
    // 파일 정보(작업 표시줄 마우스오버, 작업 관리자 이름). 비우면 'Electron' 으로 남는다.
    win32metadata: {
      CompanyName: 'dendr000',
      FileDescription: 'AcademicRunner',
      ProductName: 'AcademicRunner',
      InternalName: APP_NAME,
      OriginalFilename: `${APP_NAME}.exe`,
    },
    ignore,
    asar: true,
  })
  console.log('Packaged app(s):', appPaths)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
