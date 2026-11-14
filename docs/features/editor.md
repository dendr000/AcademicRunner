# 편집기와 저장 (M2)

## 무엇인가

문제를 고르면 가운데에 풀이 파일이 열리고, VS Code 와 같은 편집기(Monaco)로 고칠 수 있습니다. 고친 내용은 파일에 바로 저장됩니다. 실행은 M3 부터입니다.

## 사용 방법

| 하고 싶은 일 | 방법 |
|---|---|
| 풀이 열기 | 왼쪽 목록에서 문제 클릭 |
| 저장 | 입력을 멈추고 약 0.8초 뒤 자동 저장, 또는 `Ctrl+S` 로 즉시 저장 |
| 사이트에 붙여 넣기 | "전체 복사" 클릭 후 사이트 편집기에 `Ctrl+V` |
| 시작 코드로 되돌리기 | "시작 코드로" 클릭 → 확인 (되돌린 뒤에도 `Ctrl+Z` 로 내 코드를 되살릴 수 있음) |
| 글자 크기 | 편집기 위에서 `Ctrl+휠` |
| 다른 파일 보기 | 문제에 파일이 여러 개면 위쪽 탭 클릭 |

## 단축 입력(스니펫)

`sout` 처럼 줄임말을 치면 제안 목록 맨 위에 뜨고, `Tab` 이나 `Enter` 로 코드가 펼쳐집니다. 펼친 뒤 `Tab` 을 누르면 빈칸(예: `fori` 의 `i`, `n`)으로 차례로 이동하고, 같은 이름의 칸은 함께 바뀝니다.

| 줄임말 | Java | Python | JavaScript |
|---|---|---|---|
| 출력 | `sout` `souf` `soutv` `sop` `serr` | `print` | `log` `logv` |
| 반복 | `fori` `forr` `for` `iter` `foreach` `while` `dowhile` | `for` `fori` `forr` `fore` `while` | `for` `fori` `forr` `forof` `forin` `foreach` `while` |
| 조건 | `if` `ifelse` `elseif` `else` `switch` `case` | `if` `ifelse` `elif` `else` | `if` `ifelse` `elseif` `else` `switch` |
| 입력 | `sc` `scn` `scl` `scs` `br` | `inp` `inpi` `inpl` `inpm` `stdin` | `stdin` `rl` |
| 함수·클래스 | `psvm` `main` `meth` `cls` `sol` | `def` `sol` `cls` `ifmain` | `fn` `sol` `arrow` `cls` |
| 자료구조 | `arr` `arr2` `al` `hm` `hs` `dq` `pq` `sb` | `lc` `swap` | `map` `filter` `reduce` `swap` |
| 기타 | `try` `tryf` `pint` `swap` `imp` | `try` `with` `imp` `swap` | `try` `swap` |

## 점 자동 완성

`sc.`, `num.` 처럼 점을 찍으면 그 변수의 메서드·속성이 뜹니다. `Tab` 또는 `Enter` 로 고르면 `nextInt()` 처럼 괄호까지 들어가고 커서가 괄호 안에 놓입니다. `length` 같은 속성은 괄호 없이 들어갑니다.

- Java: 위쪽 코드에서 `Scanner sc`, `int[] num`, `String s`, `var sb = new StringBuilder()` 같은 선언을 읽어 종류를 짐작합니다. Scanner, String, StringBuilder, 배열, List·Map·Set·Deque, Math, Integer, Arrays, Collections, Character, System.out 을 지원합니다. 종류를 모르면 자주 쓰는 목록을 보여 줍니다.
- Python, JavaScript: `a = [1, 2]`, `s = input()`, `d = {}`, `new Map()` 같은 대입을 읽어 리스트·문자열·사전·집합·Map 목록을 보여 주고, 모르면 가벼운 공통 목록을 보여 줍니다.
- 메서드 결과: `sc.nextLine().` 처럼 한 단계 호출 뒤에서는 문자열·배열을 돌려주는 대표 메서드(next, nextLine, substring, trim, split, toCharArray 등)만 종류를 압니다.
- 한계: 언어 서버가 아니라서 두 단계 이상 이어 쓴 체인이나 필드의 종류는 알지 못합니다.

