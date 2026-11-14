// Copyright (c) dendr000. MIT License.
// Java 러너: 임시 폴더에 <공개 클래스 이름>.java 로 쓰고 javac 로 컴파일한 뒤 java 로 실행한다.
// 문제 폴더에는 .class 가 생기지 않는다.
const path = require('node:path')

// 주석을 대충 걷어내고 public class 이름을 찾는다. 없으면 null.
function publicClassName(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const m = /\bpublic\s+(?:(?:final|abstract|strictfp)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/.exec(code)
  return m ? m[1] : null
}

// job: { source, fileName, mode, dir }, tools: { java() -> { javac, java, version } | null }
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
  const steps = [
    {
      phase: 'compile',
      cmd: jdk.javac,
      args: ['-encoding', 'UTF-8', '-Xlint:none', '-d', job.dir, path.join(job.dir, sourceName)],
    },
  ]
  if (job.mode === 'run') {
    steps.push({
      phase: 'run',
      cmd: jdk.java,
      // stdout/stderr 인코딩을 UTF-8 로 고정한다(한글 Windows 에서 파이프 출력이 CP949 로 나오는 것을 막음).
      args: ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-cp', job.dir, mainClass],
    })
  }
  return { writes: [{ name: sourceName, content: job.source }], steps, toolVersion: jdk.version }
}

module.exports = { language: 'java', prepare, publicClassName }
