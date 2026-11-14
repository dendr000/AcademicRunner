// Copyright (c) dendr000. MIT License.
// Java 함수 문제용 시험 하니스를 만든다. 풀이의 solution 메서드 모양(반환형, 매개변수 타입)을 읽어서,
// 케이스마다 인수(JSON)를 자바 값으로 바꿔 호출하고 반환값을 JSON 한 줄로 출력하는 클래스를 생성한다.
// 풀이 파일은 한 글자도 바꾸지 않는다. 하니스는 임시 폴더에만 쓴다.

const HARNESS_CLASS = '__ArHarness'

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char'])

// 주석과 문자열 안을 걷어낸 사본에서 solution 메서드를 찾는다. 없으면 null.
function parseSignature(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const m = /\b((?:public|private|protected|static|final)\s+)*([A-Za-z_$][\w$<>,\s.?]*(?:\[\s*\])*)\s+solution\s*\(([^)]*)\)\s*(?:throws[^{]*)?\{/.exec(code)
  if (!m) return null
  const returnType = m[2].trim().replace(/\s+/g, ' ')
  const params = splitParams(m[3]).map((p) => {
    const cleaned = p.replace(/\bfinal\b/g, '').trim()
    const idx = cleaned.search(/\s+[A-Za-z_$][\w$]*$/)
    if (idx < 0) return null
    return { type: cleaned.slice(0, idx).replace(/\s+/g, '').trim(), name: cleaned.slice(idx).trim() }
  })
  if (params.some((p) => p === null)) return null
  return { returnType, params }
}

// 쉼표로 나누되 <> 안의 쉼표(Map<String,Integer>)는 나누지 않는다.
function splitParams(text) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '<') depth++
    if (ch === '>') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  if (current.trim() !== '') parts.push(current)
  return parts
}

function javaString(s) {
  let out = '"'
  for (const ch of s) {
    const code = ch.codePointAt(0)
    if (ch === '"') out += '\\"'
    else if (ch === '\\') out += '\\\\'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else if (code < 32 || code > 126) {
      // 한글 등은 유니코드 이스케이프로 써서 컴파일 인코딩과 무관하게 안전하게 한다(보조 평면 문자는 서러게이트 쌍).
      if (code > 0xffff) {
        const c = code - 0x10000
        out += '\\u' + (0xd800 + (c >> 10)).toString(16).padStart(4, '0') + '\\u' + (0xdc00 + (c & 0x3ff)).toString(16).padStart(4, '0')
      } else out += '\\u' + code.toString(16).padStart(4, '0')
    } else out += ch
  }
  return out + '"'
}

function fail(message) {
  const e = new Error(message)
  e.isLiteralError = true
  throw e
}

// JSON 값 value 를 자바 타입 type 의 값 코드(문자열)로 바꾼다. 안 되면 isLiteralError 예외.
function literal(type, value) {
  const dims = (type.match(/\[\]/g) || []).length
  const base = type.replace(/\[\]/g, '')
  if (dims > 0) {
    if (value === null) return 'null'
    if (!Array.isArray(value)) fail(`${type} 자리에는 JSON 배열이 와야 합니다`)
    const elementType = type.slice(0, -2)
    return `new ${type} {${value.map((v) => literal(elementType, v)).join(', ')}}`
  }
  const listMatch = /^(?:List|ArrayList|Collection)<(\w+)>$/.exec(base)
  if (listMatch) {
    if (value === null) return 'null'
    if (!Array.isArray(value)) fail(`${type} 자리에는 JSON 배열이 와야 합니다`)
    return `new java.util.ArrayList<${listMatch[1]}>(java.util.Arrays.asList(${value.map((v) => boxed(listMatch[1], v)).join(', ')}))`
  }
  switch (base) {
    case 'int':
    case 'short':
    case 'byte': {
      if (!Number.isInteger(value)) fail(`${type} 자리에는 정수가 와야 합니다`)
      return base === 'int' ? String(value) : `(${base}) ${value}`
    }
    case 'long':
      if (!Number.isInteger(value)) fail('long 자리에는 정수가 와야 합니다')
      return `${value}L`
    case 'double':
    case 'float':
      if (typeof value !== 'number') fail(`${base} 자리에는 숫자가 와야 합니다`)
      return base === 'float' ? `${value}f` : Number.isInteger(value) ? `${value}.0` : String(value)
    case 'boolean':
      if (typeof value !== 'boolean') fail('boolean 자리에는 true/false 가 와야 합니다')
      return String(value)
    case 'char':
      if (typeof value !== 'string' || [...value].length !== 1) fail('char 자리에는 글자 하나(문자열)가 와야 합니다')
      return `(char) ${value.codePointAt(0)}`
    case 'String':
      if (value === null) return 'null'
      if (typeof value !== 'string') fail('String 자리에는 문자열이 와야 합니다')
      return javaString(value)
    default:
      fail(`지원하지 않는 매개변수 타입입니다: ${type}`)
  }
  return ''
}

