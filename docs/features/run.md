(Python·JS 실제 실행, Python 이 없으면 Python 시험만 건너뜀), # 실행 (M3 Java, M4 Python·JS)

## 무엇인가

편집기 아래 실행 패널에서 입출력 문제(`Main`)를 컴파일·실행하고 결과를 봅니다. 입력은 입력 탭에 미리 적어 두면 자동으로 프로그램에 전달됩니다.

## 사용 방법

| 하고 싶은 일 | 방법 |
|---|---|
| 실행 | "실행" 버튼, `F5` 또는 `Ctrl+Enter` (편집기에 커서가 있어도 동작) |
| 중지 | "중지" 버튼 또는 `Shift+F5` |
| 컴파일만 확인(문법 검사) | "컴파일 확인" 또는 `F6` (함수 작성 문제 `Solution` 도 가능) |
| 입력 탭 / 출력 탭 | 탭 클릭 또는 `Ctrl+1` / `Ctrl+2` |

- 입력은 문제마다 기억합니다(다음에 열어도 남아 있음).
- 실행하기 전에 편집 내용을 먼저 저장합니다. 저장하지 못한 상태(다른 프로그램과 충돌 등)면 옛 파일을 실행하지 않도록 막고 이유를 보여 줍니다.
- 함수 작성 문제(`Solution`)는 `main` 이 없어 아직 실행할 수 없습니다(시험 케이스 단계에서 지원). 컴파일 확인은 됩니다.
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
