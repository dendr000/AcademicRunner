// Copyright (c) dendr000. MIT License.
// 편집기 아래 실행 패널: 입력 / 출력 탭, 실행·중지·컴파일 확인 버튼, 단축키(F5, Ctrl+Enter, Shift+F5, F6, Ctrl+1/2).
// 글자는 textContent 로만 넣는다.
(function () {
  const INPUT_KEY_PREFIX = 'academicrunner.input.'

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function readSaved(key) {
    try {
      return window.localStorage.getItem(key) || ''
    } catch {
      return ''
    }
  }

  function writeSaved(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // 저장소를 못 쓰면 이번 실행에서만 유지한다.
    }
  }

  // api: window.runnerApi, hooks: { prepareRun(): Promise<{ok, reason}>, currentFile(): {problem, file} | null }
  function createRunPanel(api, hooks) {
    const root = el('section', 'run-panel')
    root.setAttribute('aria-label', '실행')

    const bar = el('div', 'run-bar')
    const tabInput = el('button', 'run-tab active', '입력')
    const tabOutput = el('button', 'run-tab', '출력')
    const tabCases = el('button', 'run-tab', '케이스')
    for (const t of [tabInput, tabOutput, tabCases]) t.type = 'button'
    const runButton = el('button', 'text-button primary', '실행 (F5)')
    const stopButton = el('button', 'text-button', '중지 (Shift+F5)')
    const compileButton = el('button', 'text-button', '컴파일 확인 (F6)')
    const saveCaseButton = el('button', 'text-button', '케이스로 저장')
    saveCaseButton.title = '방금 실행한 입력과 출력을 시험 케이스로 저장합니다'
    for (const b of [runButton, stopButton, compileButton, saveCaseButton]) b.type = 'button'
    stopButton.disabled = true
    saveCaseButton.disabled = true
    const statusEl = el('span', 'run-status')
    bar.append(tabInput, tabOutput, tabCases, el('span', 'spacer'), statusEl, saveCaseButton, runButton, stopButton, compileButton)

    const inputArea = el('textarea', 'run-input')
    inputArea.spellcheck = false
    inputArea.placeholder = '프로그램이 읽을 입력을 여기에 씁니다 (Scanner 로 읽는 값). 문제별로 기억합니다.'
    inputArea.setAttribute('aria-label', '프로그램 입력')
    const output = el('pre', 'run-output')
    output.hidden = true
    output.setAttribute('aria-label', '실행 결과')
    const casesPanel = window.createCasesPanel(api, {
      currentFile: () => hooks.currentFile(),
      prepareRun: () => hooks.prepareRun(),
      onStatus: (text, kind) => setStatus(text, kind),
      showMessage: (text) => {
        showTab('output')
        clearOutput()
        append(text + '\n', 'out-err')
      },
    })
    casesPanel.element.hidden = true
    root.append(bar, inputArea, output, casesPanel.element)
    let lastRun = null // 마지막으로 성공한 실행의 { input, stdout } (케이스로 저장용)

    let currentProblemId = null
    let lastInput = ''
    let activeRunId = null
    let running = false
    let timeoutSec = 10
    let unsubscribe = null

    function showTab(name) {
      tabInput.classList.toggle('active', name === 'input')
      tabOutput.classList.toggle('active', name === 'output')
      tabCases.classList.toggle('active', name === 'cases')
      inputArea.hidden = name !== 'input'
      output.hidden = name !== 'output'
      casesPanel.element.hidden = name !== 'cases'
    }

    function setRunning(value) {
      running = value
      runButton.disabled = value
      compileButton.disabled = value
      stopButton.disabled = !value
      root.classList.toggle('running', value)
    }

    function setStatus(text, kind) {
      statusEl.textContent = text
      statusEl.dataset.kind = kind || ''
    }

    function append(text, className) {
      const span = el('span', className)
      span.textContent = text
      output.appendChild(span)
      output.scrollTop = output.scrollHeight
    }

    function clearOutput() {
      output.replaceChildren()
    }

    function onEvent(event) {
      if (event.runId !== activeRunId) return
      if (event.type === 'phase') {
        if (event.phase === 'compile') setStatus('컴파일 중...', 'busy')
        else setStatus('실행 중...', 'busy')
        return
      }
      if (event.type === 'output') {
        append(event.text, event.phase === 'compile' ? 'out-compile' : event.stream === 'stderr' ? 'out-err' : 'out-std')
        return
      }
      if (event.type === 'done') finish(event.result)
    }

    function finish(result) {
      activeRunId = null
      setRunning(false)
      const summary = window.runSummary.describeResult(result, timeoutSec)
      if (result && result.phase === 'prepare') append(summary.text + '\n', 'out-err')
      if (result && result.ok && result.phase === 'run' && result.stdout === '' && result.stderr === '') append('(출력 없음)\n', 'out-note')
      append('\n--- ' + summary.text + ' ---\n', summary.kind === 'ok' ? 'out-note-ok' : 'out-note-fail')
      setStatus(summary.text, summary.kind)
      if (result && result.ok && result.phase === 'run') {
        lastRun = { input: lastInput, stdout: result.stdout }
        saveCaseButton.disabled = false
      }
    }

    async function start(mode) {
      if (running) return
      const target = hooks.currentFile()
      if (!target) {
        setStatus('먼저 왼쪽에서 문제를 고르세요', 'fail')
        return
      }
      // 함수 문제는 입력이 없으므로 실행(F5)은 케이스 전부 실행으로 이어진다.
      if (mode === 'run' && target.problem.kind === 'function') {
        showTab('cases')
        await casesPanel.runAll()
        return
      }
      const prep = await hooks.prepareRun()
      if (!prep.ok) {
        showTab('output')
        clearOutput()
        append(prep.reason + '\n', 'out-err')
        setStatus(prep.reason, 'fail')
        return
      }
      const settings = await api.getSettings()
      timeoutSec = settings.timeoutSec || 10
      const input = inputArea.value
      lastInput = input
      writeSaved(INPUT_KEY_PREFIX + target.problem.id, input)

      showTab('output')
      clearOutput()
      setRunning(true)
      setStatus(mode === 'compile' ? '컴파일 중...' : '준비 중...', 'busy')
      const started = await api.startRun({ problemId: target.problem.id, fileName: target.file.name, mode, input })
      if (!started.ok) {
        setRunning(false)
        const text = started.error === 'BUSY' ? '이미 실행 중입니다' : '실행을 시작하지 못했습니다 (' + started.error + ')'
        append(text + '\n', 'out-err')
        setStatus(text, 'fail')
        return
      }
      activeRunId = started.runId
    }

    async function stop() {
      if (!running && !casesPanel.running) return
      setStatus('중지하는 중...', 'busy')
      await api.stopRun()
    }

    // 문제나 파일을 새로 열었을 때: 그 문제의 마지막 입력을 불러오고 이전 출력은 지운다.
    function onOpened(problem) {
      if (currentProblemId === problem.id) return
      currentProblemId = problem.id
      lastRun = null
      saveCaseButton.disabled = true
      casesPanel.onOpened(problem)
      inputArea.placeholder =
        problem.kind === 'function'
          ? '함수 문제는 입력을 읽지 않습니다. "케이스" 탭에서 인수와 기대 반환값을 만들고 실행(F5)하면 케이스를 전부 실행합니다.'
          : '프로그램이 읽을 입력을 여기에 씁니다 (Scanner 로 읽는 값). 문제별로 기억합니다.'
      inputArea.value = readSaved(INPUT_KEY_PREFIX + problem.id)
      if (!running) {
        clearOutput()
        setStatus('', '')
        showTab('input')
      }
    }

    inputArea.addEventListener('input', () => {
      if (currentProblemId) writeSaved(INPUT_KEY_PREFIX + currentProblemId, inputArea.value)
    })
    tabInput.addEventListener('click', () => showTab('input'))
    tabOutput.addEventListener('click', () => showTab('output'))
    tabCases.addEventListener('click', () => showTab('cases'))
    saveCaseButton.addEventListener('click', async () => {
      if (!lastRun) return
      const c = await casesPanel.addFromRun(lastRun.input, lastRun.stdout)
      if (c) {
        showTab('cases')
        setStatus('케이스로 저장했습니다. 기대 출력이 맞는지 확인하세요', 'ok')
      }
    })
    runButton.addEventListener('click', () => start('run'))
    compileButton.addEventListener('click', () => start('compile'))
    stopButton.addEventListener('click', stop)

    // 편집기(Monaco)가 Ctrl+Enter 등을 먼저 가져가므로 캡처 단계에서 가로챈다.
    document.addEventListener(
      'keydown',
      (e) => {
        let handled = true
        if (e.key === 'F5' && e.shiftKey) stop()
        else if (e.key === 'F5' || (e.key === 'Enter' && e.ctrlKey && !e.shiftKey && !e.altKey)) start('run')
        else if (e.key === 'F6') start('compile')
        else if (e.key === 'F7') casesPanel.runAll().then(() => showTab('cases'))
        else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '1') showTab('input')
        else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '2') showTab('output')
        else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '3') showTab('cases')
        else handled = false
        if (handled) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      true,
    )

    unsubscribe = api.onRunEvent(onEvent)

    return {
      element: root,
      onOpened,
      start,
      stop,
      get running() {
        return running
      },
      dispose() {
        casesPanel.dispose()
        if (unsubscribe) unsubscribe()
      },
    }
  }

  window.createRunPanel = createRunPanel
})()
