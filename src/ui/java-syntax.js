// Copyright (c) dendr000. MIT License.
// Java 코드의 확실한 실수를 글자 단위로 찾는다(순수 함수). 틀릴 확률이 낮은 것만 표시한다.
//   - 괄호 짝이 맞지 않음, 같은 키워드가 연달아 두 번(new new), 조건식 안의 = (대입), 리터럴과 변수 타입이 맞지 않음
// 입력은 주석·문자열을 같은 길이의 공백으로 바꾼 코드(code)와 원본(source)이고, 글자 위치(offset)는 그대로 유지한다.
(function (root) {
  const CLOSE_OF = { '(': ')', '[': ']', '{': '}' }
  const OPEN_OF = { ')': '(', ']': '[', '}': '{' }

  // 첫 불일치 하나만 알린다(뒤는 연쇄로 틀려 보이기 때문). 불일치가 없으면 닫히지 않은 여는 괄호를 최대 3개 알린다.
  function checkBrackets(code) {
    const stack = []
    for (let i = 0; i < code.length; i++) {
      const ch = code[i]
      if (CLOSE_OF[ch]) stack.push({ ch, i })
      else if (OPEN_OF[ch]) {
        const top = stack.pop()
        if (!top) return [{ start: i, end: i + 1, severity: 'error', message: `짝이 맞는 여는 괄호가 없는 '${ch}' 입니다.` }]
        if (top.ch !== OPEN_OF[ch]) return [{ start: i, end: i + 1, severity: 'error', message: `'${top.ch}' 로 연 괄호를 '${ch}' 로 닫았습니다. 괄호 짝이 맞지 않습니다.` }]
      }
    }
    return stack.slice(0, 3).map((o) => ({ start: o.i, end: o.i + 1, severity: 'error', message: `'${o.ch}' 를 닫는 '${CLOSE_OF[o.ch]}' 가 없습니다.` }))
  }

  const DUP_RE = /\b(new|public|private|protected|static|final|abstract|return|class|void|else|import)\s+\1\b/g

  // new new String[3] 처럼 같은 키워드를 연달아 쓴 곳. 두 번째 것을 표시한다.
  function checkDuplicateKeywords(code) {
    const out = []
    let m
    DUP_RE.lastIndex = 0
    while ((m = DUP_RE.exec(code)) && out.length < 20) {
      const end = m.index + m[0].length
      out.push({ start: end - m[1].length, end, severity: 'error', message: `'${m[1]}' 이(가) 두 번 연속으로 쓰였습니다. 하나를 지우세요.` })
    }
    return out
  }

  // if (x = 5) 처럼 조건 바로 안쪽의 단일 = . 비교는 == 이다. 안쪽 괄호 속 대입(while ((line = r.readLine()) != null))은 정상이라 보지 않는다.
  function checkConditionAssign(code) {
    const out = []
    const re = /\b(?:if|while)\s*\(/g
    let m
    while ((m = re.exec(code)) && out.length < 20) {
      const open = m.index + m[0].length - 1
      let depth = 0
      for (let i = open; i < code.length; i++) {
        const ch = code[i]
        if (ch === '(' || ch === '[' || ch === '{') depth++
        else if (ch === ')' || ch === ']' || ch === '}') {
          depth--
          if (depth <= 0) break
        } else if (ch === '=' && depth === 1) {
          if (code[i + 1] === '=') {
            i++
            continue
          }
          if ('=!<>+-*/%&|^'.includes(code[i - 1])) continue
          out.push({ start: i, end: i + 1, severity: 'warning', message: '조건식 안의 = 는 값을 넣는 대입입니다. 비교하려면 == 를 쓰세요.' })
          break
        }
      }
    }
    return out
  }

  const INT_TYPES = new Set(['int', 'long', 'short', 'byte', 'char'])
  const DECL_RE = /\b(int|long|short|byte|char|boolean|double|float|String)\s+[A-Za-z_$][\w$]*\s*=(?!=)/g
  const STR_RE = /^"(?:\\.|[^"\\\n])*"(?=\s*[;,])/
  const CHAR_RE = /^'(?:\\.|[^'\\\n])'(?=\s*[;,])/
  const INT_RE = /^-?\d[\d_]*(?=\s*[;,])/
  const DEC_RE = /^-?\d+\.\d+(?:[dD])?(?=\s*[;,])/
  const BOOL_RE = /^(?:true|false)(?=\s*[;,])/

  // int a = "abc"; String s = 5; int n = 3.5; 처럼 오른쪽 값이 리터럴이고 변수 타입과 확실히 안 맞는 것.
  function checkLiteralTypes(code, source) {
    const out = []
    let m
    DECL_RE.lastIndex = 0
    while ((m = DECL_RE.exec(code)) && out.length < 20) {
      const type = m[1]
      let at = m.index + m[0].length
      while (at < source.length && /\s/.test(source[at])) at++ // 오른쪽 값의 시작(원본 기준: 문자열은 코드에서 공백으로 지워져 있다)
      const rest = source.slice(at, at + 300)
      let hit = null
      let why = null
      if ((hit = STR_RE.exec(rest)) && type !== 'String') why = `글자(문자열) 를 ${type} 변수에 넣을 수 없습니다.`
      else if ((hit = CHAR_RE.exec(rest)) && type === 'String') why = "글자 하나('a') 는 char 입니다. String 에는 큰따옴표(\"a\")로 쓰세요."
      else if ((hit = INT_RE.exec(rest)) && (type === 'String' || type === 'boolean')) why = `숫자를 ${type} 변수에 넣을 수 없습니다.`
      else if ((hit = DEC_RE.exec(rest)) && (INT_TYPES.has(type) || type === 'String' || type === 'boolean')) why = `소수를 ${type} 변수에 넣을 수 없습니다. ${INT_TYPES.has(type) ? 'double 을 쓰거나 (int) 로 바꾸세요.' : ''}`.trim()
      else if ((hit = DEC_RE.exec(rest)) && type === 'float') why = 'float 에 소수를 넣으려면 숫자 뒤에 f 를 붙이세요. (예: 3.5f)'
      else if ((hit = BOOL_RE.exec(rest)) && type !== 'boolean') why = `true/false 를 ${type} 변수에 넣을 수 없습니다.`
      if (why && hit) out.push({ start: at, end: at + hit[0].length, severity: 'error', message: why })
    }
    return out
  }

  // name == "abc" 처럼 문자열 리터럴을 == / != 로 비교한 곳(값이 아니라 주소를 비교해 틀린 결과가 나온다). 연산자를 표시한다.
  function checkStringCompare(code, source) {
    const out = []
    const re = /[=!]=(?!=)/g
    let m
    while ((m = re.exec(code)) && out.length < 20) {
      if (m.index > 0 && '=!<>'.includes(code[m.index - 1])) continue
      let after = m.index + 2
      while (after < source.length && /\s/.test(source[after])) after++
      let before = m.index - 1
      while (before >= 0 && /\s/.test(source[before])) before--
      // 연산자 오른쪽이 따옴표로 시작하거나, 왼쪽이 따옴표로 끝나며(코드에서는 공백으로 지워진 자리) 그 자리가 실제 문자열일 때
      const rightLiteral = source[after] === '"' && code[after] === ' '
      const leftLiteral = before >= 0 && source[before] === '"' && code[before] === ' '
      if (rightLiteral || leftLiteral) out.push({ start: m.index, end: m.index + 2, severity: 'warning', message: '문자열은 == 로 비교하면 같은 글자여도 false 가 나올 수 있습니다. a.equals("abc") 로 비교하세요.' })
    }
    return out
  }

  const api = { checkBrackets, checkDuplicateKeywords, checkConditionAssign, checkLiteralTypes, checkStringCompare }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.javaSyntax = api
})(typeof window !== 'undefined' ? window : globalThis)
