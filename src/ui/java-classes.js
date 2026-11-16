// Copyright (c) dendr000. MIT License.
// 같은 파일 안에 직접 만든 Java 클래스(class, interface, enum, record)의 필드와 메서드를 정규식으로 읽는다.
// 점 자동 완성에서 "내가 만든 클래스의 변수." 와 "this." 를 제안하는 데 쓴다. 화면(DOM)을 모르는 순수 함수.
(function (root) {
  const IDENT = '[A-Za-z_$][\\w$]*'
  const MODIFIERS = '(?:(?:public|private|protected|static|final|abstract|synchronized|default|native|transient|volatile)\\s+)*'
  const TYPE = IDENT + '(?:\\s*<[^()]*?>)?(?:\\s*\\[\\s*\\])*'
  const METHOD_RE = new RegExp('^(' + MODIFIERS + ')(?:<[^>]*>\\s*)?(?:(' + TYPE + ')\\s+)?(' + IDENT + ')\\s*\\(([^)]*)\\)')
  const FIELD_RE = new RegExp('^(' + MODIFIERS + ')(' + TYPE + ')\\s+(' + IDENT + ')\\s*(?:=|,|$)')

  // 주석과 문자열 안의 글자를 공백으로 바꾼다(줄바꿈과 위치는 그대로).
  function blank(source) {
    return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (s) => s.replace(/[^\n]/g, ' '))
  }

  // 쉼표로 나누되 <> () 안의 쉼표는 나누지 않는다.
  function splitTop(text) {
    const parts = []
    let depth = 0
    let cur = ''
    for (const ch of text) {
      if (ch === '<' || ch === '(') depth++
      else if (ch === '>' || ch === ')') depth--
      if (ch === ',' && depth === 0) {
        parts.push(cur)
        cur = ''
      } else cur += ch
    }
    if (cur.trim() !== '') parts.push(cur)
    return parts.map((p) => p.trim()).filter((p) => p !== '')
  }

  // "int a, List<String> b" -> [{ type, name }]
  function parseParams(text) {
    return splitTop(text).map((p) => {
      const cleaned = p.replace(/\bfinal\s+/g, '').replace(/@\w+\s*/g, '').replace(/\.\.\./g, '[]')
      const m = new RegExp('^(.*?)\\s+(' + IDENT + ')$').exec(cleaned)
      return m ? { type: m[1].trim(), name: m[2] } : { type: '', name: cleaned }
    })
  }

  // 타입 글자 -> 이름 하나('array' 는 배열, 제네릭 제거). void·모르면 null
  function simpleType(type) {
    if (!type) return null
    const t = type.replace(/\s+/g, '')
    if (t.endsWith(']')) return 'array'
    const base = t.replace(/<.*$/, '')
    return base === 'void' || base === '' ? null : base
  }

  // 중괄호 짝을 찾아 닫는 위치를 돌려준다(없으면 끝).
  function matchBrace(code, open) {
    let depth = 0
    for (let i = open; i < code.length; i++) {
      if (code[i] === '{') depth++
      else if (code[i] === '}' && --depth === 0) return i
    }
    return code.length
  }

  // 클래스 본문 바로 아래(깊이 1)의 머리글(선언 부분)들을 나눈다. 중괄호 안(메서드 본문)은 건너뛴다.
  function headers(body) {
    const result = []
    let depth = 0
    let cur = ''
    for (const ch of body) {
      if (ch === '{') {
        if (depth === 0) {
          result.push(cur)
          cur = ''
        }
        depth++
      } else if (ch === '}') {
        depth--
      } else if (depth === 0) {
        if (ch === ';') {
          result.push(cur)
          cur = ''
        } else cur += ch
      }
    }
    if (cur.trim() !== '') result.push(cur)
    return result.map((h) => h.replace(/@\w+(\([^)]*\))?\s*/g, '').trim()).filter((h) => h !== '')
  }

  function paramSnippet(params) {
    return params.map((p, i) => '${' + (i + 1) + ':' + p.name + '}').join(', ')
  }

  // 반환: [{ name, kind, start, end, members: [...], ctors: [{ params: [{ type, name }] }] }]
  //   members 의 params: null 은 필드(괄호 없음), 문자열은 메서드(괄호 안 자리표시)
  //   type: 필드 타입 또는 메서드 반환 타입(간단한 이름, 모르면 null)
  function parseJavaClasses(source) {
    const code = blank(source)
    const classes = []
    const re = new RegExp('\\b(class|interface|enum|record)\\s+(' + IDENT + ')', 'g')
    let match
    while ((match = re.exec(code))) {
      const kind = match[1]
      const open = code.indexOf('{', re.lastIndex)
      if (open < 0) continue
      // record 의 구성 요소 (int x, int y) 는 필드이자 접근 메서드가 된다.
      let components = []
      const between = code.slice(re.lastIndex, open)
      if (kind === 'record') {
        const pm = /^\s*(?:<[^>]*>\s*)?\(([^)]*)\)/.exec(between)
        if (pm) components = parseParams(pm[1])
      }
      const end = matchBrace(code, open)
      const members = []
      const ctors = []
      if (components.length > 0) ctors.push({ params: components })
      for (const c of components) members.push({ name: c.name, detail: c.type, params: '', isStatic: false, type: simpleType(c.type) })
      const list = headers(code.slice(open + 1, end))
      list.forEach((header, index) => {
        if (kind === 'enum' && index === 0 && !/[(]\s*[A-Za-z_$][\w$]*\s+[A-Za-z_$]/.test(header) && /^[A-Za-z_$][\w$]*/.test(header) && !METHOD_RE.test(header) && !FIELD_RE.test(header)) {
          for (const part of splitTop(header)) {
            const name = /^[A-Za-z_$][\w$]*/.exec(part)
            if (name) members.push({ name: name[0], detail: match[2], params: null, isStatic: true, type: match[2] })
          }
          return
        }
        const mm = METHOD_RE.exec(header)
        if (mm && !/^(if|for|while|switch|return|new|else|catch|try)$/.test(mm[3])) {
          const isStatic = /\bstatic\b/.test(mm[1])
          const returnType = mm[2]
          const params = parseParams(mm[4])
          if (!returnType && mm[3] === match[2]) {
            ctors.push({ params }) // 생성자는 점 뒤에 나오지 않지만, new 호출의 매개변수 이름 힌트에 쓴다
            return
          }
          const sig = '(' + params.map((p) => (p.type ? p.type + ' ' : '') + p.name).join(', ') + ')'
          members.push({ name: mm[3], detail: sig + (returnType ? ' -> ' + returnType : ''), params: paramSnippet(params), isStatic, type: simpleType(returnType), paramList: params })
          return
        }
        const fm = FIELD_RE.exec(header)
        if (fm) {
          const isStatic = /\bstatic\b/.test(fm[1]) || kind === 'interface'
          members.push({ name: fm[3], detail: fm[2], params: null, isStatic, type: simpleType(fm[2]) })
          // "int a, b;" 처럼 같은 줄에 이어진 이름
          const rest = header.slice(fm[0].length)
          if (fm[0].endsWith(',')) for (const extra of splitTop(rest)) {
            const nm = new RegExp('^(' + IDENT + ')').exec(extra)
            if (nm) members.push({ name: nm[1], detail: fm[2], params: null, isStatic, type: simpleType(fm[2]) })
          }
        }
      })
      classes.push({ name: match[2], kind, start: open, end, members, ctors })
    }
    return classes
  }

  // 커서 위치(offset)를 감싸는 가장 안쪽 클래스. 없으면 null.
  function enclosingClass(classes, offset) {
    let best = null
    for (const c of classes) {
      if (offset > c.start && offset <= c.end && (!best || c.start > best.start)) best = c
    }
    return best
  }

  const api = { parseJavaClasses, enclosingClass, simpleType, blank }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.javaClasses = api
})(typeof window !== 'undefined' ? window : globalThis)