function boxed(typeName, value) {
  if (value === null) return 'null'
  switch (typeName) {
    case 'Integer':
      return literal('int', value)
    case 'Long':
      return literal('long', value)
    case 'Double':
      return literal('double', value)
    case 'Boolean':
      return literal('boolean', value)
    case 'String':
      return literal('String', value)
    case 'Character':
      return literal('char', value)
    default:
      fail(`지원하지 않는 목록 원소 타입입니다: ${typeName}`)
  }
  return ''
}

// cases: [{ input }] (input 은 인수 JSON 배열 글자). 반환: { source, className } 또는 { error }
function generateHarness(signature, cases) {
  if (signature.returnType === 'void') return { error: 'VOID_RETURN', message: 'solution 이 void 를 돌려주면 반환값을 비교할 수 없습니다' }
  const branches = cases.map((c, i) => {
    try {
      let args
      try {
        args = JSON.parse(c.input && c.input.trim() !== '' ? c.input : '[]')
      } catch {
        fail('인수가 올바른 JSON 배열이 아닙니다 (예: [10] 또는 [[1,2,3], "abc"])')
      }
      if (!Array.isArray(args)) fail('인수는 JSON 배열이어야 합니다 (예: [10])')
      if (args.length !== signature.params.length) fail(`인수는 ${signature.params.length}개여야 하는데 ${args.length}개입니다`)
      const codes = signature.params.map((p, k) => literal(p.type, args[k]))
      return `      case ${i}: return new Solution().solution(${codes.join(', ')});`
    } catch (e) {
      if (!e.isLiteralError) throw e
      return `      case ${i}: throw new IllegalArgumentException(${javaString(e.message)});`
    }
  })
  const source = `import java.util.*;

public class ${HARNESS_CLASS} {
  static Object call(int index) throws Throwable {
    switch (index) {
${branches.join('\n')}
      default: throw new IllegalArgumentException("없는 케이스 번호");
    }
  }

  public static void main(String[] args) throws Throwable {
    Object result = call(Integer.parseInt(args[0]));
    StringBuilder sb = new StringBuilder();
    json(result, sb);
    System.out.println();
    System.out.println(sb);
  }

  static void quote(String s, StringBuilder sb) {
    sb.append('"');
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"') sb.append("\\\\\\"");
      else if (c == '\\\\') sb.append("\\\\\\\\");
      else if (c == '\\n') sb.append("\\\\n");
      else if (c == '\\r') sb.append("\\\\r");
      else if (c == '\\t') sb.append("\\\\t");
      else if (c < 32) sb.append(String.format("\\\\u%04x", (int) c));
      else sb.append(c);
    }
    sb.append('"');
  }

  static void json(Object o, StringBuilder sb) {
    if (o == null) { sb.append("null"); return; }
    if (o instanceof String) { quote((String) o, sb); return; }
    if (o instanceof Character) { quote(String.valueOf(o), sb); return; }
    if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Short || o instanceof Byte) { sb.append(o); return; }
    if (o instanceof Double || o instanceof Float) {
      double d = ((Number) o).doubleValue();
      if (Double.isNaN(d) || Double.isInfinite(d)) quote(String.valueOf(d), sb); else sb.append(d);
      return;
    }
    if (o instanceof Number) { sb.append(o); return; }
    if (o.getClass().isArray()) {
      sb.append('[');
      int n = java.lang.reflect.Array.getLength(o);
      for (int i = 0; i < n; i++) { if (i > 0) sb.append(','); json(java.lang.reflect.Array.get(o, i), sb); }
      sb.append(']');
      return;
    }
    if (o instanceof Map) {
      sb.append('{');
      boolean first = true;
      for (Object e : ((Map<?, ?>) o).entrySet()) {
        Map.Entry<?, ?> en = (Map.Entry<?, ?>) e;
        if (!first) sb.append(',');
        first = false;
        quote(String.valueOf(en.getKey()), sb); sb.append(':'); json(en.getValue(), sb);
      }
      sb.append('}');
      return;
    }
    if (o instanceof Iterable) {
      sb.append('[');
      boolean first = true;
      for (Object e : (Iterable<?>) o) { if (!first) sb.append(','); first = false; json(e, sb); }
      sb.append(']');
      return;
    }
    quote(String.valueOf(o), sb);
  }
}
`
  return { source, className: HARNESS_CLASS }
}

module.exports = { parseSignature, generateHarness, literal, javaString, HARNESS_CLASS }
