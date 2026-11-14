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
    features/editor.md        편집기·저장 설명
    features/run.md           실행 패널·러너 설명
    troubleshooting.md        문제 해결 기록
    filetree.md               이 문서
  electron/
    main.js            메인 프로세스(창, AppUserModelId, IPC 등록)
    preload.js         화면에 노출하는 함수(runnerApi, 허용 목록 방식)
    ipc-handlers.js    화면 요청 처리(앱 정보, 설정, 폴더 선택, 문제 스캔)
    core/
      scanner.js       문제 폴더를 읽어 단계·문제·파일 목록 생성
      settings.js      설정(문제 폴더 경로) 저장·불러오기
      solution-files.js  풀이 파일 읽기·저장·되돌리기(경로 검사 포함)
      process-runner.js  외부 프로그램 실행(시간 제한·출력 상한·중지)
      run-service.js   임시 폴더에서 컴파일·실행하고 정리
      tool-locator.js  javac/java/python 위치 찾기
      runners/         언어별 러너(index.js 목록, java.js, python.js, javascript.js)
  scripts/
    make-icon.cjs      icon.svg 에서 icon.ico 생성
    package-win.js     exe 패키징(허용 목록 방식)
    verify-exe.ps1     exe 파일 정보·아이콘 확인
    vendor-monaco.js   Monaco 편집기 부품을 src/vendor 로 복사
  src/
    index.html  renderer.js  theme.js
    styles/tokens.css  styles/app.css  styles/problem-list.css  styles/editor.css  styles/run-panel.css
    vendor/monaco/     편집기 부품(복사본, git 제외)
    ui/problem-list.js    왼쪽 문제 목록 그리기
    ui/problem-filter.js  검색·단계 필터(순수 함수)
    ui/editor-pane.js     편집 영역(탭, 저장 상태, 복사·되돌리기, 충돌 안내)
    ui/monaco-loader.js   Monaco 불러오기
    ui/autosaver.js       자동 저장 조율(순수 로직)
    ui/run-panel.js       실행 패널(입력·출력 탭, 실행·중지·컴파일, 단축키)
    ui/run-summary.js     실행 결과 한 줄 요약(순수 함수)
  test/
    packaging.test.js       아이콘·메인 프로세스·패키징 설정 점검
    scanner.test.js         스캐너(임시 폴더)
    problem-filter.test.js  검색·필터
    solution-files.test.js  파일 읽기·저장·충돌·되돌리기
    autosaver.test.js       자동 저장 타이밍
    process-runner.test.js  프로세스 실행(제한·중지·입력)
    run-service-java.test.js  Java 컴파일·실행(실제 javac)
    run-service-script.test.js  Python·JS 실행(실제 실행)
    run-summary.test.js     결과 요약
    settings-timeout.test.js  시간 제한 설정
```
