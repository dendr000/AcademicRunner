// Copyright (c) dendr000. MIT License.
// 매개변수 이름 힌트(인텔리제이의 Parameter Name Hints): new Main(3, 2) 를 화면에서는 new Main(num: 3, cum: 2) 로 보이게 한다.
// 코드는 바꾸지 않고 화면에만 얹는다. 같은 파일에 직접 만든 생성자와 메서드만 대상이다(표준 라이브러리는 이름을 몰라서 제외).
// 화면(DOM)과 Monaco 를 모르는 순수 함수라 시험할 수 있다.
(function (root) {
  const jc = typeof module !== 'undefined' && module.exports ? require('./java-classes') : root.javaClasses
  const md = typeof module !== 'undefined' && module.exports ? require('./member-data') : root.memberData

  const NOT_CALLS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'synchronized', 'super', 'this', 'throw', 'else', 'do', 'try', 'case', 'new', 'yield', 'assert'])
  const IDENT = '[A-Za-z_$][\\w$]*'
  const DECL_BEFORE = new RegExp('(' + IDENT + ')(?:\\s*<[^()=;]*>)?(?:\\s*\\[\\s*\\])*\\s+$')

  // open(여는 괄호 위치)부터 짝이 맞는 닫는 괄호와 최상위 쉼표로 나눈 인수 범위를 돌려준다. 닫는 괄호가 없으면 null.
  function parseArgs(code, open) {
    const args = []
    let depth = 0
    let angle = 0
    let start = open + 1
    for (let i = open; i < code.length; i++) {
      const ch = code[i]
      if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') {
        depth--
        if (depth === 0) {
          args.push([start, i])
          return { close: i, args: args.map(([s, e]) => trim(code, s, e)).filter((a) => a.end > a.start) }
        }
      } else if (ch === '<' && depth === 1 && /[A-Z][\w$]*\s*$/.test(code.slice(Math.max(0, i - 40), i))) angle++
      else if (ch === '>' && angle > 0 && depth === 1) angle--
      else if (ch === ',' && depth === 1 && angle === 0) {
        args.push([start, i])
        start = i + 1
      }
    }
    return null
  }

  function trim(code, s, e) {
    while (s < e && /\s/.test(code[s])) s++
    while (e > s && /\s/.test(code[e - 1])) e--
    return { start: s, end: e }
  }

  const isLiteral = (text) => /^(?:[-+]?\d[\w.]*|"[^"]*"|'[^']*'|true|false|null)$/.test(text)

  // 반환: [{ offset(소스 안 위치), label('num:') }]
  function computeParamHints(source) {
    if (typeof source !== 'string' || source === '' || source.length > 200000) return []
    // 주석은 지우고 문자열은 따옴표만 남기고 안쪽을 비운다(인수 자리에 문자열이 있어야 하고, 안쪽 쉼표·괄호는 무시해야 함).
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (s) =>
      s[0] === '"' || s[0] === "'" ? s[0] + s.slice(1, -1).replace(/[^\n]/g, ' ') + s[s.length - 1] : s.replace(/[^\n]/g, ' '),
    )
    const classes = jc.parseJavaClasses(source)
    if (classes.length === 0) return []
    const hints = []
    const re = new RegExp('(\\bnew\\s+)?(' + IDENT + ')(?:\\s*<[^()<>;]*>)?\\s*\\(', 'g')
    let m
    while ((m = re.exec(code))) {
      const name = m[2]
      const isNew = !!m[1]
      if (NOT_CALLS.has(name)) continue
      const open = m.index + m[0].length - 1
      const before = code.slice(0, m.index)
      let candidates = []
      if (isNew) {
        const cls = classes.find((c) => c.name === name)
        if (!cls) continue
        candidates = cls.ctors.map((c) => c.params)
      } else {
        // 메서드 선언(void f( 처럼 앞에 타입이 있는 것)은 호출이 아니다.
        const decl = DECL_BEFORE.exec(before)
        if (decl && !NOT_CALLS.has(decl[1]) && decl[1] !== 'new') continue
        // obj.f( : 받는 변수가 표준 클래스 타입이면(list.add 등) 내가 만든 같은 이름 메서드와 헷갈리지 않게 제외
        const recv = /(\b[A-Za-z_$][\w$]*)\s*\.\s*$/.exec(before)
        if (recv && recv[1] !== 'this') {
          const type = md.inferJavaType(source, recv[1])
          const user = classes.some((c) => c.name === type || c.name === recv[1])
          if (!user && (type !== null || /^[A-Z]/.test(recv[1]))) continue
        }
        for (const c of classes) for (const mem of c.members) if (mem.name === name && mem.paramList) candidates.push(mem.paramList)
      }
      const parsed = parseArgs(code, open)
      if (!parsed) continue
      const argc = parsed.args.length
      const fits = candidates.filter((p) => p.length === argc)
      if (fits.length === 0) continue
      // 오버로드가 여러 개여도 이름 목록이 같으면 그대로, 다르면 어느 것인지 몰라 건너뛴다.
      const key = (p) => p.map((x) => x.name).join(',')
      if (fits.some((p) => key(p) !== key(fits[0]))) continue
      const params = fits[0]
      parsed.args.forEach((arg, i) => {
        const text = source.slice(arg.start, arg.end)
        if (text === params[i].name) return // 이미 이름과 같으면 중복이다
        if (argc < 2 && !isLiteral(text)) return // 인수가 하나일 때는 값이 숫자·글자 같은 리터럴일 때만(인텔리제이와 같게)
        hints.push({ offset: arg.start, label: params[i].name + ':' })
      })
    }
    return hints
  }

  const api = { computeParamHints, parseArgs }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.paramHints = api
})(typeof window !== 'undefined' ? window : globalThis)
