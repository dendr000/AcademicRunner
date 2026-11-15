# 문제 해결 기록

## 편집기가 "편집기 부품(src/vendor/monaco)을 찾을 수 없습니다" 로 뜸 (2026-11-14)

- 증상: 문제를 눌러도 편집기 대신 위 문구가 나온다.
- 원인: (1) `src/vendor/monaco` 는 git 에 올리지 않는 복사본이라 `npm install` 이나 `npm run vendor` 전에는 없다. (2) 개발 중 불러오는 주소를 `../vendor/monaco/` 로 잘못 써서 `src` 한 칸 위를 찾았다(`index.html` 이 `src` 안에 있으므로 `vendor/monaco/` 가 맞다).
- 해결: `npm run vendor` 를 실행한다(`npm install`, `npm start`, `npm run dist:win` 앞에서 자동 실행됨). 주소는 `vendor/monaco/` 로 고쳤다.

## 시작 코드로 되돌린 뒤 편집기 내용과 파일이 달라 보임 (2026-11-14)

- 증상: 되돌린 직후 파일은 시작 코드와 같은데 편집기 내용은 다르고, 이후 저장하면 줄바꿈이 바뀜.
- 원인: 편집기 모델의 줄바꿈(LF)과 시작 코드의 줄바꿈(CRLF)이 달라 편집기가 내용을 한쪽으로 통일했다.
- 해결: 내용을 넣을 때 모델의 줄바꿈을 그 텍스트의 줄바꿈에 맞춘다.

## 콘솔에 "Canceled" 오류가 한 번 남음 (2026-11-14)

- 증상: 다른 문제로 옮길 때 개발자 도구에 `Canceled: Canceled` 예외.
- 원인: 편집기에 붙어 있는 모델을 먼저 버려서 편집기 내부 작업이 취소됨.
- 해결: 새 모델을 붙인 뒤에 옛 모델을 버리고, 남는 `Canceled` 거부는 로그로 남기지 않는다.

## exe 재빌드가 "EBUSY ... app.asar" 로 멈춤 (2026-11-14, 해결)

- 증상: `npm run dist:win` 이 `release-packagerAcademicRunner-win32-x64esourcesapp.asar` 삭제 중 `EBUSY: resource busy or locked` 로 실패한다. 실패 시점에 출력 폴더가 일부 지워져 이전 exe 도 없는 상태가 된다.
- 원인: Claude 데스크톱 앱이 `app.asar` 를 열어 두고 있었다(Windows 잠금 조회 API `rstrtmgr` 로 확인). AcademicRunner 프로세스는 없었고, 폴더 이름 바꾸기도 접근 거부로 막혔다. 같은 증상이 탐색기 미리보기·백신 검사에서도 생길 수 있다.
- 해결: 잠금이 풀린 뒤 `npm run dist:win` 과 `npm run verify:exe` 를 다시 실행하니 통과했다. 계속 막히면 잠근 프로그램을 닫거나 다시 시작한 뒤 재시도한다. 어떤 프로그램이 잡고 있는지는 위 `rstrtmgr` 로 알아낼 수 있다.

## 실행하면 NoSuchElementException 으로 실패함 (2026-11-14, 사용 안내)

- 증상: 입출력 문제를 실행하면 `java.util.NoSuchElementException` (스택에 `Scanner.nextInt`) 이 나오고 `실행 실패, 종료 코드 1`.
- 원인: 코드 오류가 아니라 **입력 탭이 비어 있어서** `Scanner` 가 읽을 값이 없다. 프로그램이 숫자를 읽는 줄(예: `int N = sc.nextInt();`)에서 멈춘다.
- 해결: 입력 탭에 프로그램이 읽는 값을 쓰고 다시 실행한다(예: 별 찍기는 `5`). 입력은 문제별로 기억된다.

## F5 를 빠르게 여러 번 누르면 실행 상태가 어긋남 (2026-11-15, 해결)

- 증상: 실행 직후 F5 를 또 누르면 "이미 실행 중입니다" 가 나오고, 처음 실행은 계속 도는데 실행 버튼이 다시 눌리고 출력이 지워질 수 있음
- 원인: 실행 준비(저장 확인, 설정 읽기)가 비동기라 "실행 중" 표시가 켜지기 전에 두 번째 요청이 통과함
- 해결: 준비 중에도 새 실행을 받지 않는 보호 표시(`starting`)를 추가 (`src/ui/run-panel.js`)

## 앱을 두 번 켜면 창이 잠깐 또 뜸, 새로고침·개발자 도구 키가 살아 있음 (2026-11-15, 해결)

- 원인: 이미 실행 중이어도 두 번째 프로세스가 창을 만들었고, Electron 기본 메뉴(Ctrl+R, Ctrl+Shift+I)가 남아 있었음
- 해결: 단일 실행 잠금을 못 얻으면 창·IPC 를 만들지 않고, 기본 메뉴를 제거 (`electron/main.js`)
