// Copyright (c) dendr000. MIT License.
// 이 PC 에 설치된 실행 도구(javac, java, python)를 찾는다. 찾은 결과는 계속 쓰되, 못 찾았거나 찾아 둔 파일이 사라졌으면 다음 실행 때 다시 찾는다.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function isFile(p) {
  try {
    return fs.statSync(p).isFile()
  } catch {
    return false
  }
}

// PATH 와 추가 폴더에서 이름.exe 를 찾는다. (.cmd, .bat 같은 래퍼는 일부러 제외한다)
function findOnPath(name, extraDirs, env) {
  const dirs = [...(extraDirs || []), ...String((env || process.env).PATH || (env || process.env).Path || '').split(path.delimiter)]
  for (const dir of dirs) {
    if (!dir) continue
    const candidate = path.join(dir, name + '.exe')
    if (isFile(candidate)) return candidate
  }
  return null
}

// 실행해서 버전 문구를 읽는다. 실패하면 null. (Windows 스토어 가짜 python.exe 는 여기서 걸러진다)
function readVersion(file, args, pattern) {
  const r = spawnSync(file, args, { encoding: 'utf8', timeout: 8000, windowsHide: true })
  if (r.error || r.status !== 0) return null
  const text = `${r.stdout || ''}\n${r.stderr || ''}`
  const m = pattern.exec(text)
  return m ? m[0].trim() : null
}

function javaDirs(env) {
  const home = (env || process.env).JAVA_HOME
  return home ? [path.join(home, 'bin')] : []
}

// { javac, java, version } 또는 null (JDK 가 아니면 null: javac 가 있어야 컴파일할 수 있다)
function locateJava(env) {
  const javac = findOnPath('javac', javaDirs(env), env)
  if (!javac) return null
  const javaExe = path.join(path.dirname(javac), 'java.exe')
  const java = isFile(javaExe) ? javaExe : findOnPath('java', [], env)
  if (!java) return null
  const version = readVersion(javac, ['-version'], /javac\s+\S+/)
  if (!version) return null
  return { javac, java, version }
}

// { python, version } 또는 null. python.exe 를 먼저 보고, 없으면 py.exe(-3).
function locatePython(env) {
  const python = findOnPath('python', [], env)
  if (python) {
    const version = readVersion(python, ['--version'], /Python\s+3\.\S+/)
    if (version) return { python, args: [], version }
  }
  const py = findOnPath('py', [], env)
  if (py) {
    const version = readVersion(py, ['-3', '--version'], /Python\s+3\.\S+/)
    if (version) return { python: py, args: ['-3'], version }
  }
  return null
}

const cache = {}
// 찾은 도구의 실행 파일이 아직 있으면 그대로 쓴다. 없으면(못 찾았거나 삭제·이동) 다시 찾는다.
function stillThere(found) {
  if (!found) return false
  return [found.javac, found.java, found.python].filter(Boolean).every(isFile)
}

function cached(key, finder) {
  if (!stillThere(cache[key])) cache[key] = finder()
  return cache[key]
}

module.exports = {
  locateJava,
  locatePython,
  findOnPath,
  readVersion,
  java: () => cached('java', () => locateJava()),
  python: () => cached('python', () => locatePython()),
  // 앱 자체가 Node 를 품고 있다(Electron). ELECTRON_RUN_AS_NODE=1 로 실행하면 일반 Node 처럼 동작한다.
  node: () => ({ node: process.execPath, version: 'Node ' + process.versions.node }),
  cached,
  resetCache() {
    for (const k of Object.keys(cache)) delete cache[k]
  },
}
