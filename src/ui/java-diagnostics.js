// Copyright (c) dendr000. MIT License.
// Java 코드의 흔한 실수를 컴파일 전에 표시한다: 타입 이름 오타(Stirng -> String)와 빠진 import(HashMap 을 import 없이 사용).
// 진짜 컴파일러가 아니라 정규식으로 읽는 간이 점검이라, 틀릴 확률이 낮은 것만 표시한다.
//   - 오타: 아는 표준 타입과 글자 하나·둘 차이(자리 바꿈 포함)이고, 직접 만든 클래스·import 한 이름이 아닌 대문자 이름
//   - 빠진 import: 표준 라이브러리 클래스를 쓰는데 import 가 없음
// 화면(DOM)을 모르는 순수 함수라 시험할 수 있다.
(function (root) {
  const jc = typeof module !== 'undefined' && module.exports ? require('./java-classes') : root.javaClasses

  // java.lang 은 import 가 필요 없다.
  const LANG = 'String Integer Long Double Float Short Byte Character Boolean Number Object Math System StringBuilder StringBuffer Thread Runnable Exception RuntimeException Error Throwable Iterable Comparable CharSequence Void Class Enum Record StackOverflowError ArithmeticException NullPointerException IllegalArgumentException IllegalStateException IndexOutOfBoundsException ArrayIndexOutOfBoundsException NumberFormatException ClassCastException InterruptedException Override Deprecated FunctionalInterface SuppressWarnings SafeVarargs'.split(' ')
  const PACKAGES = {
    'java.util': 'List ArrayList LinkedList Map HashMap TreeMap LinkedHashMap Set HashSet TreeSet LinkedHashSet Queue Deque ArrayDeque PriorityQueue Stack Vector Collection Collections Arrays Scanner Random Iterator ListIterator Optional Objects StringTokenizer BitSet Comparator NoSuchElementException EnumMap SortedMap SortedSet NavigableMap NavigableSet'.split(' '),
    'java.io': 'BufferedReader InputStreamReader PrintWriter BufferedWriter OutputStreamWriter IOException PrintStream InputStream OutputStream File FileReader FileWriter'.split(' '),
    'java.util.stream': 'Stream IntStream LongStream DoubleStream Collectors'.split(' '),
    'java.util.function': 'Function BiFunction Predicate Supplier Consumer BiConsumer UnaryOperator BinaryOperator'.split(' '),
  }
  const PACKAGE_OF = {}
  for (const [pkg, names] of Object.entries(PACKAGES)) for (const n of names) PACKAGE_OF[n] = pkg
  const ALL_KNOWN = [...LANG, ...Object.keys(PACKAGE_OF), 'Entry']
  const KNOWN = new Set(ALL_KNOWN)

  // 글자 하나 추가·삭제·바꾸기, 이웃한 두 글자 자리 바꾸기를 한 번으로 세는 거리(optimal string alignment)
  function distance(a, b) {
    const d = []
    for (let i = 0; i <= a.length; i++) {
      d[i] = [i]
      for (let j = 1; j <= b.length; j++) d[i][j] = i === 0 ? j : 0
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
    return d[a.length][b.length]
  }

  // 아는 타입 중 가장 가까운 것. 너무 멀면 null. 짧은 이름(4자 이하)은 거리 1, 그 이상은 2까지.
  function closestType(name) {
    const limit = name.length <= 4 ? 1 : 2
    let best = null
    let bestDist = limit + 1
    for (const known of ALL_KNOWN) {
      if (Math.abs(known.length - name.length) > limit) continue
      const dist = distance(name, known)
      if (dist < bestDist) {
        best = known
        bestDist = dist
      }
    }
    return best
  }

  function parseImports(code) {
    const wildcard = new Set()
    const single = new Set()
    const re = /\bimport\s+(?:static\s+)?([\w.]+?)(\.\*)?\s*;/g
    let m
    while ((m = re.exec(code))) {
      if (m[2]) wildcard.add(m[1])
      else single.add(m[1])
    }
    return { wildcard, single }
  }

  // 반환: [{ start, end(소스 안 위치), severity: 'error' | 'warning', message }]
  function analyzeJava(source) {
    if (typeof source !== 'string' || source === '' || source.length > 200000) return []
    let code = jc.blank(source)
    // import·package 줄은 점검 대상에서 빼되, 글자 위치는 그대로 유지한다.
    const imports = parseImports(code)
    code = code.replace(/\b(?:import|package)\s[^;]*;/g, (s) => s.replace(/[^\n]/g, ' '))
    const userNames = new Set(jc.parseJavaClasses(source).map((c) => c.name))
    const importedSimple = new Set([...imports.single].map((n) => n.split('.').pop()))
    const result = []
    const re = /(?<![\w$.])([A-Z][A-Za-z0-9_$]*)/g
    let m
    while ((m = re.exec(code)) && result.length < 60) {
      const name = m[1]
      const start = m.index
      const end = start + name.length
      if (name.length === 1) continue // T, E, K, V 같은 타입 매개변수
      if (/^[A-Z][A-Z0-9_]*$/.test(name)) continue // 상수 이름
      if (userNames.has(name) || importedSimple.has(name)) continue
      if (KNOWN.has(name)) {
        const pkg = PACKAGE_OF[name]
        if (pkg && !imports.wildcard.has(pkg) && !imports.single.has(pkg + '.' + name)) {
          result.push({ start, end, severity: 'warning', message: `${name} 은(는) import 가 필요합니다. 파일 맨 위에 import ${pkg}.${name}; 또는 import ${pkg}.*; 를 추가하세요.` })
        }
        continue
      }
      const guess = closestType(name)
      if (guess) result.push({ start, end, severity: 'error', message: `알 수 없는 타입 '${name}' 입니다. '${guess}' 를 잘못 쓴 것 아닌가요?` })
    }
    return result
  }

  const api = { analyzeJava, closestType, distance, KNOWN }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.javaDiagnostics = api
})(typeof window !== 'undefined' ? window : globalThis)
