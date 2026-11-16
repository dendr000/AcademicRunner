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

`sout` 처럼 줄임말을 치면 제안 목록 위쪽에 뜨고(같은 파일의 변수가 같은 글자로 시작하면 그 변수가 먼저, 겹치지 않는 `sout` 은 맨 위), `Tab` 이나 `Enter` 로 코드가 펼쳐집니다. 펼친 뒤 `Tab` 을 누르면 빈칸(예: `fori` 의 `i`, `n`)으로 차례로 이동하고, 같은 이름의 칸은 함께 바뀝니다.

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

`new ` 를 치면(Java) 선언한 타입에 맞는 클래스가 맨 위에 나옵니다. `Map<String, Integer> m = new ` 이면 HashMap, `List<..>` 이면 ArrayList 이고, 고르면 `HashMap<>()` 처럼 꺾쇠와 괄호까지 들어갑니다. 또 `HashMap<` 처럼 타입 이름 바로 뒤에 `<` 를 치면 `>` 가 자동으로 닫히고, 닫는 `>` 를 직접 치면 덮어씁니다(`i < n` 같은 비교는 닫지 않습니다). 

### 매개변수 이름 힌트
`new Main(3, 2)` 처럼 호출하면 화면에 `new Main(num: 3, cum: 2)` 로 이름이 흐리게 붙어 보입니다(코드는 그대로). 같은 파일에 만든 생성자·메서드·record 가 대상이고, 표준 라이브러리(`list.add(0, 5)` 등)는 이름을 몰라서 붙이지 않습니다. 인수가 하나일 때는 숫자·글자 같은 값(리터럴)일 때만 붙이고, 인수가 이미 매개변수 이름과 같으면 붙이지 않습니다. 같은 이름의 오버로드가 서로 다른 매개변수 이름을 가지면 어느 것인지 몰라 건너뜁니다. 환경 설정의 "매개변수 이름 힌트"로 끄고 켭니다(기본 켬).

### 타입 오타와 빠진 import 표시 (Java)
- 빨간 밑줄: 알려진 표준 타입과 한두 글자 차이인 이름(`Stirng` -> String, `Interger` -> Integer). 마우스를 올리면 알맞은 이름이 나옵니다.
- 노란 밑줄: 표준 클래스를 import 없이 쓴 경우(예: `HashMap` 에 `import java.util.*;` 필요).
### 그 밖의 실수 표시 (Java)
- 빨간 밑줄: 선언하지 않은 변수(`totl` -> total 아닌가요?), 선언하기 전이거나 선언한 { } 블록 밖에서 쓴 변수(for 변수 `i` 를 반복문 앞에서 사용), `new new` 같은 키워드 두 번, 괄호 짝이 맞지 않음(`new String[n)`), 값과 변수 타입이 안 맞는 대입(`int a = "abc";`, `String s = 5;`, `int n = 3.5;`).
- 빨간 밑줄: 같은 파일에 만든 메서드·생성자를 부를 때 인수 개수가 틀림(`f(int a, int b)` 에 `f(1)`). 받는 변수가 있는 호출(`obj.f()`), 가변 인수, 오버로드로 맞는 것이 있는 경우, 상속 파일은 건너뜁니다.
- 노란 밑줄: 조건식 안의 `=`(`if (x = 5)`, 비교는 `==`), 문자열 리터럴을 `==` / `!=` 로 비교(`s == "abc"`, `equals` 사용).
- 변수 점검은 이름을 다 알 수 없는 파일(상속 `extends`, `import static`, 익명 클래스)과 괄호 짝이 틀린 코드에서는 건너뜁니다. 람다 매개변수, enum 상수, 레코드 구성요소, instanceof 패턴 변수, 라벨은 오인하지 않게 처리했습니다.

- 간이 점검이라 확실한 것만 표시합니다. 이름이 아는 타입과 많이 다르면(라이브러리 클래스일 수 있어) 표시하지 않고, 같은 파일에 만든 클래스·상수·타입 매개변수(T)·문자열·주석 속 글자는 무시합니다. 진짜 컴파일 오류 확인은 컴파일 확인(F6)으로 합니다.

내가 만든 클래스도 제안합니다. `Person p` 라면 `p.` 에서 그 클래스의 필드와 메서드(인자·반환 타입 포함)가, 클래스 안에서 `this.` 를 치면 그 클래스의 멤버가, `Person.` 에서는 static 멤버와 enum 상수가 나옵니다. `p.name.` `p.getName().` 처럼 이어 붙여도 필드·메서드의 타입을 따라갑니다. 같은 파일 안의 선언만 읽는 간이 분석이라 다른 파일의 클래스, 제네릭 안의 타입(`List<Person>` 의 `get(0).`), 상속받은 멤버는 아직 모릅니다. 진짜 언어 서버(jdtls)는 설치본이 매우 커져서 쓰지 않았습니다.

점이 없을 때(`ma` + `Ctrl+Space`)는 같은 파일에 나온 이름(변수·메서드)과 언어 예약어, 자주 쓰는 클래스(String, ArrayList 등)를 보여 줍니다. SQL 은 ORDER BY, GROUP BY, INSERT INTO, LEFT JOIN, IS NULL 처럼 여러 단어로 된 문법도 한 항목으로 제안하며, 자주 쓰는 문법(SELECT, WHERE, ORDER BY, GROUP BY, JOIN 등)이 `ord`·`sel` 같은 단축 입력과 짧은 낱말(OR, IS, IN)보다 위에 나옵니다(예: `or` 를 치면 ORDER BY 가 맨 위). 파일에 나온 열·표 이름(score, student 등)은 예약어보다 위에 나오고, `ORDER BY ` 뒤처럼 글자 없이 Ctrl+Space 를 눌러도 그 이름들이 먼저 나옵니다(공백만 쳤을 때 저절로 뜨게 하면 Enter 로 줄바꿈하려다 잘못 들어가서 직접 열게 했습니다). 순서는 `member-completion.js` 의 언어별 자주 쓰는 목록으로 정합니다. 편집기 기본 제안은 언어 서버 없이는 동작하지 않아 꺼 두고 `member-completion.js` 가 대신 합니다.

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
- `src/ui/java-classes.js` 내 클래스 필드·메서드 읽기, `src/ui/member-data.js` 점 자동 완성 목록과 종류 짐작, `src/ui/member-completion.js` Monaco 에 등록
- `src/ui/snippet-data.js` 스니펫 목록(순수 데이터), `src/ui/snippets.js` Monaco 에 등록
- `scripts/vendor-monaco.js` Monaco 복사(언어 서비스·번역·소스맵 제외, 약 5MB)

## 시험

`test/solution-files.test.js`(읽기·BOM·경로 조작·저장·충돌·되돌리기, 임시 폴더), `test/snippet-data.test.js`(스니펫 목록 형식: 중복·닫힘·필수 항목), `test/autosaver.test.js`(가짜 시계로 지연·연속 입력·실패·저장 중 재편집). 편집기 화면은 개발 실행에서 실제 마우스·키 입력으로 확인했습니다(자동 저장, 외부 변경, 충돌, 되돌리기, 복사, 문제 이동 시 저장, 라이트/다크).