### 이름 자동 완성

점이 없을 때(`ma` + `Ctrl+Space`)는 같은 파일에 나온 이름(변수·메서드)과 언어 예약어, 자주 쓰는 클래스(String, ArrayList 등)를 보여 줍니다. 편집기 기본 제안은 언어 서버 없이는 동작하지 않아 꺼 두고 `member-completion.js` 가 대신 합니다.

전체 스니펫 목록은 `src/ui/snippet-data.js` 에 있고, 줄을 추가하면 바로 쓸 수 있습니다. 본문 문법은 `$1`(이동 칸), `${1:i}`(기본값이 있는 칸), `$0`(마지막 커서 위치)입니다.

상태 표시: `저장됨` / `저장 대기 중...` / `저장 중...` / `저장 실패`.

## 저장이 안전한 이유

- 문제를 옮기거나 폴더를 바꾸거나 창을 닫기 직전에 먼저 저장합니다 (창 닫기는 저장이 끝날 때까지 최대 3초 기다림).
- 저장은 임시 파일에 먼저 쓰고 이름을 바꿔 교체합니다. 쓰는 도중 꺼져도 원본이 반쯤 쓰인 채 남지 않습니다.
- 줄바꿈(CRLF/LF)은 파일에 있던 그대로 유지합니다.
- 파일은 기존 풀이 파일만 저장합니다. 새 파일을 만들지 않고, 시작 코드(`original`)는 읽기만 합니다.
- 화면이 보낸 문제 이름·파일 이름은 형식을 검사하고, 결과 경로가 문제 폴더 밖이면 거부합니다.

## 다른 프로그램이 같은 파일을 고쳤을 때

앱은 1.5초마다 파일 수정 시각을 확인합니다.

- 앱에서 편집 중이 아니면 → 자동으로 새 내용을 불러옵니다("다른 프로그램의 변경을 불러왔습니다").
- 편집 중이면 → 위쪽에 안내가 뜨고 "내 코드로 덮어쓰기" 또는 "파일 내용 불러오기" 를 고릅니다. 고르기 전에는 파일을 덮어쓰지 않습니다.

## 구성 용어 설명

| 용어 | 뜻 |
|---|---|
| Monaco | VS Code 안에 들어 있는 편집기 부품. 앱에 같이 들어 있어 인터넷이 필요 없다(`src/vendor/monaco`, `npm run vendor` 로 복사). |
| 자동 저장기 | 입력이 멈춘 뒤 한 번만 저장하도록 조율하는 코드(`src/ui/autosaver.js`) |
| 충돌(CONFLICT) | 내가 마지막으로 읽은 뒤 파일이 밖에서 바뀐 상태 |
| 수정 시각(mtime) | 파일이 마지막으로 바뀐 시각. 외부 변경 감지에 쓴다. |
| 작업자(worker) | 편집기의 무거운 계산을 따로 돌리는 백그라운드 스레드. CSP 때문에 `blob:` 으로만 띄운다. |

## 관련 파일

- `electron/core/solution-files.js` 읽기·저장·되돌리기·경로 검사
- `src/ui/editor-pane.js` 편집 영역(탭, 상태, 버튼, 충돌 안내), `src/ui/monaco-loader.js` 편집기 불러오기
- `src/ui/member-data.js` 점 자동 완성 목록과 종류 짐작, `src/ui/member-completion.js` Monaco 에 등록
- `src/ui/snippet-data.js` 스니펫 목록(순수 데이터), `src/ui/snippets.js` Monaco 에 등록
- `scripts/vendor-monaco.js` Monaco 복사(언어 서비스·번역·소스맵 제외, 약 5MB)

## 시험

`test/solution-files.test.js`(읽기·BOM·경로 조작·저장·충돌·되돌리기, 임시 폴더), `test/snippet-data.test.js`(스니펫 목록 형식: 중복·닫힘·필수 항목), `test/autosaver.test.js`(가짜 시계로 지연·연속 입력·실패·저장 중 재편집). 편집기 화면은 개발 실행에서 실제 마우스·키 입력으로 확인했습니다(자동 저장, 외부 변경, 충돌, 되돌리기, 복사, 문제 이동 시 저장, 라이트/다크).
