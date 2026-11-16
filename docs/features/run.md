(Python·JS 실제 실행, Python 이 없으면 Python 시험만 건너뜀), # 실행 (M3 Java, M4 Python·JS)

## 무엇인가

편집기 아래 실행 패널에서 입출력 문제(`Main`)를 컴파일·실행하고 결과를 봅니다. 입력은 두 가지 방식으로 줄 수 있습니다: (1) 입력 탭을 비워 두고 실행하면 **콘솔처럼 실행 중에 직접 입력**하고, (2) 입력 탭에 값을 적어 두면 **미리 넣고** 실행합니다.

## 사용 방법

| 하고 싶은 일 | 방법 |
|---|---|
| 실행 | "실행" 버튼, `F5` 또는 `Ctrl+Enter` (편집기에 커서가 있어도 동작) |
| 중지 | "중지" 버튼 또는 `Shift+F5` |
| 컴파일만 확인(문법 검사) | "컴파일 확인" 또는 `F6` (함수 작성 문제 `Solution` 도 가능) |
| 입력 탭 / 출력 탭 | 탭 클릭 또는 `Ctrl+1` / `Ctrl+2` |

- 입력은 문제마다 기억합니다(다음에 열어도 남아 있음).

## 실시간 입력 (콘솔처럼)

입력 탭이 **비어 있을 때** 실행(`F5`)하면 출력 탭이 열리고 아래에 입력줄이 나타납니다.

1. 프로그램이 `첫 번째 정수: ` 처럼 안내문을 출력하면 입력줄에 값을 쓰고 `Enter` 를 누릅니다. 입력한 값은 출력에 파란색으로 남아 콘솔과 같은 모양이 됩니다.
2. `Scanner` 가 다음 입력을 요구할 때마다 이어서 입력합니다. 여러 개를 입력해야 해도 어디서 무엇을 묻는지 보면서 넣을 수 있습니다.
3. 입력을 끝까지 읽는 프로그램(`while (sc.hasNext())` 등)은 `Ctrl+D` 또는 "입력 끝" 버튼으로 끝을 알립니다.
4. 프로그램이 끝나면 입력줄이 사라집니다. 멈추려면 `Shift+F5`.

입력 탭에 값이 있으면 실시간 입력 대신 그 값을 미리 넣고 입력을 닫습니다(끝까지 읽는 프로그램이 멈추지 않게). 함수 문제와 케이스 실행은 입력이 정해져 있어 실시간 입력을 쓰지 않습니다.

시간 제한: 실시간 입력 중에는 사람이 생각하는 시간이 있으므로 "마지막 입력(또는 시작) 뒤 5분"입니다. 평소 시간 제한(기본 10초)은 미리 넣는 방식에 적용됩니다.
- 실행하기 전에 편집 내용을 먼저 저장합니다. 저장하지 못한 상태(다른 프로그램과 충돌 등)면 옛 파일을 실행하지 않도록 막고 이유를 보여 줍니다.
- 함수 작성 문제(`Solution`)는 `main` 이 없어 단독 실행할 수 없습니다. 케이스 탭에서 케이스를 만들어 실행합니다([function-problems.md](function-problems.md)). 컴파일 확인은 됩니다.
- 결과 줄: `실행 완료, 종료 코드 0, 523ms (javac 25.0.1)`, `컴파일 오류`, `시간 초과: 10초 안에 끝나지 않아 중단했습니다`, `중지했습니다`, `출력이 너무 많아(1MB 초과) 중단했습니다`.

## 안전장치

- 실행 시간 제한 기본 10초(`settings.json` 의 `timeoutSec`, 1~120). 무한 반복은 프로세스 트리 전체를 종료합니다.
- 출력은 합쳐서 1MB 를 넘으면 중단합니다.
- 한 번에 하나만 실행합니다. 앱을 닫으면 돌고 있던 프로세스도 종료합니다.
- 문제 폴더에는 아무것도 쓰지 않습니다. 컴파일·실행은 임시 폴더(`ar-run-...`)에서 하고 끝나면 지웁니다.
- 컴파일 오류 메시지에서는 임시 폴더 경로를 떼고 `Main.java:8: error` 처럼 보여 줍니다.

## Java 실행 방식

1. 소스에서 `public class 이름` 을 찾아 임시 폴더에 `이름.java` 로 씁니다(공개 클래스가 없으면 원래 파일 이름).
2. `javac -encoding UTF-8 -d 임시폴더` 로 컴파일.
3. `java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8 -cp 임시폴더 클래스` 로 실행. 입력은 BOM 없는 UTF-8 로 직접 전달합니다.
4. JDK 는 `JAVA_HOME` → `PATH` 순으로 찾고, 없으면 "JDK(javac)를 찾을 수 없습니다" 안내가 나옵니다.

## Python 실행 방식

- 임시 폴더에 파일을 쓰고 `python -X utf8 -u 파일` 로 실행합니다(UTF-8 모드, 출력 즉시 표시). `python.exe` 를 먼저 찾고 없으면 `py -3` 을 씁니다. Windows 스토어의 가짜 `python.exe` 는 버전 확인에서 걸러집니다.
- 컴파일 확인(F6)은 `py_compile` 로 문법만 검사합니다.

## JavaScript 실행 방식

