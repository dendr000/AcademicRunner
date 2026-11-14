# 파일 구조

```text
AcademicRunner/
  README.md  CHANGELOG.md  LICENSE  package.json
  assets/icons/        화면에서 쓰는 아이콘(sun, moon, monitor)
  build/               앱 아이콘 (icon.svg 원본, icon.ico, icon.png)
  docs/
    plans/00-master-plan.md   마스터 계획서
    features/app-shell.md     앱 뼈대·테마 설명
    filetree.md               이 문서
  electron/
    main.js            메인 프로세스(창, AppUserModelId, 허용 목록 IPC)
    preload.js         화면에 노출하는 함수(runnerApi)
  scripts/
    make-icon.cjs      icon.svg 에서 icon.ico 생성
    package-win.js     exe 패키징(허용 목록 방식)
    verify-exe.ps1     exe 파일 정보·아이콘 확인
  src/
    index.html  renderer.js  theme.js
    styles/tokens.css  styles/app.css
  test/
    packaging.test.js  아이콘·메인 프로세스·패키징 설정 점검
```
