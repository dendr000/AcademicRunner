// Copyright (c) dendr000. MIT License.
// Java 변수가 쓰이는 자리에서 보이는지 점검한다(순수 함수): 선언하지 않은 이름, 선언하기 전이나 블록 밖에서 쓴 이름.
// 진짜 컴파일러가 아니라 토큰을 읽는 간이 점검이라, 확실하지 않은 모양(람다 매개변수, enum 상수, 패턴 변수, 상속 등)은 보지 않는다.
// 입력은 주석·문자열을 공백으로 바꾼 코드이고 글자 위치(offset)는 그대로 유지한다.
(function (root) {
  const KEYWORDS = new Set(
    'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(' '),
  )
  const PRIMS = new Set('boolean byte char short int long float double void'.split(' '))
  const CONTEXTUAL = new Set(['var', 'record', 'yield', 'sealed', 'permits', 'when', 'java', 'javax'])
  const CONTROL = new Set(['for', 'while', 'if', 'switch', 'catch', 'try', 'synchronized'])
  const DECL_NEXT = new Set(['=', ';', ',', ':', ')', '[', '->', '&'])
  const GENERIC_PART = new Set([',', '.', '?', '[', ']', '&', 'extends', 'super'])

  const isIdent = (t) => /^[\p{L}_$]/u.test(t)
  const isUpper = (t) => /^\p{Lu}/u.test(t)

  function tokenize(code) {
    const tokens = []
    const re = /[\p{L}_$][\p{L}\p{N}_$]*|\d[\w.]*|\.\.\.|->|::|\S/gu
    let m
    while ((m = re.exec(code))) tokens.push({ t: m[0], s: m.index, e: m.index + m[0].length })
    return tokens
  }

  // tokens[k] 가 '>' 일 때 앞쪽에 짝이 맞는 '<' 가 있고 그 앞이 이름이면 제네릭 타입의 끝이다(a > b 같은 비교와 구분).
  function endsGeneric(tokens, k) {
    let depth = 0
    for (let j = k; j >= 0 && k - j < 40; j--) {
      const t = tokens[j].t
      if (t === '>') depth++
      else if (t === '<') {
        depth--
        if (depth === 0) return j > 0 && isIdent(tokens[j - 1].t)
      } else if (!isIdent(t) && !GENERIC_PART.has(t)) return false
    }
    return false
  }

  // 위치와 상관없이 항상 보이는 것으로 보는 이름: 람다 매개변수, enum 안의 이름, 라벨
  function collectLoose(tokens, loose) {
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k].t
      if (t === '->' && k > 0) {
        const prev = tokens[k - 1].t
        if (isIdent(prev)) loose.add(prev)
        else if (prev === ')') {
          let depth = 0
          let j = k - 1
          for (; j >= 0; j--) {
            if (tokens[j].t === ')') depth++
            else if (tokens[j].t === '(' && --depth === 0) break
          }
          let last = null
          let d = 0
          for (let q = j + 1; q < k - 1; q++) {
            const x = tokens[q].t
            if (x === '(') d++
            else if (x === ')') d--
            else if (d === 0 && x === ',') {
              if (last) loose.add(last)
              last = null
            } else if (d === 0 && isIdent(x)) last = x
          }
          if (last) loose.add(last)
        }
      } else if (t === 'enum' && k + 2 < tokens.length && tokens[k + 2].t === '{') {
        let depth = 0
        for (let j = k + 2; j < tokens.length; j++) {
          if (tokens[j].t === '{') depth++
          else if (tokens[j].t === '}' && --depth === 0) break
          else if (isIdent(tokens[j].t)) loose.add(tokens[j].t)
        }
      } else if (t === ':' && k > 0 && isIdent(tokens[k - 1].t) && (k < 2 || '{};'.includes(tokens[k - 2].t))) {
        loose.add(tokens[k - 1].t)
      }
    }
  }

  // check=false: 선언만 모은다(첫 번째 훑기). check=true: 쓰이는 자리를 점검한다.
  function walk(tokens, ctx, check) {
    const frames = [{ names: new Set(), kind: 'root' }]
    const parenStack = []
    const findings = []
    let parenDepth = 0
    let declActive = false
    let declDepth = 0
    let stmtClass = false
    let inCase = false
    let annoDepth = 0
    const top = () => frames[frames.length - 1]
    const visible = (n) => ctx.fields.has(n) || ctx.loose.has(n) || frames.some((f) => f.names.has(n))

    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k].t
      const prev = k > 0 ? tokens[k - 1].t : ''
      const next = k + 1 < tokens.length ? tokens[k + 1].t : ''

      if (t === '(') {
        const isAnno = isIdent(prev) && k >= 2 && tokens[k - 2].t === '@'
        if (isAnno) annoDepth++
        const f = { names: new Set(), kind: 'block', ctrl: CONTROL.has(prev), anno: isAnno, classHeader: stmtClass }
        frames.push(f)
        parenStack.push(f)
        parenDepth++
        continue
      }
      if (t === ')') {
        parenDepth--
        const f = parenStack.pop()
        const idx = f ? frames.lastIndexOf(f) : -1
        if (idx < 0) return { bad: true, findings }
        if (f.anno) annoDepth--
        frames.length = idx + 1
        let n = k + 1
        if (tokens[n] && tokens[n].t === 'throws') while (n < tokens.length && tokens[n].t !== '{' && tokens[n].t !== ';') n++
        if (tokens[n] && tokens[n].t === '{') f.pendingBody = true // 매개변수는 뒤따르는 본문 { } 와 한 범위
        else if (f.ctrl) {
          f.braceless = true // 중괄호 없는 for/if 본문: 다음 ; 까지
          f.parenAt = parenDepth
        } else frames.pop()
        if (declDepth > parenDepth) declActive = false
        continue
      }
      if (t === '{') {
        const f = top()
        if (f.pendingBody) {
          f.pendingBody = false
          f.brace = true
          f.kind = f.classHeader ? 'class' : 'block'
        } else frames.push({ names: new Set(), kind: stmtClass ? 'class' : 'block', brace: true })
        stmtClass = false
        declActive = false
        inCase = false
        continue
      }
      if (t === '}') {
        while (top().braceless) frames.pop()
        if (frames.length <= 1 || !top().brace) return { bad: true, findings }
        frames.pop()
        stmtClass = false
        declActive = false
        inCase = false
        continue
      }
      if (t === ';') {
        while (top().braceless && top().parenAt === parenDepth) frames.pop()
        declActive = false
        stmtClass = false
        inCase = false
        continue
      }
      if (t === '[') parenDepth++
      else if (t === ']') parenDepth--
      if (inCase && (t === ':' || t === '->')) inCase = false
      if (t === 'case') {
        inCase = true
        continue
      }
      if ((t === 'class' || t === 'interface' || t === 'enum') && prev !== '.') stmtClass = true
      else if (t === 'record' && isIdent(next) && (tokens[k + 2] || {}).t !== undefined && ['(', '<'].includes(tokens[k + 2].t)) stmtClass = true

      if (!isIdent(t) || KEYWORDS.has(t)) continue

      // 선언인가: 앞이 타입 끝(이름, 기본 타입, 제네릭 >, 배열 ], ...)이고 뒤가 = ; , : ) [ 같은 것
      const prevIsType = (isIdent(prev) && !KEYWORDS.has(prev) && prev !== 'yield') || PRIMS.has(prev) || prev === ']' || prev === '...' || (prev === '>' && endsGeneric(tokens, k - 1))
      const nextOk = DECL_NEXT.has(next) && !(next === '=' && tokens[k + 2] && tokens[k + 2].t === '=')
      let isDecl = prevIsType && nextOk
      if (!isDecl && declActive && prev === ',' && parenDepth === declDepth && ['=', ';', ',', '['].includes(next)) isDecl = true
      if (isDecl) {
        const f = top()
        if (k >= 2 && tokens[k - 2].t === 'instanceof') ctx.loose.add(t) // 패턴 변수는 조건 밖에서도 보일 수 있다
        if (f.kind === 'class') ctx.fields.add(t)
        else ctx.anywhere.add(t)
        f.names.add(t)
        declActive = next !== ')' && next !== ':' && next !== '->' && next !== '&'
        declDepth = parenDepth
        continue
      }

      if (!check || annoDepth > 0 || inCase) continue
      if (isUpper(t) || CONTEXTUAL.has(t)) continue
      if (prev === '.' || prev === '::' || prev === '@' || prev === 'break' || prev === 'continue' || next === '(') continue
      if (isIdent(next) && !KEYWORDS.has(next)) continue // 뒤에 이름이 또 오면 타입으로 쓴 이름이다
      if (visible(t)) continue
      findings.push({ start: tokens[k].s, end: tokens[k].e, name: t, kind: ctx.anywhere.has(t) ? 'scope' : 'undeclared' })
    }
    return { bad: parenStack.length > 0 || frames.length !== 1, findings }
  }

  // 반환: { findings: [{start,end,name,kind:'scope'|'undeclared'}], pool: [선언된 이름들] }
  function analyzeScope(code) {
    const tokens = tokenize(code)
    const ctx = { fields: new Set(), anywhere: new Set(), loose: new Set() }
    collectLoose(tokens, ctx.loose)
    if (walk(tokens, ctx, false).bad) return { findings: [], pool: [] }
    const second = walk(tokens, ctx, true)
    if (second.bad) return { findings: [], pool: [] }
    return { findings: second.findings.slice(0, 40), pool: [...ctx.fields, ...ctx.anywhere, ...ctx.loose] }
  }

  // 상속·static import·익명 클래스처럼 이 점검이 이름을 다 알 수 없는 파일은 건너뛴다.
  function canAnalyze(code) {
    if (/\bclass\s+[\w$]+\s*(?:<[^{}]*>)?\s*extends\b/.test(code)) return false
    if (/\bimport\s+static\b/.test(code) || /@interface\b/.test(code)) return false
    if (/\bnew\s+[\w$.<>?, ]+\s*\([^;{}]*\)\s*\{/.test(code)) return false
    return true
  }

  const api = { analyzeScope, canAnalyze, tokenize }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.javaScope = api
})(typeof window !== 'undefined' ? window : globalThis)
