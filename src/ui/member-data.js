// Copyright (c) dendr000. MIT License.
// "변수." 뒤에 나오는 메서드·속성 제안 목록과, 선언을 읽어 변수 타입을 짐작하는 순수 함수.
// 언어 서비스(진짜 타입 분석)가 없으므로 같은 파일 안의 선언(`Scanner sc`, `int[] num`)을 정규식으로 읽는다.
// 항목: [이름, 설명, 괄호 안 자리표시(없으면 '' = 빈 괄호, null = 괄호 없는 속성)]
(function (root) {
  const jc = typeof module !== 'undefined' && module.exports ? require('./java-classes') : root.javaClasses
  const m = (name, detail, params) => ({ name, detail, params: params === undefined ? '' : params })

  const STRING = [
    m('length', '글자 수', ''), m('charAt', '위치의 글자', '${1:i}'), m('substring', '일부 잘라내기', '${1:from}, ${2:to}'),
    m('indexOf', '처음 위치', '${1:s}'), m('lastIndexOf', '마지막 위치', '${1:s}'), m('equals', '내용이 같은가', '${1:other}'),
    m('equalsIgnoreCase', '대소문자 무시 비교', '${1:other}'), m('compareTo', '사전순 비교', '${1:other}'), m('contains', '포함하는가', '${1:s}'),
    m('startsWith', '시작이 같은가', '${1:s}'), m('endsWith', '끝이 같은가', '${1:s}'), m('isEmpty', '비었는가'), m('isBlank', '공백뿐인가'),
    m('toUpperCase', '대문자로'), m('toLowerCase', '소문자로'), m('trim', '앞뒤 공백 제거'), m('split', '나누기', '${1:" "}'),
    m('replace', '바꾸기', '${1:old}, ${2:new}'), m('toCharArray', '글자 배열로'), m('repeat', '반복', '${1:n}'), m('concat', '이어 붙이기', '${1:s}'),
    m('chars', '글자 스트림'), m('format', '서식 문자열(static)', '${1:"%d"}, ${2}'), m('valueOf', '문자열로 바꾸기(static)', '${1:x}'),
  ]
  const SCANNER = [
    m('nextInt', '정수 읽기'), m('nextLong', 'long 읽기'), m('nextDouble', '실수 읽기'), m('nextBoolean', '참/거짓 읽기'),
    m('next', '단어 하나 읽기'), m('nextLine', '한 줄 읽기'), m('hasNext', '읽을 단어가 있는가'), m('hasNextInt', '읽을 정수가 있는가'),
    m('hasNextLine', '읽을 줄이 있는가'), m('close', '닫기'),
  ]
  const BUILDER = [
    m('append', '뒤에 붙이기', '${1:x}'), m('insert', '중간에 넣기', '${1:index}, ${2:x}'), m('reverse', '뒤집기'), m('toString', '문자열로'),
    m('length', '글자 수'), m('charAt', '위치의 글자', '${1:i}'), m('deleteCharAt', '글자 지우기', '${1:i}'), m('delete', '구간 지우기', '${1:from}, ${2:to}'),
    m('setLength', '길이 바꾸기', '${1:n}'), m('setCharAt', '글자 바꾸기', '${1:i}, ${2:c}'), m('indexOf', '처음 위치', '${1:s}'),
  ]
  const LIST = [
    m('add', '추가', '${1:x}'), m('get', '위치의 값', '${1:i}'), m('set', '값 바꾸기', '${1:i}, ${2:x}'), m('remove', '지우기', '${1:x}'),
    m('size', '개수'), m('isEmpty', '비었는가'), m('contains', '포함하는가', '${1:x}'), m('indexOf', '처음 위치', '${1:x}'), m('clear', '모두 지우기'),
    m('addAll', '모두 추가', '${1:other}'), m('sort', '정렬', '${1:null}'), m('forEach', '반복', '${1:x -> }'), m('stream', '스트림'),
    m('subList', '구간', '${1:from}, ${2:to}'), m('toArray', '배열로'), m('iterator', '반복자'),
  ]
  const MAP = [
    m('put', '넣기', '${1:key}, ${2:value}'), m('get', '값 얻기', '${1:key}'), m('getOrDefault', '없으면 기본값', '${1:key}, ${2:def}'),
    m('containsKey', '키가 있는가', '${1:key}'), m('containsValue', '값이 있는가', '${1:value}'), m('remove', '지우기', '${1:key}'),
    m('size', '개수'), m('isEmpty', '비었는가'), m('keySet', '키 모음'), m('values', '값 모음'), m('entrySet', '키-값 모음'),
    m('putIfAbsent', '없을 때만 넣기', '${1:key}, ${2:value}'), m('merge', '합치기', '${1:key}, ${2:value}, ${3:Integer::sum}'), m('clear', '모두 지우기'),
    m('forEach', '반복', '${1:(k, v) -> }'),
  ]
  const SET = [
    m('add', '추가', '${1:x}'), m('contains', '포함하는가', '${1:x}'), m('remove', '지우기', '${1:x}'), m('size', '개수'), m('isEmpty', '비었는가'),
    m('clear', '모두 지우기'), m('addAll', '모두 추가', '${1:other}'), m('retainAll', '교집합만 남기기', '${1:other}'), m('iterator', '반복자'),
    m('first', '가장 작은 값(TreeSet)'), m('last', '가장 큰 값(TreeSet)'),
  ]
  const DEQUE = [
    m('add', '추가', '${1:x}'), m('offer', '추가', '${1:x}'), m('poll', '꺼내기(없으면 null)'), m('peek', '맨 앞 보기'), m('push', '스택에 넣기', '${1:x}'),
    m('pop', '스택에서 꺼내기'), m('addFirst', '앞에 넣기', '${1:x}'), m('addLast', '뒤에 넣기', '${1:x}'), m('pollFirst', '앞에서 꺼내기'),
    m('pollLast', '뒤에서 꺼내기'), m('peekFirst', '맨 앞 보기'), m('peekLast', '맨 뒤 보기'), m('size', '개수'), m('isEmpty', '비었는가'), m('clear', '모두 지우기'),
  ]
  const ARRAY = [m('length', '배열 길이', null), m('clone', '복사')]
  const MATH = [
    m('max', '큰 값', '${1:a}, ${2:b}'), m('min', '작은 값', '${1:a}, ${2:b}'), m('abs', '절댓값', '${1:x}'), m('pow', '거듭제곱', '${1:a}, ${2:b}'),
    m('sqrt', '제곱근', '${1:x}'), m('floor', '내림', '${1:x}'), m('ceil', '올림', '${1:x}'), m('round', '반올림', '${1:x}'), m('random', '난수'),
    m('floorMod', '나머지(음수 안전)', '${1:a}, ${2:b}'), m('log', '자연로그', '${1:x}'), m('PI', '원주율', null),
  ]
  const INTEGER = [
    m('parseInt', '문자열을 정수로', '${1:s}'), m('valueOf', '정수 객체로', '${1:x}'), m('toString', '문자열로', '${1:n}'), m('toBinaryString', '2진수 문자열', '${1:n}'),
    m('max', '큰 값', '${1:a}, ${2:b}'), m('min', '작은 값', '${1:a}, ${2:b}'), m('compare', '비교', '${1:a}, ${2:b}'), m('bitCount', '1 비트 수', '${1:n}'),
    m('MAX_VALUE', '최댓값', null), m('MIN_VALUE', '최솟값', null),
  ]
  const ARRAYS = [
    m('sort', '정렬', '${1:arr}'), m('toString', '문자열로', '${1:arr}'), m('deepToString', '다차원 문자열로', '${1:arr}'), m('fill', '채우기', '${1:arr}, ${2:value}'),
    m('copyOf', '복사', '${1:arr}, ${2:n}'), m('copyOfRange', '구간 복사', '${1:arr}, ${2:from}, ${3:to}'), m('asList', '리스트로', '${1:arr}'),
    m('equals', '같은가', '${1:a}, ${2:b}'), m('stream', '스트림', '${1:arr}'), m('binarySearch', '이진 탐색', '${1:arr}, ${2:key}'),
  ]
  const COLLECTIONS = [
    m('sort', '정렬', '${1:list}'), m('reverse', '뒤집기', '${1:list}'), m('max', '최댓값', '${1:c}'), m('min', '최솟값', '${1:c}'), m('swap', '두 값 바꾸기', '${1:list}, ${2:i}, ${3:j}'),
    m('reverseOrder', '내림차순 비교자'), m('unmodifiableList', '수정 불가 리스트', '${1:list}'), m('frequency', '개수 세기', '${1:c}, ${2:x}'),
  ]
  const PRINT = [m('println', '한 줄 출력', '${1}'), m('print', '출력', '${1}'), m('printf', '서식 출력', '${1:"%d%n"}, ${2}'), m('flush', '비우기')]
  const SYSTEM = [m('out', '표준 출력', null), m('in', '표준 입력', null), m('err', '오류 출력', null), m('currentTimeMillis', '현재 시각(ms)'), m('nanoTime', '나노초 시각'), m('exit', '종료', '${1:0}'), m('arraycopy', '배열 복사', '${1:src}, ${2:0}, ${3:dest}, ${4:0}, ${5:n}')]
  const CHARACTER = [
    m('isDigit', '숫자인가', '${1:c}'), m('isLetter', '글자인가', '${1:c}'), m('isUpperCase', '대문자인가', '${1:c}'), m('isLowerCase', '소문자인가', '${1:c}'),
    m('toUpperCase', '대문자로', '${1:c}'), m('toLowerCase', '소문자로', '${1:c}'), m('getNumericValue', '숫자 값', '${1:c}'), m('isWhitespace', '공백인가', '${1:c}'),
  ]
  const OBJECT = [m('toString', '문자열로'), m('equals', '같은가', '${1:other}'), m('hashCode', '해시 값'), m('getClass', '클래스 정보')]

  const RANDOM = [m('nextInt', '난수 정수 (0 이상 n 미만)', '${1:n}'), m('nextDouble', '난수 실수 (0 이상 1 미만)'), m('nextBoolean', '난수 참/거짓'), m('nextLong', '난수 long'), m('setSeed', '시드 지정', '${1:seed}')]
  const READER = [m('readLine', '한 줄 읽기 (없으면 null)'), m('read', '글자 하나 읽기'), m('ready', '읽을 것이 있는가'), m('lines', '줄 스트림'), m('close', '닫기')]
  const TOKENIZER = [m('nextToken', '다음 토큰'), m('hasMoreTokens', '토큰이 더 있는가'), m('countTokens', '남은 토큰 수')]
  const INTEGER_OBJ = [m('intValue', 'int 값'), m('longValue', 'long 값'), m('doubleValue', 'double 값'), m('compareTo', '비교', '${1:other}'), ...OBJECT]
  const ITERATOR = [m('hasNext', '다음 요소가 있는가'), m('next', '다음 요소'), m('remove', '현재 요소 삭제')]
  const OBJECTS = [m('equals', '같은가 (null 안전)', '${1:a}, ${2:b}'), m('hash', '해시 값', '${1:a}, ${2:b}'), m('requireNonNull', 'null 이면 예외', '${1:x}'), m('isNull', 'null 인가', '${1:x}'), m('toString', '문자열로', '${1:x}')]

  // 변수 타입(제네릭 제외한 이름) -> 목록
  const BY_TYPE = {
    String: STRING, Scanner: SCANNER, StringBuilder: BUILDER, StringBuffer: BUILDER,
    List: LIST, ArrayList: LIST, LinkedList: [...LIST, ...DEQUE], Collection: LIST, Vector: LIST,
    Map: MAP, HashMap: MAP, TreeMap: MAP, LinkedHashMap: MAP,
    Set: SET, HashSet: SET, TreeSet: SET, LinkedHashSet: SET,
    Deque: DEQUE, ArrayDeque: DEQUE, Queue: DEQUE, Stack: [...DEQUE, ...LIST], PriorityQueue: DEQUE,
    PrintStream: PRINT,
    Random: RANDOM, BufferedReader: READER, StringTokenizer: TOKENIZER, Integer: INTEGER_OBJ, Long: INTEGER_OBJ, Double: INTEGER_OBJ, Iterator: ITERATOR,
  }
  // 변수가 아니라 클래스 이름 자체에 붙는 것(static)
  const STATIC = { Math: MATH, Integer: INTEGER, Long: INTEGER, Double: INTEGER, Arrays: ARRAYS, Collections: COLLECTIONS, System: SYSTEM, String: STRING, Character: CHARACTER, Objects: OBJECTS, 'System.out': PRINT, 'System.err': PRINT }

  const PY_STR = ['upper', 'lower', 'strip', 'split', 'join', 'replace', 'find', 'startswith', 'endswith', 'isdigit', 'isalpha', 'format', 'count', 'index', 'lstrip', 'rstrip', 'title', 'zfill']
  const PY_LIST = ['append', 'extend', 'insert', 'remove', 'pop', 'sort', 'reverse', 'index', 'count', 'copy', 'clear']
  const PY_DICT = ['keys', 'values', 'items', 'get', 'pop', 'update', 'setdefault', 'clear', 'copy']
  const PY_SET = ['add', 'discard', 'union', 'intersection', 'difference', 'update']
  const JS_ARRAY = ['push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'includes', 'indexOf', 'join', 'sort', 'reverse', 'concat', 'some', 'every', 'flat', 'fill', 'length']
  const JS_STRING = ['length', 'charAt', 'charCodeAt', 'substring', 'slice', 'indexOf', 'includes', 'split', 'trim', 'toUpperCase', 'toLowerCase', 'replace', 'startsWith', 'endsWith', 'repeat', 'padStart', 'padEnd']
  const JS_MATH = ['max', 'min', 'abs', 'floor', 'ceil', 'round', 'sqrt', 'pow', 'random', 'PI']

  const dedupe = (names, detail) => [...new Set(names)].map((name) => ({ name, detail, params: name === 'length' || name === 'PI' ? null : '' }))
  const GENERIC = {
    python: dedupe([...PY_STR, ...PY_LIST, ...PY_DICT, ...PY_SET], '메서드'),
    javascript: dedupe([...JS_ARRAY, ...JS_STRING], '메서드'),
  }
  const JS_STATIC = { Math: dedupe(JS_MATH, 'Math'), console: dedupe(['log', 'error', 'warn', 'table'], 'console'), JSON: dedupe(['stringify', 'parse'], 'JSON'), Object: dedupe(['keys', 'values', 'entries', 'assign'], 'Object'), Number: dedupe(['parseInt', 'parseFloat', 'isInteger', 'MAX_SAFE_INTEGER'], 'Number') }
  const PY_STATIC = { math: dedupe(['sqrt', 'floor', 'ceil', 'pow', 'gcd', 'pi', 'log', 'factorial'], 'math'), sys: dedupe(['stdin', 'stdout', 'exit', 'setrecursionlimit'], 'sys') }

  const PY_BY_KIND = { string: dedupe(PY_STR, '문자열'), list: dedupe(PY_LIST, '리스트'), dict: dedupe(PY_DICT, '사전'), set: dedupe(PY_SET, '집합') }
  const JS_BY_KIND = { string: dedupe(JS_STRING, '문자열'), list: dedupe(JS_ARRAY, '배열'), object: dedupe(['hasOwnProperty', 'toString'], '객체'), map: dedupe(['get', 'set', 'has', 'delete', 'clear', 'size', 'keys', 'values', 'entries', 'forEach'], 'Map'), jsset: dedupe(['add', 'has', 'delete', 'clear', 'size', 'values', 'forEach'], 'Set') }
  const IDENT = '[A-Za-z_$][\\w$]*'

  // 선언을 읽어 변수 name 의 타입 이름을 돌려준다. 못 찾으면 null.
  //   `Scanner sc` -> 'Scanner', `int[] num` / `int num[]` -> 'array', `List<Integer> list` -> 'List', `var sc = new Scanner(..)` -> 'Scanner'
  function inferJavaType(source, name) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
    const esc = name.replace(/[$]/g, '\\$')
    const arrayDecl = new RegExp('\\b' + IDENT + '(?:<[^;=()]*>)?\\s*(?:\\[\\s*\\]\\s*)+' + esc + '\\b').test(code) || new RegExp('\\b' + IDENT + '\\s+' + esc + '\\s*\\[').test(code)
    if (arrayDecl) return 'array'
    const varNew = new RegExp('\\bvar\\s+' + esc + '\\s*=\\s*new\\s+(' + IDENT + ')').exec(code)
    if (varNew) return varNew[1]
    const typed = new RegExp('\\b(' + IDENT + ')(?:<[^;=()]*>)?\\s+' + esc + '\\s*(?=[=;,):])').exec(code)
    if (typed && !['return', 'new', 'else', 'case', 'throw'].includes(typed[1])) return typed[1]
    return null
  }

  // lineBeforeDot: 커서 앞 한 줄에서 마지막 '.' 앞까지(예: "int a = sc"). 받는 식(수신자)을 뽑는다.
  function receiverOf(lineBeforeDot) {
    // 메서드 호출 결과: "sc.nextLine()" 처럼 한 단계 호출까지 받는다.
    const call = new RegExp('(' + IDENT + '\\.' + IDENT + '\\((?:[^()]|\\([^()]*\\))*\\))\\s*$').exec(lineBeforeDot)
    if (call) return call[1]
    const dotted = new RegExp('(' + IDENT + '(?:\\.' + IDENT + ')?)\\s*$').exec(lineBeforeDot)
    return dotted ? dotted[1] : null
  }

  const RETURNS_STRING = ['next', 'nextLine', 'toString', 'substring', 'trim', 'strip', 'toUpperCase', 'toLowerCase', 'replace', 'repeat', 'concat', 'valueOf', 'join', 'reverse']
  const RETURNS_ARRAY = ['split', 'toCharArray', 'toArray']

  // "sc.nextLine()" -> 반환 종류('String' 또는 'array'), 모르면 null
  function callResultType(receiver) {
    const m = new RegExp('^' + IDENT + '\\.(' + IDENT + ')\\(').exec(receiver)
    if (!m) return null
    if (RETURNS_STRING.includes(m[1])) return 'String'
    if (RETURNS_ARRAY.includes(m[1])) return 'array'
    return null
  }

  // Python, JS: 대입된 값을 보고 문자열, 리스트, 사전, 집합인지 짐작한다.
  function inferScriptKind(language, source, name) {
    const esc = name.replace(/[$]/g, '\\$')
    const m = new RegExp('\\b' + esc + '\\s*=\\s*([^\\n;]*)').exec(source)
    if (!m) return null
    const v = m[1].trim()
    if (/\.split\(/.test(v) || /^\[/.test(v) || /^(list|Array|sorted|range)\(/.test(v) || /^new Array/.test(v)) return 'list'
    if (/^["'`]/.test(v) || /^(input|str|String)\(/.test(v)) return 'string'
    if (/^\{\s*\}/.test(v) || /^dict\(/.test(v) || /^\{[^}]*:/.test(v)) return language === 'python' ? 'dict' : 'object'
    if (/^set\(/.test(v) || /^\{[^:}]+\}/.test(v)) return 'set'
    if (/^new Map/.test(v)) return 'map'
    if (/^new Set/.test(v)) return 'jsset'
    return null
  }

  // 반환: [{ name, detail, params }]
  // 사용자 클래스의 멤버를 목록 항목으로. staticOnly 면 static 과 enum 상수만. 인스턴스 변수에서는 모두(Java 는 static 도 허용).
  function userMembers(cls, staticOnly) {
    return cls.members
      .filter((x) => !staticOnly || x.isStatic)
      .concat(staticOnly ? [] : OBJECT.map((o) => ({ ...o, isStatic: false })).filter((o) => !cls.members.some((x) => x.name === o.name)))
      .map((x) => ({ name: x.name, detail: x.detail, params: x.params }))
  }

  // 받는 식의 타입 이름. this, 내 클래스의 필드·메서드 결과(p.name, p.getName()), 선언 읽기 순으로 본다.
  function resolveJavaType(source, receiver, offset, classes) {
    const byName = (n) => classes.find((c) => c.name === n)
    if (receiver === 'this') {
      const c = typeof offset === 'number' ? jc.enclosingClass(classes, offset) : null
      return c ? c.name : null
    }
    const typeOfName = (n) => (n === 'this' ? resolveJavaType(source, 'this', offset, classes) : inferJavaType(source, n))
    const call = new RegExp('^(' + IDENT + ')\\.(' + IDENT + ')\\(').exec(receiver)
    if (call) {
      const cls = byName(typeOfName(call[1])) || (byName(call[1]) && !hasDeclaration(source, call[1]) ? byName(call[1]) : null)
      const member = cls && cls.members.find((x) => x.name === call[2] && x.params !== null)
      if (member) return member.type
      return callResultType(receiver)
    }
    const dotted = new RegExp('^(' + IDENT + ')\\.(' + IDENT + ')$').exec(receiver)
    if (dotted) {
      const cls = byName(typeOfName(dotted[1]))
      const member = cls && cls.members.find((x) => x.name === dotted[2] && x.params === null)
      if (member) return member.type
      return null
    }
    // 단독 이름: 선언을 읽는다. 선언이 없고 클래스 안이라면 그 클래스의 필드를 본다(`name.` 처럼 this 없이 쓴 경우).
    const declared = inferJavaType(source, receiver)
    if (declared) return declared
    const cur = typeof offset === 'number' ? jc.enclosingClass(classes, offset) : null
    const field = cur && cur.members.find((x) => x.name === receiver && x.params === null)
    return field ? field.type : null
  }

  const PRIMITIVES = ['int', 'long', 'double', 'float', 'short', 'byte', 'char', 'boolean']

  function membersFor(language, source, receiver, offset) {
    if (!receiver) return []
    if (language === 'java') {
      const classes = jc ? jc.parseJavaClasses(source) : []
      const byName = (n) => classes.find((c) => c.name === n)
      // 내가 만든 클래스 이름 자체(Person.)는 static 멤버와 enum 상수만
      if (byName(receiver) && !hasDeclaration(source, receiver)) return userMembers(byName(receiver), true)
      if (STATIC[receiver] && !hasDeclaration(source, receiver)) return STATIC[receiver]
      const type = resolveJavaType(source, receiver, offset, classes)
      if (type === 'array') return ARRAY
      if (type && byName(type)) return userMembers(byName(type), false)
      if (type && BY_TYPE[type]) return BY_TYPE[type]
      if (type && PRIMITIVES.includes(type)) return [] // int, double 등은 점 뒤에 붙일 것이 없다
      if (type) return OBJECT
      return []
    }
    if (language === 'python') {
      if (PY_STATIC[receiver]) return PY_STATIC[receiver]
      const k = inferScriptKind('python', source, receiver)
      return PY_BY_KIND[k] || GENERIC.python
    }
    if (language === 'javascript') {
      if (JS_STATIC[receiver]) return JS_STATIC[receiver]
      const k = inferScriptKind('javascript', source, receiver)
      return JS_BY_KIND[k] || GENERIC.javascript
    }
    if (language === 'cpp') {
      if (CPP_STATIC[receiver]) return CPP_STATIC[receiver]
      const t = inferCppType(source, receiver)
      return t ? CPP_BY_TYPE[t] : []
    }
    return []
  }

  // C++ 표준 라이브러리 컨테이너 멤버. 선언(vector<int> v, string s ...)을 읽어 짐작한다.
  const CPP_STRING = [
    m('size', '글자 수'), m('length', '글자 수'), m('empty', '비었는가'), m('substr', '일부 잘라내기', '${1:pos}, ${2:len}'), m('find', '위치 찾기 (없으면 string::npos)', '${1:str}'),
    m('push_back', '글자 붙이기', '${1:c}'), m('pop_back', '마지막 글자 지우기'), m('append', '이어 붙이기', '${1:str}'), m('insert', '끼워 넣기', '${1:pos}, ${2:str}'), m('erase', '지우기', '${1:pos}, ${2:len}'),
    m('replace', '바꾸기', '${1:pos}, ${2:len}, ${3:str}'), m('compare', '비교', '${1:other}'), m('c_str', 'C 문자열로'), m('front', '첫 글자'), m('back', '마지막 글자'), m('clear', '비우기'),
    m('begin', '시작 반복자'), m('end', '끝 반복자'), m('rbegin', '뒤쪽 시작 반복자'), m('rend', '뒤쪽 끝 반복자'), m('at', '위치의 글자', '${1:i}'),
  ]
  const CPP_VECTOR = [
    m('size', '원소 수'), m('empty', '비었는가'), m('push_back', '끝에 넣기', '${1:x}'), m('emplace_back', '끝에 바로 만들어 넣기', '${1}'), m('pop_back', '마지막 지우기'),
    m('front', '첫 원소'), m('back', '마지막 원소'), m('at', '위치의 원소', '${1:i}'), m('clear', '비우기'), m('resize', '크기 바꾸기', '${1:n}'), m('reserve', '자리 미리 확보', '${1:n}'),
    m('insert', '끼워 넣기', '${1:it}, ${2:x}'), m('erase', '지우기', '${1:it}'), m('begin', '시작 반복자'), m('end', '끝 반복자'), m('rbegin', '뒤쪽 시작 반복자'), m('rend', '뒤쪽 끝 반복자'), m('assign', '채우기', '${1:n}, ${2:x}'), m('swap', '바꾸기', '${1:other}'), m('data', '원본 포인터'),
  ]
  const CPP_MAP = [
    m('size', '항목 수'), m('empty', '비었는가'), m('count', '키 개수(0 또는 1)', '${1:key}'), m('find', '키 찾기(없으면 end)', '${1:key}'), m('insert', '넣기', '${1:pair}'), m('emplace', '바로 만들어 넣기', '${1:key}, ${2:value}'),
    m('erase', '지우기', '${1:key}'), m('clear', '비우기'), m('at', '키의 값', '${1:key}'), m('begin', '시작 반복자'), m('end', '끝 반복자'), m('lower_bound', '키 이상의 첫 위치', '${1:key}'), m('upper_bound', '키 초과의 첫 위치', '${1:key}'),
  ]
  const CPP_SET = [
    m('size', '원소 수'), m('empty', '비었는가'), m('insert', '넣기', '${1:x}'), m('count', '개수', '${1:x}'), m('find', '찾기(없으면 end)', '${1:x}'), m('erase', '지우기', '${1:x}'), m('clear', '비우기'),
    m('begin', '시작 반복자'), m('end', '끝 반복자'), m('lower_bound', '이상의 첫 위치', '${1:x}'), m('upper_bound', '초과의 첫 위치', '${1:x}'),
  ]
  const CPP_QUEUE = [m('size', '원소 수'), m('empty', '비었는가'), m('push', '넣기', '${1:x}'), m('pop', '꺼내 버리기'), m('front', '맨 앞'), m('back', '맨 뒤'), m('emplace', '바로 만들어 넣기', '${1}')]
  const CPP_STACK = [m('size', '원소 수'), m('empty', '비었는가'), m('push', '넣기', '${1:x}'), m('pop', '꺼내 버리기'), m('top', '맨 위'), m('emplace', '바로 만들어 넣기', '${1}')]
  const CPP_PQ = [m('size', '원소 수'), m('empty', '비었는가'), m('push', '넣기', '${1:x}'), m('pop', '꺼내 버리기'), m('top', '가장 큰(우선) 원소'), m('emplace', '바로 만들어 넣기', '${1}')]
  const CPP_DEQUE = [...CPP_VECTOR, m('push_front', '앞에 넣기', '${1:x}'), m('pop_front', '앞 지우기'), m('emplace_front', '앞에 바로 만들어 넣기', '${1}')]
  const CPP_BY_TYPE = { string: CPP_STRING, wstring: CPP_STRING, vector: CPP_VECTOR, array: CPP_VECTOR, list: CPP_DEQUE, deque: CPP_DEQUE, map: CPP_MAP, unordered_map: CPP_MAP, multimap: CPP_MAP, set: CPP_SET, unordered_set: CPP_SET, multiset: CPP_SET, queue: CPP_QUEUE, stack: CPP_STACK, priority_queue: CPP_PQ }
  const CPP_STATIC = {
    cout: [m('flush', '출력 비우기'), m('precision', '소수 자릿수', '${1:n}'), m('width', '폭', '${1:n}'), m('put', '글자 하나', '${1:c}'), m('write', '바이트 쓰기', '${1:buf}, ${2:n}')],
    cin: [m('get', '글자 하나 읽기'), m('ignore', '건너뛰기', ''), m('peek', '다음 글자 보기'), m('eof', '끝인가'), m('fail', '실패했는가'), m('clear', '상태 지우기'), m('tie', '묶기', '${1:nullptr}'), m('sync_with_stdio', '동기화 설정', '${1:false}')],
    std: ['cout', 'cin', 'cerr', 'endl', 'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set', 'queue', 'stack', 'priority_queue', 'deque', 'pair', 'sort', 'reverse', 'max', 'min', 'swap', 'abs', 'to_string', 'stoi', 'getline', 'accumulate', 'find', 'count', 'unique', 'lower_bound', 'upper_bound', 'make_pair', 'greater', 'less', 'iota', 'fill', 'move', 'gcd', 'lcm'].map((n) => m(n, 'std::' + n, null)),
  }
  function inferCppType(source, name) {
    const esc = name.replace(/[$]/g, '\\$&')
    const re = new RegExp('\\b(vector|string|wstring|array|list|deque|map|unordered_map|multimap|set|unordered_set|multiset|queue|stack|priority_queue)\\b[^;(){}]*?[\\s>&*]' + esc + '\\s*(?:[=;,({\\[)]|$)', 'm')
    const mm = re.exec(source)
    return mm ? mm[1] : null
  }

  function hasDeclaration(source, name) {
    return new RegExp('\\b' + IDENT + '(?:<[^;=()]*>)?(?:\\[\\s*\\])*\\s+' + name.replace(/[$.]/g, '\\$&') + '\\s*[=;,)]').test(source)
  }

  const api = { inferJavaType, inferScriptKind, callResultType, receiverOf, membersFor, BY_TYPE, STATIC }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.memberData = api
})(typeof window !== 'undefined' ? window : globalThis)
