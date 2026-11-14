# 앱 뼈대와 테마 (M0)

## 무엇인가

AcademicRunner 의 빈 창입니다. 아이콘, 작업 표시줄 설정, 라이트/다크 전환까지만 들어 있고 문제 목록과 편집기는 다음 단계에서 추가합니다.

## 구성 용어 설명

| 용어 | 뜻 |
|---|---|
| 메인 프로세스 | 창을 만들고 파일·프로그램 실행을 맡는 쪽(`electron/main.js`). 컴퓨터 자원에 접근할 수 있다. |
| 렌더러 | 화면을 그리는 쪽(`src/`). 보안을 위해 컴퓨터 자원에 직접 접근하지 못한다. |
| preload | 화면이 쓸 수 있는 함수만 골라 열어 주는 다리(`electron/preload.js`). 화면에서는 `window.runnerApi` 로 보인다. |
| AppUserModelId | Windows 가 "같은 앱"인지 판단하는 이름. 작업 표시줄 고정과 실행 중 창을 묶는다. 값은 `com.academicrunner.app` 이고 바꾸지 않는다. |
| 색 토큰 | 색에 이름을 붙여 한 곳(`src/styles/tokens.css`)에 모아 둔 값. 라이트/다크는 이 변수만 바꿔 전환한다. |

## 동작

- 테마 버튼(오른쪽 위)을 누르면 시스템 따름 -> 라이트 -> 다크 순서로 바뀌고 고른 값은 저장된다. 처음에는 Windows 의 라이트/다크 설정을 따른다.
- 한 번에 한 개의 창만 뜬다(이미 실행 중이면 그 창을 앞으로 가져온다).
- 화면은 Node 를 직접 쓰지 못한다(contextIsolation, sandbox). 상태줄의 버전은 허용 목록 IPC(`app:info`)로 받는다.

## 실행과 빌드

| 하고 싶은 것 | 명령 |
|---|---|
| 개발 실행 | `npm start` |
| 테스트 | `npm test` |
| 아이콘 다시 만들기 | `npm run icon` |
| exe 만들기 | `npm run dist:win` |
| exe 파일 정보 확인 | `npm run verify:exe` |

exe 는 `release-packager\AcademicRunner-win32-x64\AcademicRunner.exe` 에 만들어진다. 이 경로를 바꾸면 작업 표시줄에 고정한 바로가기가 깨진다.
