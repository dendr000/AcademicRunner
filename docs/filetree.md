# 파일 구조

```text
AcademicRunner/
  README.md  CHANGELOG.md  LICENSE  package.json
  assets/icons/        화면에서 쓰는 아이콘(sun, moon, monitor)
  build/               앱 아이콘 (icon.svg 원본, icon.ico, icon.png)
  docs/
    plans/00-master-plan.md   마스터 계획서
    features/app-shell.md     앱 뼈대·테마 설명
    features/problem-list.md  문제 목록·검색 설명
    filetree.md               이 문서
  electron/
    main.js            메인 프로세스(창, AppUserModelId, IPC 등록)
    preload.js         화면에 노출하는 함수(runnerApi, 허용 목록 방식)
    ipc-handlers.js    화면 요청 처리(앱 정보, 설정, 폴더 선택, 문제 스캔)
    core/
      scanner.js       문제 폴더를 읽어 단계·문제·파일 목록 생성
      settings.js      설정(문제 폴더 경로) 저장·불러오기
  scripts/
    make-icon.cjs      icon.svg 에서 icon.ico 생성
    package-win.js     exe 패키징(허용 목록 방식)
    verify-exe.ps1     exe 파일 정보·아이콘 확인
  src/
    index.html  renderer.js  theme.js
    styles/tokens.css  styles/app.css  styles/problem-list.css
    ui/problem-list.js    왼쪽 문제 목록 그리기
    ui/problem-filter.js  검색·단계 필터(순수 함수)
  test/
    packaging.test.js       아이콘·메인 프로세스·패키징 설정 점검
    scanner.test.js         스캐너(임시 폴더)
    problem-filter.test.js  검색·필터
```
