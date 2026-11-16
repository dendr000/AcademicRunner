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
    // 표 탭: SQL 문제에서만 보인다(지금 쓸 수 있는 표와 내용).
    const tabTables = el('button', 'run-tab', '표')
    tabTables.title = '지금 풀이에서 쓸 수 있는 표와 내용(SELECT * FROM 표)을 봅니다'
    tabTables.hidden = true
    for (const t of [tabInput, tabOutput, tabCases, tabTables]) t.type = 'button'
    // 단축키 안내(hint)는 패널이 좁으면 CSS 로 숨겨 버튼이 줄바꿈되지 않게 한다.
    // 안내하는 키는 사용자가 바꿀 수 있으므로 단축키 표(window.keymap)에서 읽고, 바뀌면 다시 쓴다.
    const hintRefreshers = []
    const labeled = (className, label, actionId) => {
      const b = el('button', className, label)
      const hint = el('span', 'hint')
      b.appendChild(hint)
      const refresh = () => {
        const chord = window.keymap.get(actionId)
        const text = chord ? '(' + window.keymapLib.displayChord(chord) + ')' : ''
        hint.textContent = text ? ' ' + text : ''
        b.title = text ? label + ' ' + text : label
      }
      hintRefreshers.push(refresh)
      refresh()
      return b
    }
    window.keymap.onChange(() => hintRefreshers.forEach((fn) => fn()))
    const runButton = labeled('text-button primary', '실행', 'run')
    const stopButton = labeled('text-button', '중지', 'stop')
    const compileButton = labeled('text-button', '컴파일 확인', 'compile')
    const saveCaseButton = el('button', 'text-button', '케이스로 저장')
    saveCaseButton.title = '방금 실행한 입력과 출력을 시험 케이스로 저장합니다'
    for (const b of [runButton, stopButton, compileButton, saveCaseButton]) b.type = 'button'
    stopButton.disabled = true
    saveCaseButton.disabled = true
    const statusEl = el('span', 'run-status')
    bar.append(tabInput, tabOutput, tabCases, tabTables, el('span', 'spacer'), statusEl, saveCaseButton, runButton, stopButton, compileButton)

    const inputArea = el('textarea', 'run-input')
    inputArea.spellcheck = false
    inputArea.placeholder = '비워 두고 실행하면 콘솔처럼 출력 탭에서 직접 입력합니다. 여기에 값을 쓰면 그 값을 미리 넣고 실행합니다(여러 줄 가능, 문제별로 기억).'
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
    const tablesPanel = window.createSqlTablesPanel(api, {
      currentFile: () => hooks.currentFile(),
      prepareRun: () => hooks.prepareRun(),
      getInput: () => inputArea.value,
      onStatus: (text, kind) => setStatus(text, kind),
    })
    tablesPanel.element.hidden = true
    // 실시간 입력줄: 입력 탭이 비어 있을 때 실행하면 출력 탭 아래에 나타난다(콘솔처럼 한 줄씩 입력).
    const liveRow = el('div', 'run-live')
    const liveInput = el('input', 'run-live-input')
    liveInput.type = 'text'
    liveInput.placeholder = '여기에 입력하고 Enter (입력 끝은 Ctrl+D)'
    liveInput.spellcheck = false
    liveInput.autocomplete = 'off'
    liveInput.setAttribute('aria-label', '실행 중인 프로그램에 입력')
    const liveSend = el('button', 'text-button', '보내기')
    const liveEof = el('button', 'text-button', '입력 끝 (Ctrl+D)')
    liveEof.title = '더 이상 입력이 없음을 알립니다(콘솔의 Ctrl+D 와 같음). 입력을 끝까지 읽는 프로그램이 끝납니다'
    for (const b of [liveSend, liveEof]) b.type = 'button'
    liveRow.append(liveInput, liveSend, liveEof)
    liveRow.hidden = true
    root.append(bar, inputArea, output, liveRow, casesPanel.element, tablesPanel.element)
    let lastRun = null // 마지막으로 성공한 실행의 { input, stdout } (케이스로 저장용)

    let currentProblemId = null
    let lastInput = ''
    let activeRunId = null
    let running = false
    let timeoutSec = 10
    let unsubscribe = null
    let liveRunning = false // 실시간 입력을 받는 실행 중인가
    let currentTab = 'input'

    function updateLive() {
      liveRow.hidden = !(liveRunning && currentTab === 'output')
    }

    function showTab(name) {
      currentTab = name
      tabInput.classList.toggle('active', name === 'input')
      tabOutput.classList.toggle('active', name === 'output')
      tabCases.classList.toggle('active', name === 'cases')
      tabTables.classList.toggle('active', name === 'tables')
      inputArea.hidden = name !== 'input'
      output.hidden = name !== 'output'
      casesPanel.element.hidden = name !== 'cases'
      tablesPanel.element.hidden = name !== 'tables'
      updateLive()
      if (name === 'tables') tablesPanel.refresh()
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
      liveRunning = false
      liveInput.value = ''
      updateLive()
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

    // 준비 단계(저장·설정 읽기)는 비동기라 running 이 켜지기 전에 F5 를 또 누를 수 있다. 그 사이를 막는다.
    let starting = false
    let external = false // 제출 전 점검처럼 다른 기능이 실행을 쓰는 중

    async function start(mode) {
      if (running || starting) return
      if (external) {
        setStatus('제출 전 점검 중에는 실행할 수 없습니다', 'fail')
        return
      }
      starting = true
      try {
        await startInner(mode)
      } finally {
        starting = false
      }
    }

    async function startInner(mode) {
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
      // 입력 탭이 비어 있으면 콘솔처럼 실행 중에 입력한다. 값이 있으면 그 값을 미리 넣고 입력을 닫는다(끝까지 읽는 프로그램이 멈추지 않도록).
      const live = mode === 'run' && input === ''
      writeSaved(INPUT_KEY_PREFIX + target.problem.id, input)

      showTab('output')
      clearOutput()
      setRunning(true)
      setStatus(mode === 'compile' ? '컴파일 중...' : '준비 중...', 'busy')
      const started = await api.startRun({ problemId: target.problem.id, fileName: target.file.name, mode, input, interactive: live })
      if (!started.ok) {
        setRunning(false)
        const text = started.error === 'BUSY' ? '이미 실행 중입니다' : '실행을 시작하지 못했습니다 (' + started.error + ')'
        append(text + '\n', 'out-err')
        setStatus(text, 'fail')
        return
      }
      activeRunId = started.runId
      if (live) {
        liveRunning = true
        updateLive()
        liveInput.focus()
      }
    }

    // 입력한 줄을 프로그램에 보내고, 콘솔처럼 출력에도 보여 준다.
    async function sendLive() {
      if (!liveRunning) return
      const text = liveInput.value
      liveInput.value = ''
      const r = await api.sendRunInput(text + '\n')
      if (r && r.ok) append(text + '\n', 'out-input')
      liveInput.focus()
    }

    async function endLive() {
      if (!liveRunning) return
      const r = await api.endRunInput()
      if (r && r.ok) append('^D\n', 'out-note')
      liveInput.focus()
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
      tabTables.hidden = !(problem.files || []).some((f) => f.language === 'sql')
      inputArea.placeholder =
        problem.kind === 'function'
          ? '함수 문제는 입력을 읽지 않습니다. "케이스" 탭에서 인수와 기대 반환값을 만들고 실행(F5)하면 케이스를 전부 실행합니다.'
          : '비워 두고 실행하면 콘솔처럼 출력 탭에서 직접 입력합니다. 여기에 값을 쓰면 그 값을 미리 넣고 실행합니다(여러 줄 가능, 문제별로 기억).'
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
    tabTables.addEventListener('click', () => showTab('tables'))
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
    liveSend.addEventListener('click', sendLive)
    liveEof.addEventListener('click', endLive)
    liveInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.isComposing) {
        e.preventDefault()
        e.stopPropagation()
        sendLive()
      } else if (e.key.toLowerCase() === 'd' && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        endLive()
      }
    })

    // 실행 관련 동작을 단축키·메뉴 등록소에 넘긴다. 어떤 키에 묶을지는 keymap.js 가 정한다.
    window.appActions.registerActions({
      run: () => start('run'),
      runAlt: () => start('run'),
      stop: () => stop(),
      compile: () => start('compile'),
      runCases: () => (external ? setStatus('제출 전 점검 중에는 실행할 수 없습니다', 'fail') : casesPanel.runAll().then(() => showTab('cases'))),
      tabInput: () => showTab('input'),
      tabOutput: () => showTab('output'),
      tabCases: () => showTab('cases'),
    })

    unsubscribe = api.onRunEvent(onEvent)

    return {
      element: root,
      onOpened,
      start,
      stop,
      // 다른 기능(제출 전 점검)이 실행을 쓰는 동안 실행 버튼을 막는다.
      setExternalBusy(value) {
        external = value
        runButton.disabled = value || running
        compileButton.disabled = value || running
      },
      get running() {
        return running
      },
      get casesRunning() {
        return casesPanel.running
      },
      dispose() {
        casesPanel.dispose()
        if (unsubscribe) unsubscribe()
      },
    }
  }

  window.createRunPanel = createRunPanel
})()
