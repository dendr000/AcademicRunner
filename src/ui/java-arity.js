// Copyright (c) dendr000. MIT License.
// 같은 파일에 직접 만든 메서드·생성자를 부를 때 인수 개수가 맞지 않는 것을 찾는다(순수 함수).
// 확실한 경우만 표시한다: 받는 변수(obj.f())가 있는 호출, 배열·가변 인수 매개변수가 있는 것, 이름이 같은 메서드가 파일에 없는 호출은 건너뛴다.
// 입력은 주석·문자열을 같은 길이의 공백으로 바꾼 코드(code)와 원본(source)이다.
(function (root) {
  const node = typeof module !== 'undefined' && module.exports
  const jc = node ? require('./java-classes') : root.javaClasses
  const ph = node ? require('./param-hints') : root.paramHints

  const IDENT = String.raw`[A-Za-z_$][\w$]*`
  const NOT_CALLS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'synchronized', 'super', 'this', 'throw', 'else', 'do', 'try', 'case', 'new', 'yield', 'assert'])
  const DECL_BEFORE = new RegExp(`(${IDENT})(?:\\s*<[^()=;]*>)?(?:\\s*\\[\\s*\\])*\\s+$`)
  const CALL_RE = new RegExp(String.raw`(\bnew\s+)?(\bthis\s*\.\s*)?(${IDENT})\s*\(`, 'g')

  // 반환: [{ start, end, severity, message }]  (start~end 는 호출하는 이름)
  function checkArity(code, source) {
    const classes = jc.parseJavaClasses(source)
    if (classes.length === 0) return []
    const out = []
    const re = new RegExp(CALL_RE.source, 'g')
    let m
    while ((m = re.exec(code)) && out.length < 20) {
      const name = m[3]
      if (NOT_CALLS.has(name)) continue
      const nameStart = m.index + m[0].lastIndexOf(name)
      const before = code.slice(0, m.index)
      let candidates = []
      if (m[1]) {
        const cls = classes.find((c) => c.name === name)
        if (!cls) continue
        candidates = cls.ctors.length === 0 ? [[]] : cls.ctors.map((c) => c.params)
      } else {
        if (/\.\s*$/.test(before)) continue // obj.f( 는 받는 쪽 타입을 몰라 건너뛴다
        const decl = DECL_BEFORE.exec(before)
        if (!m[2] && decl && !NOT_CALLS.has(decl[1])) continue // int f( 같은 선언
        for (const c of classes) for (const mem of c.members) if (mem.name === name && mem.paramList) candidates.push(mem.paramList)
        if (candidates.length === 0) continue
      }
      if (candidates.some((p) => p.length > 0 && /\[\]$/.test(p[p.length - 1].type))) continue // 가변 인수 가능성
      const parsed = ph.parseArgs(code, m.index + m[0].length - 1)
      if (!parsed) continue
      const argc = parsed.args.length
      if (candidates.some((p) => p.length === argc)) continue
      const wants = [...new Set(candidates.map((p) => p.length))].sort((a, b) => a - b).join(' 또는 ')
      out.push({ start: nameStart, end: nameStart + name.length, severity: 'error', message: `${name}${m[1] ? ' (생성자)' : ''} 은(는) 인수를 ${wants}개 받는데 ${argc}개를 넣었습니다.` })
    }
    return out
  }

  const api = { checkArity }
  if (node) module.exports = api
  else root.javaArity = api
})(typeof window !== 'undefined' ? window : globalThis)
