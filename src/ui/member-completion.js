// Copyright (c) dendr000. MIT License.
// "sc." "num." 처럼 점을 찍으면 메서드·속성을 제안한다. 목록과 타입 짐작은 member-data.js, 여기서는 Monaco 에 연결만 한다.
(function () {
  let registered = false

  const KEYWORDS = {
    java: 'abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try var void while String Integer Long Double Boolean Character Math System Scanner ArrayList HashMap HashSet LinkedList ArrayDeque Arrays Collections List Map Set Queue Deque StringBuilder Object Random BufferedReader InputStreamReader StringTokenizer Objects Iterator Optional record',
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Complex _Imaginary bool true false NULL include define ifdef ifndef endif pragma printf scanf puts putchar getchar gets fgets sprintf snprintf sscanf fprintf fscanf fopen fclose fread fwrite fputs fgetc fputc feof fflush malloc calloc realloc free exit abort atoi atol atof strtol strtod abs labs rand srand qsort bsearch strlen strcpy strncpy strcat strncat strcmp strncmp strchr strrchr strstr strtok memcpy memmove memset memcmp toupper tolower isalpha isdigit isalnum isspace isupper islower sqrt pow ceil floor round fabs sin cos tan log log10 exp size_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t INT_MAX INT_MIN LONG_MAX LONG_MIN UINT_MAX stdin stdout stderr EOF main argc argv FILE stdio.h stdlib.h string.h stdbool.h math.h ctype.h limits.h time.h stdint.h assert.h',
    cpp: 'alignas alignof and and_eq asm auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq override final include define ifdef ifndef endif pragma std cout cin cerr clog endl string wstring string_view vector list deque array forward_list map multimap unordered_map unordered_multimap set multiset unordered_set unordered_multiset stack queue priority_queue pair tuple make_pair make_tuple get tie bitset optional variant any shared_ptr unique_ptr weak_ptr make_shared make_unique function bind move forward swap sort stable_sort partial_sort nth_element reverse unique find find_if count count_if min max min_element max_element minmax accumulate iota fill copy transform for_each lower_bound upper_bound binary_search next_permutation prev_permutation gcd lcm abs sqrt pow ceil floor round to_string stoi stol stoll stod stoul getline begin end rbegin rend size empty push_back pop_back emplace_back front back insert erase clear greater less ios sync_with_stdio nullptr_t size_t int64_t uint64_t INT_MAX INT_MIN LLONG_MAX LLONG_MIN iostream vector string algorithm numeric map set queue stack cmath cstdio cstdlib cstring climits sstream fstream iomanip bits/stdc++.h main argc argv ifstream ofstream stringstream istringstream ostringstream setw setprecision fixed',
    sql: 'SELECT FROM WHERE GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET DISTINCT ALL AS AND OR NOT IN IS NULL LIKE ILIKE BETWEEN EXISTS ANY SOME CASE WHEN THEN ELSE END JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL ON USING UNION INTERSECT EXCEPT MINUS WITH RECURSIVE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW INDEX UNIQUE ALTER DROP ADD COLUMN RENAME TO TRUNCATE PRIMARY KEY FOREIGN REFERENCES CONSTRAINT DEFAULT CHECK AUTO_INCREMENT AUTOINCREMENT COMMIT ROLLBACK BEGIN TRANSACTION SAVEPOINT GRANT REVOKE COUNT SUM AVG MIN MAX ROUND FLOOR CEIL CEILING ABS MOD POWER SQRT LENGTH CHAR_LENGTH LOWER UPPER TRIM LTRIM RTRIM SUBSTR SUBSTRING REPLACE CONCAT INSTR POSITION LEFT RIGHT LPAD RPAD REVERSE COALESCE NULLIF IFNULL NVL NVL2 IIF IF CAST CONVERT DATE TIME DATETIME TIMESTAMP NOW CURRENT_DATE CURRENT_TIME CURRENT_TIMESTAMP DATE_FORMAT DATE_ADD DATE_SUB DATEDIFF TIMESTAMPDIFF EXTRACT YEAR MONTH DAY HOUR MINUTE SECOND STRFTIME TO_CHAR TO_DATE TO_NUMBER SYSDATE OVER PARTITION ROWS RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT ROW ROW_NUMBER RANK DENSE_RANK NTILE LAG LEAD FIRST_VALUE LAST_VALUE GROUP_CONCAT STRING_AGG LISTAGG INT INTEGER BIGINT SMALLINT TINYINT DECIMAL NUMERIC FLOAT DOUBLE REAL VARCHAR VARCHAR2 CHAR TEXT BOOLEAN BLOB TRUE FALSE NULLS FIRST LAST FETCH NEXT ONLY ROWNUM TOP DUAL PIVOT UNPIVOT ESCAPE COLLATE GLOB REGEXP',
    python: 'False None True and as assert break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print input range len int str float list dict set tuple sorted enumerate zip map filter sum min max abs',
    javascript: 'async await break case catch class const continue default do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof undefined var void while yield console Math Number String Array Object JSON Map Set Promise parseInt parseFloat',
  }

  // 자주 쓰는 예약어·클래스는 이 순서로 먼저 보인다. 나머지는 이름순.
  const COMMON = 'return if for while else int String new break continue public private static void class true false null System Math List ArrayList HashMap switch case try catch boolean double long char'.split(' ')
  const rank = (name) => {
    const i = COMMON.indexOf(name)
    return i < 0 ? '99' + name : String(i).padStart(2, '0')
  }

  function typeLabel(type) {
    if (!type) return undefined
    return type === 'array' ? '배열' : type
  }

  // 점이 없을 때의 제안: 같은 파일에 나온 이름(변수·메서드)과 언어 예약어. 언어 서버가 없어도 Ctrl+Space 로 뜬다.
  function wordSuggestions(monaco, model, position, word, language) {
    if (!word.word) return []
    const names = new Set(KEYWORDS[language].split(' '))
    const found = model.getValue().match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []
    for (const n of found) names.add(n)
    names.delete(word.word) // 지금 치는 글자 자체는 뺀다(다른 곳에 같은 이름이 있으면 아래에서 다시 들어옴)
    if (found.filter((n) => n === word.word).length > 1) names.add(word.word)
    const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
    const kw = new Set(KEYWORDS[language].split(' '))
    const source = model.getValue()
    return [...names].map((name) => ({
      label: name,
      // Java 는 선언을 읽어 변수 종류를 옆에 보여 준다(예: int, Scanner, 배열).
      detail: language === 'java' && source.length < 100000 && !kw.has(name) ? typeLabel(window.memberData.inferJavaType(source, name)) : undefined,
      kind: kw.has(name) ? monaco.languages.CompletionItemKind.Keyword : monaco.languages.CompletionItemKind.Variable,
      insertText: name,
      // 정렬: 파일 안의 변수·이름(0) -> 단축 입력(1, snippets.js) -> 언어 키워드(2)
      sortText: kw.has(name) ? '2' + rank(name) : '0' + name,
      range,
    }))
  }

  function registerMemberCompletion(monaco) {
    if (registered) return
    registered = true
    const asSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    for (const language of ['java', 'python', 'javascript', 'c', 'cpp', 'sql']) {
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', ' '],
        provideCompletionItems(model, position, context) {
          const word = model.getWordUntilPosition(position)
          const before = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: word.startColumn })
          // new 뒤(Java): 선언한 타입에 맞는 구현 클래스를 맨 위에 보여 준다. 괄호와 <> 까지 넣는다.
          if (language === 'java') {
            const classes = window.javaClasses ? window.javaClasses.parseJavaClasses(model.getValue()) : []
            const items = window.newCompletion.newSuggestions(before, classes.filter((c) => c.kind !== 'interface').map((c) => c.name))
            if (items) {
              const nr = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
              return {
                suggestions: items.map((i) => ({
                  label: i.name,
                  kind: monaco.languages.CompletionItemKind.Class,
                  detail: i.detail,
                  insertText: i.insert + '$0',
                  insertTextRules: asSnippet,
                  sortText: (i.preferred ? '0' : '1') + i.name,
                  preselect: i.preferred,
                  range: nr,
                })),
              }
            }
          }
          // 공백으로 열린 제안은 new 뒤에서만 쓴다(그 밖의 공백마다 목록이 뜨지 않게).
          if (context && context.triggerCharacter === ' ') return { suggestions: [] }
          if (!before.endsWith('.')) return { suggestions: wordSuggestions(monaco, model, position, word, language) }
          const receiver = window.memberData.receiverOf(before.slice(0, -1))
          const members = window.memberData.membersFor(language, model.getValue(), receiver, model.getOffsetAt(position))
          const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
          return {
            suggestions: members.map((item) => ({
              label: item.name,
              kind: item.params === null ? monaco.languages.CompletionItemKind.Field : monaco.languages.CompletionItemKind.Method,
              detail: item.detail,
              // 메서드는 괄호까지 넣고 괄호 안으로 커서를 옮긴다. 속성(length 등)은 이름만.
              insertText: item.params === null ? item.name : item.name + '(' + item.params + ')$0',
              insertTextRules: asSnippet,
              // 속성(length 등)을 메서드보다 먼저 보여 준다.
              sortText: (item.params === null ? '0' : '1') + item.name,
              range,
            })),
          }
        },
      })
    }
  }

  window.registerMemberCompletion = registerMemberCompletion
})()
