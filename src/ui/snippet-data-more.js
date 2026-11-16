// Copyright (c) dendr000. MIT License.
// C, C++, SQL 단축 입력(스니펫). snippet-data.js 가 합쳐서 쓴다. 문법은 snippet-data.js 머리말과 같다.
(function (root) {
  const cLoops = [
    { label: 'fori', detail: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}' },
    { label: 'forr', detail: '거꾸로 도는 for', body: 'for (int ${1:i} = ${2:n} - 1; ${1:i} >= 0; ${1:i}--) {\n\t$0\n}' },
    { label: 'for', detail: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}' },
    { label: 'while', detail: 'while 반복', body: 'while (${1:condition}) {\n\t$0\n}' },
    { label: 'wh', detail: 'while 반복', body: 'while (${1:condition}) {\n\t$0\n}' },
    { label: 'dowhile', detail: 'do while 반복', body: 'do {\n\t$0\n} while (${1:condition});' },
    { label: 'if', detail: 'if 문', body: 'if (${1:condition}) {\n\t$0\n}' },
    { label: 'ifelse', detail: 'if else 문', body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}' },
    { label: 'elseif', detail: 'else if 가지', body: 'else if (${1:condition}) {\n\t$0\n}' },
    { label: 'else', detail: 'else 가지', body: 'else {\n\t$0\n}' },
    { label: 'switch', detail: 'switch 문', body: 'switch (${1:value}) {\n\tcase ${2:1}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}' },
    { label: 'case', detail: 'switch 의 case', body: 'case ${1:1}:\n\t$0\n\tbreak;' },
    { label: 'struct', detail: '구조체', body: 'struct ${1:Name} {\n\t$0\n};' },
    { label: 'enum', detail: '열거형', body: 'enum ${1:Name} {\n\t$0\n};' },
    { label: 'swap', detail: '두 값 바꾸기(임시 변수)', body: 'int ${3:tmp} = ${1:a};\n${1:a} = ${2:b};\n${2:b} = ${3:tmp};$0' },
  ]

  const c = [
    { label: 'main', detail: 'main 함수', body: 'int main(void) {\n\t$0\n\treturn 0;\n}' },
    { label: 'inc', detail: '#include <stdio.h>', body: '#include <${1:stdio.h}>$0' },
    { label: 'incs', detail: '자주 쓰는 헤더 모음', body: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n$0' },
    { label: 'pf', detail: 'printf', body: 'printf("${1:%d}\\n", ${2});$0' },
    { label: 'printf', detail: 'printf', body: 'printf("${1:%d}\\n", ${2});$0' },
    { label: 'sf', detail: 'scanf', body: 'scanf("${1:%d}", &${2:n});$0' },
    { label: 'scanf', detail: 'scanf', body: 'scanf("${1:%d}", &${2:n});$0' },
    { label: 'scn', detail: 'int 하나 입력받기', body: 'int ${1:n};\nscanf("%d", &${1:n});$0' },
    { label: 'puts', detail: 'puts (줄바꿈 포함 출력)', body: 'puts(${1:"text"});$0' },
    { label: 'arr', detail: '입력받아 배열 채우기', body: 'int ${1:n};\nscanf("%d", &${1:n});\nint ${2:a}[${1:n}];\nfor (int i = 0; i < ${1:n}; i++) {\n\tscanf("%d", &${2:a}[i]);\n}\n$0' },
    { label: 'malloc', detail: '동적 배열 할당', body: 'int *${1:a} = (int *)malloc(sizeof(int) * ${2:n});$0' },
    { label: 'fn', detail: '함수', body: '${1:int} ${2:name}(${3}) {\n\t$0\n}' },
    { label: 'sol', detail: 'solution 함수', body: 'int solution(int ${1:n}) {\n\tint answer = 0;\n\t$0\n\treturn answer;\n}' },
    { label: 'typedef', detail: 'typedef struct', body: 'typedef struct {\n\t$0\n} ${1:Name};' },
    ...cLoops,
  ]

  const cpp = [
    { label: 'main', detail: 'main 함수', body: 'int main() {\n\t$0\n\treturn 0;\n}' },
    { label: 'inc', detail: '#include <iostream>', body: '#include <${1:iostream}>$0' },
    { label: 'incs', detail: '자주 쓰는 헤더 모음', body: '#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n$0' },
    { label: 'bits', detail: '#include <bits/stdc++.h> (gcc 전용)', body: '#include <bits/stdc++.h>\nusing namespace std;\n$0' },
    { label: 'cout', detail: 'cout 출력', body: 'cout << ${1} << "\\n";$0' },
    { label: 'cin', detail: 'cin 입력', body: 'cin >> ${1:n};$0' },
    { label: 'fast', detail: '입출력 속도 올리기', body: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);\n$0' },
    { label: 'scn', detail: 'int 하나 입력받기', body: 'int ${1:n};\ncin >> ${1:n};$0' },
    { label: 'vec', detail: 'vector 만들기', body: 'vector<${1:int}> ${2:v}(${3:n});$0' },
    { label: 'vin', detail: 'n 개를 입력받아 vector 채우기', body: 'int ${1:n};\ncin >> ${1:n};\nvector<int> ${2:v}(${1:n});\nfor (int i = 0; i < ${1:n}; i++) {\n\tcin >> ${2:v}[i];\n}\n$0' },
    { label: 'iter', detail: '범위 기반 for', body: 'for (${1:auto&} ${2:x} : ${3:v}) {\n\t$0\n}' },
    { label: 'foreach', detail: '범위 기반 for', body: 'for (${1:auto&} ${2:x} : ${3:v}) {\n\t$0\n}' },
    { label: 'sort', detail: 'sort', body: 'sort(${1:v}.begin(), ${1:v}.end());$0' },
    { label: 'rsort', detail: '내림차순 sort', body: 'sort(${1:v}.begin(), ${1:v}.end(), greater<>());$0' },
    { label: 'fn', detail: '함수', body: '${1:int} ${2:name}(${3}) {\n\t$0\n}' },
    { label: 'sol', detail: 'solution 함수', body: 'int solution(int ${1:n}) {\n\tint answer = 0;\n\t$0\n\treturn answer;\n}' },
    { label: 'class', detail: '클래스', body: 'class ${1:Name} {\npublic:\n\t$0\n};' },
    { label: 'try', detail: 'try catch', body: 'try {\n\t$0\n} catch (const exception& ${1:e}) {\n\tcerr << ${1:e}.what() << "\\n";\n}' },
    ...cLoops,
  ]

  // SQL: 한 줄 이름은 소문자 글자만(편집기 제안 규칙). 대문자 키워드는 member-completion 의 예약어 제안이 한다.
  const sql = [
    { label: 'sel', detail: 'SELECT ... FROM', body: 'SELECT ${1:*}\nFROM ${2:table};$0' },
    { label: 'selw', detail: 'SELECT ... WHERE', body: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};$0' },
    { label: 'selall', detail: 'SELECT * FROM', body: 'SELECT *\nFROM ${1:table};$0' },
    { label: 'cnt', detail: 'COUNT(*)', body: 'SELECT COUNT(*)\nFROM ${1:table}\nWHERE ${2:condition};$0' },
    { label: 'grp', detail: 'GROUP BY', body: 'SELECT ${1:column}, COUNT(*)\nFROM ${2:table}\nGROUP BY ${1:column};$0' },
    { label: 'grph', detail: 'GROUP BY ... HAVING', body: 'SELECT ${1:column}, COUNT(*)\nFROM ${2:table}\nGROUP BY ${1:column}\nHAVING COUNT(*) ${3:>= 2};$0' },
    { label: 'ord', detail: 'ORDER BY', body: 'ORDER BY ${1:column} ${2:DESC}$0' },
    { label: 'ordlim', detail: 'ORDER BY ... LIMIT', body: 'ORDER BY ${1:column} ${2:DESC}\nLIMIT ${3:1}$0' },
    { label: 'join', detail: 'INNER JOIN', body: 'SELECT ${1:a.*}\nFROM ${2:table_a} a\nJOIN ${3:table_b} b ON a.${4:id} = b.${5:id};$0' },
    { label: 'ljoin', detail: 'LEFT JOIN', body: 'SELECT ${1:a.*}\nFROM ${2:table_a} a\nLEFT JOIN ${3:table_b} b ON a.${4:id} = b.${5:id};$0' },
    { label: 'sub', detail: '서브쿼리 (IN)', body: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:column} IN (\n\tSELECT ${4:column}\n\tFROM ${5:other}\n);$0' },
    { label: 'cte', detail: 'WITH (공통 테이블 식)', body: 'WITH ${1:name} AS (\n\tSELECT ${2:*}\n\tFROM ${3:table}\n)\nSELECT *\nFROM ${1:name};$0' },
    { label: 'cse', detail: 'CASE WHEN', body: 'CASE\n\tWHEN ${1:condition} THEN ${2:value}\n\tELSE ${3:other}\nEND$0' },
    { label: 'rank', detail: '순위 (윈도 함수)', body: 'RANK() OVER (ORDER BY ${1:column} DESC)$0' },
    { label: 'rown', detail: '번호 매기기 (윈도 함수)', body: 'ROW_NUMBER() OVER (PARTITION BY ${1:column} ORDER BY ${2:column})$0' },
    { label: 'ins', detail: 'INSERT INTO', body: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});$0' },
    { label: 'upd', detail: 'UPDATE', body: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};$0' },
    { label: 'del', detail: 'DELETE', body: 'DELETE FROM ${1:table}\nWHERE ${2:condition};$0' },
    { label: 'crt', detail: 'CREATE TABLE', body: 'CREATE TABLE ${1:table} (\n\t${2:id} INTEGER PRIMARY KEY,\n\t${3:name} TEXT NOT NULL\n);$0' },
    { label: 'like', detail: 'LIKE 검색', body: "${1:column} LIKE '${2:%text%}'$0" },
    { label: 'between', detail: 'BETWEEN', body: '${1:column} BETWEEN ${2:a} AND ${3:b}$0' },
    { label: 'distinct', detail: '중복 제거', body: 'SELECT DISTINCT ${1:column}\nFROM ${2:table};$0' },
    { label: 'union', detail: 'UNION', body: 'SELECT ${1:*} FROM ${2:a}\nUNION\nSELECT ${1:*} FROM ${3:b};$0' },
  ]

  const api = { c, cpp, sql }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.snippetDataMore = api
})(typeof window !== 'undefined' ? window : globalThis)