- 앱에 들어 있는 Node(Electron 을 `ELECTRON_RUN_AS_NODE=1` 로 실행)로 돕니다. 따로 Node 를 설치하지 않아도 됩니다.
- 컴파일 확인(F6)은 `node --check` 로 문법만 검사합니다.

## 문제 폴더에 다른 언어 파일 두기

문제 폴더에 `Main.py`, `Main.js` 처럼 같은 규칙의 파일(`Main*` 입출력, `Solution*` 함수)을 두면 목록에 언어 표시가 늘고 편집기 위 탭으로 전환해 실행할 수 있습니다. 지금 `AcademicTest` 에는 Java 파일만 있습니다.

## 구성 용어 설명

| 용어 | 뜻 |
|---|---|
| 러너 | 언어마다 "어떻게 컴파일하고 실행할지"를 정하는 부품(`electron/core/runners/`) |
| 프로세스 트리 | 프로그램과 그 프로그램이 띄운 하위 프로그램 전체. 중지할 때 전부 끝낸다(`taskkill /T`). |
| 표준 입력/출력(stdin/stdout) | 프로그램이 읽는 입력과 화면에 쓰는 출력 통로 |
| 실시간 입력 | 프로그램이 도는 동안 입력줄에서 값을 보내는 방식(콘솔 창과 같음) |
| EOF(입력 끝) | 더 이상 입력이 없다는 신호. 콘솔에서는 Ctrl+D(Windows 에서는 Ctrl+Z) |
| BOM | 파일 맨 앞에 붙는 보이지 않는 표시. PowerShell 파이프로 입력하면 붙어서 `Scanner` 가 오류를 낸다. |
| 종료 코드 | 프로그램이 끝날 때 남기는 번호. 0 이면 정상, 그 밖은 오류(예외) |

## 관련 파일

- `electron/core/process-runner.js` 외부 프로그램 실행(시간 제한·출력 상한·중지)
- `electron/core/run-service.js` 읽기 → 준비 → 컴파일 → 실행 → 임시 폴더 정리
- `electron/core/tool-locator.js` javac/java/python 위치 찾기
- `electron/core/runners/` 언어별 러너
- `src/ui/run-panel.js`, `src/ui/run-summary.js`, `src/styles/run-panel.css` 패널 화면

## 시험

`test/process-runner.test.js`, `test/run-service-java.test.js`(실제 javac 사용, JDK 가 없으면 건너뜀), `test/run-service-script.test.js`(Python·JS 실제 실행, Python 이 없으면 Python 시험만 건너뜀), `test/run-summary.test.js`, `test/settings-timeout.test.js`. 화면은 개발 실행에서 실제 키 입력(F5, F6, Shift+F5)으로 확인했습니다(실행·입력 기억·컴파일 오류·시간 초과·중지·함수 문제 거부·라이트/다크).

## C / C++ / SQL 실행 (v1.19.0)

- **C / C++**: PC 에 `gcc`·`g++`(또는 `clang`)가 있어야 한다. PATH 와 흔한 설치 폴더(MSYS2, MinGW, WinLibs, LLVM)에서 찾는다. 없으면 설치 안내(winget WinLibs)를 보여 준다. 임시 폴더에서 컴파일하므로 문제 폴더에는 실행 파일이 생기지 않는다. 컴파일 확인(F6)은 `-fsyntax-only`. `Solution.c`/`Solution.cpp` 같은 함수 문제는 main 이 없어 케이스 시험을 아직 지원하지 않고 컴파일 확인만 된다.
- **SQL**: 앱에 든 SQLite(메모리 DB)로 실행한다. 설치할 것이 없다. **입력 탭에 `CREATE TABLE`·`INSERT` 로 시험용 표를 적으면** 그것을 먼저 실행한 뒤 풀이 .sql 의 문장을 차례로 실행한다. SELECT 결과는 첫 줄이 열 이름인 탭 구분 표로 나온다. 컴파일 확인은 문법만 보며 표가 없다는 오류는 넘긴다. 실시간 입력 모드는 쓰지 않는다.
- **기본 데이터(v1.21.0)**: 풀이에 학원 사이트 표 이름이 나오면 그 표와 데이터를 자동으로 만든다. `student`·`course`·`enroll` 은 사이트 SQL Lv0 과 같은 데이터, `customers`·`products`·`orders`·`order_items` 는 사이트 SQL Lv1~5 와 같은 표 구조(사이트는 풀 때마다 내용이 바뀌므로 여기서는 고정 예시 데이터), 대문자 `STUDENT`·`DEPT` 는 DBMS 이론 점검의 참고 테이블이다. 그래서 `SELECT ... FROM student;` 만 적어도 실행된다. 입력 탭의 `INSERT` 는 기본 데이터 위에 더해진다. 풀이나 입력 탭에 `CREATE TABLE` 이 있으면 직접 표를 만드는 것으로 보고 기본 데이터는 넣지 않는다. 자동 선택이 틀리면 첫 줄에 `-- @data: school`(또는 shop, dbms, none)을 적는다. 실행 결과 줄에 쓴 기본 데이터가 표시된다. 데이터 파일은 `electron/core/runners/sql-presets/` 에 있다.
- 용어: **SQLite** 는 파일 하나짜리 가벼운 데이터베이스, **메모리 DB** 는 디스크에 저장하지 않고 실행 동안만 있는 DB 다.
