// Copyright (c) dendr000. MIT License.
// 제출 전 정적 점검: 사이트에 붙여 넣기 전에 코드에서 흔한 실수를 찾는다(화면 코드 없음, 시험 가능).
// 결과 항목: { level: 'ok' | 'warn' | 'fail', text }
//   fail = 사이트에서 거의 확실히 실패, warn = 확인해 볼 것, ok = 통과
(function (root) {
  const JAVA_PUBLIC = /\bpublic\s+(?:(?:final|abstract|strictfp)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/

  // 주석을 걷어낸 코드(문자열 안의 // 는 건드리지 않도록 단순하게만 처리한다)
  function stripComments(language, source) {
    if (language === 'python') return source.replace(/^\s*#.*$/gm, '')
    if (language === 'sql') return source.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '')
  }

  function add(items, level, text) {
    items.push({ level, text })
  }

  // language: 'java' | 'python' | 'javascript' | 'c' | 'cpp' | 'sql', kind: 'io' | 'function' | 'unknown'
  function staticChecks(language, kind, source) {
    const items = []
    const text = typeof source === 'string' ? source : ''
    if (text.trim() === '') {
      add(items, 'fail', '코드가 비어 있습니다')
      return items
    }
    const code = stripComments(language, text)

    if (language === 'java') {
      if (/^\s*package\s+[\w.]+\s*;/m.test(code)) add(items, 'fail', 'package 선언이 있습니다. 사이트에는 package 줄을 지우고 제출하세요')
      else add(items, 'ok', 'package 선언 없음')
      if (kind === 'function') {
        if (!/\bclass\s+Solution\b/.test(code)) add(items, 'fail', 'class Solution 이 없습니다')
        else if (!/\bsolution\s*\(/.test(code)) add(items, 'fail', 'solution(...) 메서드가 없습니다')
        else add(items, 'ok', 'class Solution 과 solution 메서드 있음')
      } else {
        const pub = JAVA_PUBLIC.exec(code)
        if (!pub) add(items, 'warn', 'public class 가 없습니다 (사이트는 보통 public class Main 을 요구)')
        else if (pub[1] !== 'Main') add(items, 'fail', 'public class 이름이 ' + pub[1] + ' 입니다. 사이트는 Main 을 요구합니다')
        else add(items, 'ok', 'public class Main')
        if (!/\bstatic\s+void\s+main\s*\(/.test(code)) add(items, 'fail', 'main 메서드가 없습니다')
        if (!/System\.out\.|System\.err\./.test(code)) add(items, 'warn', '출력문(System.out)이 보이지 않습니다')
      }
    } else if (language === 'python') {
      if (kind === 'function') {
        if (!/^\s*def\s+solution\s*\(/m.test(code)) add(items, 'fail', 'def solution(...) 함수가 없습니다')
        else add(items, 'ok', 'solution 함수 있음')
      } else if (!/\bprint\s*\(|sys\.stdout/.test(code)) {
        add(items, 'warn', 'print 출력이 보이지 않습니다')
      }
      if (/\bbreakpoint\s*\(|\bimport\s+pdb\b/.test(code)) add(items, 'warn', '디버거(breakpoint/pdb)가 남아 있습니다')
    } else if (language === 'javascript') {
      if (kind === 'function') {
        if (!/\bfunction\s+solution\s*\(|\b(?:const|let|var)\s+solution\s*=|\bsolution\s*=\s*(?:function|\()/.test(code)) add(items, 'fail', 'solution 함수가 없습니다')
        else add(items, 'ok', 'solution 함수 있음')
      } else if (!/console\.log|process\.stdout/.test(code)) {
        add(items, 'warn', '출력(console.log)이 보이지 않습니다')
      }
      if (/\bdebugger\b/.test(code)) add(items, 'warn', 'debugger 문이 남아 있습니다')
    }

    // 모든 언어 공통
    const todo = /\b(TODO|FIXME|XXX)\b/.exec(text)
    if (todo) add(items, 'warn', todo[1] + ' 표시가 남아 있습니다')
    const debugLine = language === 'sql' ? null : /(?:println|print|log)\s*\(\s*["'`][^"'`]*\bdebug\b/i.exec(code)
    if (debugLine) add(items, 'warn', '디버그용 출력(debug)이 남아 있는 것 같습니다')
    if (kind === 'function' && /System\.in\b|\binput\s*\(|readline|process\.stdin/.test(code)) add(items, 'warn', '함수 문제인데 표준 입력을 읽는 코드가 있습니다')
    return items
  }

  // 항목 목록에서 가장 나쁜 단계: 'fail' > 'warn' > 'ok'
  function worst(items) {
    if (items.some((i) => i.level === 'fail')) return 'fail'
    if (items.some((i) => i.level === 'warn')) return 'warn'
    return 'ok'
  }

  // 컴파일 결과(run-service 결과)를 점검 항목으로 바꾼다. 컴파일 도구가 없는 언어(Python/JS)는 문법 검사 결과다.
  function compileItem(result) {
    if (!result) return { level: 'warn', text: '컴파일(문법) 확인 결과를 받지 못했습니다' }
    if (result.ok) return { level: 'ok', text: '컴파일(문법) 확인 통과' }
    if (result.phase === 'prepare') return { level: 'warn', text: '컴파일 확인을 할 수 없었습니다 (' + (result.message || result.error || '알 수 없음') + ')' }
    return { level: 'fail', text: '컴파일(문법) 오류가 있습니다' }
  }

  // 케이스 전부 실행 결과(run-service 결과, phase 'cases')를 점검 항목으로 바꾼다.
  // totalSaved: 저장된 케이스 수(0 이면 실행하지 못한 것)
  function casesItem(result, totalSaved) {
    if (totalSaved === 0) return { level: 'warn', text: '저장된 시험 케이스가 없습니다. 예제 입출력을 케이스로 저장해 두면 제출 전에 자동으로 확인됩니다' }
    if (!result) return { level: 'warn', text: '케이스 실행 결과를 받지 못했습니다' }
    if (result.phase !== 'cases') return { level: 'fail', text: '케이스를 실행하지 못했습니다 (' + (result.message || result.error || result.phase) + ')' }
    if (result.stopped) return { level: 'warn', text: '케이스 실행이 중지되었습니다' }
    if (result.ok) return { level: 'ok', text: '시험 케이스 ' + result.total + '개 모두 통과' }
    return { level: 'fail', text: '시험 케이스 ' + result.passed + ' / ' + result.total + ' 통과 (실패가 있습니다)' }
  }

  const api = { staticChecks, worst, compileItem, casesItem, stripComments }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.submitCheck = api
})(typeof window !== 'undefined' ? window : globalThis)
