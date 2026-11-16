// Copyright (c) dendr000. MIT License.
// Java 러너: 임시 폴더에 <공개 클래스 이름>.java 로 쓰고 javac 로 컴파일한 뒤 java 로 실행한다.
// 문제 폴더에는 .class 가 생기지 않는다.
// 함수 문제(Solution)는 시험 하니스를 같이 만들어 케이스마다 호출한다(harness/java-harness.js).
const path = require('node:path')
const { parseSignature, generateHarness } = require('../harness/java-harness')

// 주석을 대충 걷어내고 public class 이름을 찾는다. 없으면 null.
function publicClassName(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const m = /\bpublic\s+(?:(?:final|abstract|strictfp)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/.exec(code)
  return m ? m[1] : null
}

// 파일 맨 앞(주석 제외)의 package xxx.yyy; 한 줄을 같은 길이의 공백으로 바꾼다.
function stripPackage(source) {
  let out = ''
  let rest = source
  // 앞쪽 주석·공백은 그대로 두고 첫 코드가 package 일 때만 지운다.
  const lead = /^(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/.exec(rest)[0]
  out = lead
  rest = rest.slice(lead.length)
  const m = /^package\s+[\w.$]+\s*;/.exec(rest)
  if (m) rest = ' '.repeat(m[0].length) + rest.slice(m[0].length)
  return out + rest
}

const RUN_FLAGS = ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8']

// job: { source, fileName, mode, dir, kind, cases }, tools: { java() -> { javac, java, version } | null }
function prepare(job, tools) {
  const jdk = tools.java()
  if (!jdk) {
    return { error: 'TOOL_MISSING', message: 'JDK(javac)를 찾을 수 없습니다. JDK 를 설치하고 PATH 또는 JAVA_HOME 을 확인하세요.' }
  }
  const base = path.parse(job.fileName).name
  const className = publicClassName(job.source)
  // 파일 이름은 공개 클래스 이름과 같아야 컴파일된다. 공개 클래스가 없으면 원래 파일 이름을 쓴다.
  const sourceName = (className || base) + '.java'
  const mainClass = className || base
  // package 선언이 있으면 클래스가 하위 폴더에 생겨 java 가 못 찾으므로 공백으로 지운다(줄 번호는 그대로).
  const content = stripPackage(job.source)
  const writes = [{ name: sourceName, content }]
  const compileArgs = ['-encoding', 'UTF-8', '-Xlint:none', '-d', job.dir, path.join(job.dir, sourceName)]
  const steps = []

  const wantsHarness = job.mode === 'run' && job.kind === 'function' && Array.isArray(job.cases)
  if (wantsHarness) {
    const signature = parseSignature(job.source)
    if (!signature) return { error: 'NO_SIGNATURE', message: 'solution 메서드를 찾지 못했습니다. class Solution 안에 solution(...) 메서드가 있어야 합니다.' }
    const harness = generateHarness(signature, job.cases)
    if (harness.error) return { error: harness.error, message: harness.message }
    const harnessName = harness.className + '.java'
    writes.push({ name: harnessName, content: harness.source })
    compileArgs.push(path.join(job.dir, harnessName))
    steps.push({ phase: 'compile', cmd: jdk.javac, args: compileArgs })
    steps.push({
      phase: 'run',
      cmd: jdk.java,
      args: [...RUN_FLAGS, '-cp', job.dir, harness.className],
      // 케이스 번호를 인수로 넘긴다. 입력(stdin)은 쓰지 않는다.
      perCase: (c, index) => ({ args: [...RUN_FLAGS, '-cp', job.dir, harness.className, String(index)], input: '' }),
    })
    return { writes, steps, toolVersion: jdk.version }
  }

  steps.push({ phase: 'compile', cmd: jdk.javac, args: compileArgs })
  if (job.mode === 'run') {
    // stdout/stderr 인코딩을 UTF-8 로 고정한다(한글 Windows 에서 파이프 출력이 CP949 로 나오는 것을 막음).
    steps.push({ phase: 'run', cmd: jdk.java, args: [...RUN_FLAGS, '-cp', job.dir, mainClass] })
  }
  return { writes, steps, toolVersion: jdk.version }
}

module.exports = { language: 'java', prepare, publicClassName, stripPackage }
