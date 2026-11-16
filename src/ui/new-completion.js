// Copyright (c) dendr000. MIT License.
// Java 에서 new 뒤에 올 클래스 제안과, 제네릭 꺾쇠를 칠 때 닫는 꺾쇠를 자동으로 넣을지 판단한다. 화면(DOM)을 모르는 순수 함수.
(function (root) {
  // 이름, 제네릭 여부(<> 를 붙임), 괄호 안 기본 자리표시
  const NEWABLE = [
    ['ArrayList', true, ''], ['LinkedList', true, ''], ['HashMap', true, ''], ['TreeMap', true, ''], ['LinkedHashMap', true, ''],
    ['HashSet', true, ''], ['TreeSet', true, ''], ['LinkedHashSet', true, ''], ['ArrayDeque', true, ''], ['PriorityQueue', true, ''], ['Stack', true, ''],
    ['StringBuilder', false, ''], ['Scanner', false, '${1:System.in}'], ['Random', false, ''], ['String', false, '${1}'],
    ['BufferedReader', false, '${1:new InputStreamReader(System.in)}'], ['InputStreamReader', false, '${1:System.in}'], ['StringTokenizer', false, '${1:line}'], ['Object', false, ''],
  ]
  // 인터페이스로 선언했을 때 흔히 쓰는 구현 클래스
  const PREFERRED = { List: 'ArrayList', Collection: 'ArrayList', Map: 'HashMap', Set: 'HashSet', Queue: 'LinkedList', Deque: 'ArrayDeque', SortedMap: 'TreeMap', SortedSet: 'TreeSet' }

  // before: 커서가 있는 줄에서 단어 시작 전까지의 글자. new 바로 뒤가 아니면 null.
  // 반환: [{ name, insert(스니펫), detail, preferred }]
  function newSuggestions(before, userClassNames) {
    if (!/\bnew\s+$/.test(before)) return null
    // List<String> list = new 처럼 왼쪽 선언 타입을 읽는다.
    const decl = /([A-Za-z_$][\w$]*)\s*(?:<[^=;()]*>)?\s+[A-Za-z_$][\w$]*\s*=\s*new\s+$/.exec(before)
    const declared = decl ? decl[1] : ''
    const want = PREFERRED[declared] || declared
    const items = NEWABLE.map(([name, generic, args]) => ({
      name,
      insert: name + (generic ? '<>' : '') + '(' + args + ')',
      detail: generic ? '제네릭 컬렉션' : '클래스',
      preferred: name === want,
    }))
    for (const name of userClassNames || []) {
      if (!items.some((i) => i.name === name)) items.push({ name, insert: name + '(${1})', detail: '내 클래스', preferred: name === want })
    }
    return items
  }

  // 꺾쇠를 막 쳤을 때 닫는 꺾쇠를 자동으로 넣을까? lineBefore: 꺾쇠를 포함해 커서 앞 줄 내용.
  // 대문자로 시작하는 타입 이름 바로 뒤(List<, HashMap<)만 제네릭으로 보고, i < n 이나 MAX<n 같은 비교는 닫지 않는다.
  function shouldCloseAngle(lineBefore) {
    if (!lineBefore.endsWith('<')) return false
    const m = /([A-Za-z_$][\w$]*)<$/.exec(lineBefore)
    if (!m) return false
    const name = m[1]
    if (!/^[A-Z]/.test(name)) return false
    if (name.length > 1 && /^[A-Z0-9_]+$/.test(name)) return false
    return true
  }

  const api = { newSuggestions, shouldCloseAngle, NEWABLE, PREFERRED }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.newCompletion = api
})(typeof window !== 'undefined' ? window : globalThis)
