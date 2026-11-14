// Copyright (c) dendr000. MIT License.
// 실행 패널의 "케이스" 탭: 문제별 시험 케이스(입력, 기대 출력)를 만들고 고치고, 전부 실행해 통과/실패를 본다.
// 글자는 textContent 로만 넣는다.
(function () {
  const STATUS_TEXT = {
    pass: '통과',
    fail: '실패',
    timeout: '시간 초과',
    error: '오류',
    truncated: '출력 초과',
    stopped: '중지',
    skipped: '건너뜀',
  }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // api: window.runnerApi, hooks: { currentFile(), prepareRun(), onStatus(text, kind) }
  function createCasesPanel(api, hooks) {
    const root = el('div', 'cases-panel')
    const side = el('div', 'cases-side')
    const toolbar = el('div', 'cases-toolbar')
    const addButton = el('button', 'text-button', '케이스 추가')
    const runAllButton = el('button', 'text-button primary', '전부 실행')
    const runAllHint = el('span', 'hint')
    runAllButton.appendChild(runAllHint)
    const refreshRunAllHint = () => {
      const chord = window.keymap.get('runCases')
      const text = chord ? '(' + window.keymapLib.displayChord(chord) + ')' : ''
      runAllHint.textContent = text ? ' ' + text : ''
      runAllButton.title = text ? '전부 실행 ' + text : '전부 실행'
    }
    refreshRunAllHint()
    window.keymap.onChange(refreshRunAllHint)
    for (const b of [addButton, runAllButton]) b.type = 'button'
    const summary = el('span', 'cases-summary')
    toolbar.append(addButton, runAllButton, summary)
    const listEl = el('ul', 'cases-list')
    side.append(toolbar, listEl)

    const form = el('div', 'cases-form')
    const nameInput = el('input', 'cases-name')
    nameInput.type = 'text'
    nameInput.maxLength = 80
    nameInput.placeholder = '케이스 이름'
    nameInput.setAttribute('aria-label', '케이스 이름')
    const inputArea = el('textarea', 'cases-text')
    inputArea.placeholder = '입력'
    inputArea.spellcheck = false
    inputArea.setAttribute('aria-label', '케이스 입력')
    const expectedArea = el('textarea', 'cases-text')
    expectedArea.placeholder = '기대 출력 (줄 끝 공백과 끝의 빈 줄은 무시하고 비교)'
    expectedArea.spellcheck = false
    expectedArea.setAttribute('aria-label', '기대 출력')
    const formBar = el('div', 'cases-form-bar')
    const saveButton = el('button', 'text-button', '저장')
    const deleteButton = el('button', 'text-button', '삭제')
    for (const b of [saveButton, deleteButton]) b.type = 'button'
    const formStatus = el('span', 'cases-form-status')
    formBar.append(saveButton, deleteButton, formStatus)
    const resultBox = el('pre', 'cases-result')
    resultBox.hidden = true
    form.append(nameInput, inputArea, expectedArea, formBar, resultBox)
    form.hidden = true

    root.append(side, form)

    let problemId = null
    let isFunction = false
    let cases = []
    let selectedId = null
    let results = new Map() // 케이스 id -> 결과
    let activeRunId = null
    let running = false
    let unsubscribe = null

    function setFormStatus(text) {
      formStatus.textContent = text
    }

    function renderList() {
      listEl.replaceChildren()
      if (cases.length === 0) {
        listEl.appendChild(el('li', 'cases-empty', problemId ? '저장된 케이스가 없습니다. "케이스 추가" 또는 실행 뒤 "케이스로 저장" 을 누르세요.' : '문제를 먼저 고르세요.'))
        return
      }
      for (const c of cases) {
        const li = el('li', 'cases-item' + (c.id === selectedId ? ' selected' : ''))
        const btn = el('button', 'cases-item-button')
        btn.type = 'button'
        btn.appendChild(el('span', 'cases-item-name', c.name))
        const r = results.get(c.id)
        if (r) {
          const badge = el('span', 'cases-badge', STATUS_TEXT[r.status] || r.status)
          badge.dataset.status = r.status
          btn.appendChild(badge)
        }
        btn.addEventListener('click', () => select(c.id))
        li.appendChild(btn)
        listEl.appendChild(li)
      }
    }

    function renderResult() {
      const r = selectedId ? results.get(selectedId) : null
      resultBox.replaceChildren()
      if (!r) {
        resultBox.hidden = true
        return
      }
      resultBox.hidden = false
      const head = el('span', r.status === 'pass' ? 'out-note-ok' : 'out-note-fail', `${STATUS_TEXT[r.status] || r.status}`)
      resultBox.appendChild(head)
      if (typeof r.durationMs === 'number') resultBox.appendChild(el('span', 'out-note', `  ${window.runSummary.formatMs(r.durationMs)}\n`))
      else resultBox.appendChild(document.createTextNode('\n'))
      if (r.status === 'fail' && r.diff && r.diff.value) {
        if (r.diff.error === 'BAD_EXPECTED') resultBox.appendChild(el('span', 'out-err', '기대 반환값이 올바른 JSON 이 아닙니다 (예: 55, "abc", [1,2], true)\n'))
        else if (r.diff.error === 'BAD_ACTUAL') resultBox.appendChild(el('span', 'out-err', '실제 반환값을 읽지 못했습니다: ' + r.diff.actual + '\n'))
        else resultBox.appendChild(el('span', 'out-note', '반환값이 다릅니다\n'))
        if (r.diff.error !== 'BAD_EXPECTED') resultBox.appendChild(el('span', 'out-std', '기대: ' + r.diff.expected + '\n'))
        resultBox.appendChild(el('span', 'out-err', '실제: ' + r.diff.actual + '\n'))
      } else if (r.status === 'fail' && r.diff) {
        resultBox.appendChild(el('span', 'out-note', `${r.diff.line}번째 줄이 다릅니다\n`))
        resultBox.appendChild(el('span', 'out-std', '기대: ' + (r.diff.expected === null ? '(줄 없음)' : r.diff.expected) + '\n'))
        resultBox.appendChild(el('span', 'out-err', '실제: ' + (r.diff.actual === null ? '(줄 없음)' : r.diff.actual) + '\n'))
      }
      if (r.message) resultBox.appendChild(el('span', 'out-err', r.message + '\n'))
      if (r.stdout && r.status !== 'pass' && !(r.diff && r.diff.value)) resultBox.appendChild(el('span', 'out-note', '\n--- 실제 출력 ---\n' + r.stdout))
      if (r.stderr) resultBox.appendChild(el('span', 'out-err', '\n--- 오류 출력 ---\n' + r.stderr))
    }

    function fillForm(c) {
      nameInput.value = c ? c.name : ''
      inputArea.value = c ? c.input : ''
      expectedArea.value = c ? c.expected : ''
      form.hidden = !c
      setFormStatus('')
      renderResult()
    }

    function select(id) {
      selectedId = id
      fillForm(cases.find((c) => c.id === id) || null)
      renderList()
    }

    function renderSummary() {
      const done = [...results.values()].filter((r) => r.status !== 'skipped')
      if (done.length === 0) {
        summary.textContent = cases.length > 0 ? `${cases.length}개` : ''
        return
      }
      const passed = done.filter((r) => r.status === 'pass').length
      summary.textContent = `${passed} / ${cases.length} 통과`
      summary.dataset.kind = passed === cases.length ? 'ok' : 'fail'
    }

    async function reload(keepSelection) {
      cases = problemId ? await api.listCases(problemId) : []
      if (!keepSelection || !cases.some((c) => c.id === selectedId)) selectedId = cases.length > 0 ? cases[0].id : null
      fillForm(cases.find((c) => c.id === selectedId) || null)
      renderList()
      renderSummary()
    }

    async function saveCurrent() {
      if (!problemId) return
      const item = { name: nameInput.value, input: inputArea.value, expected: expectedArea.value }
      if (selectedId) item.id = selectedId
      const r = await api.saveCase(problemId, item)
      if (!r.ok) {
        setFormStatus('저장 실패 (' + r.error + ')')
        return
      }
      selectedId = r.case.id
      results.delete(r.case.id) // 내용이 바뀌었으니 이전 결과는 무효
      await reload(true)
      setFormStatus('저장했습니다')
    }

    async function add(initial) {
      if (!problemId) {
        hooks.onStatus('먼저 왼쪽에서 문제를 고르세요', 'fail')
        return null
      }
      const r = await api.saveCase(problemId, { name: '', input: initial ? initial.input : '', expected: initial ? initial.expected : '' })
      if (!r.ok) {
        hooks.onStatus('케이스를 추가하지 못했습니다 (' + r.error + ')', 'fail')
        return null
      }
      selectedId = r.case.id
      await reload(true)
      return r.case
    }

    async function removeCurrent() {
      if (!problemId || !selectedId) return
      if (!window.confirm('이 케이스를 삭제할까요?')) return
      await api.removeCase(problemId, selectedId)
      results.delete(selectedId)
      selectedId = null
      await reload(false)
    }

    function onEvent(event) {
      if (event.runId !== activeRunId) return
      if (event.type === 'case-done') {
        results.set(event.id, event.result)
        renderList()
        if (event.id === selectedId) renderResult()
        renderSummary()
        return
      }
      if (event.type === 'phase') {
        hooks.onStatus(event.phase === 'compile' ? '컴파일 중...' : '케이스 실행 중...', 'busy')
        return
      }
      if (event.type === 'done') {
        activeRunId = null
        running = false
        runAllButton.disabled = false
        const r = event.result
        if (r.phase === 'cases') {
          for (const cr of r.caseResults) results.set(cr.id, cr)
          renderList()
          renderResult()
          renderSummary()
          hooks.onStatus(
            r.stopped ? '중지했습니다' : `케이스 ${r.passed} / ${r.total} 통과`,
            r.stopped ? 'fail' : r.ok ? 'ok' : 'fail',
          )
        } else {
          const text = window.runSummary.describeResult(r, 10).text
          const detail = r.compileOutput ? '\n' + r.compileOutput : ''
          hooks.onStatus(text, 'fail')
          if (r.phase === 'compile') hooks.showMessage(text + detail)
        }
      }
    }

    async function runAll() {
      if (running) return
      if (!problemId || cases.length === 0) {
        hooks.onStatus('실행할 케이스가 없습니다', 'fail')
        return
      }
      const target = hooks.currentFile()
      if (!target) return
      const prep = await hooks.prepareRun()
      if (!prep.ok) {
        hooks.onStatus(prep.reason, 'fail')
        return
      }
      results = new Map()
      renderList()
      renderResult()
      renderSummary()
      running = true
      runAllButton.disabled = true
      const started = await api.startRun({ problemId: target.problem.id, fileName: target.file.name, mode: 'run', useCases: true })
      if (!started.ok) {
        running = false
        runAllButton.disabled = false
        hooks.onStatus(started.error === 'BUSY' ? '이미 실행 중입니다' : '실행을 시작하지 못했습니다 (' + started.error + ')', 'fail')
        return
      }
      activeRunId = started.runId
    }

    function applyKind() {
      inputArea.placeholder = isFunction ? '인수 (JSON 배열, 예: [10] 또는 [[1,2,3], "abc"])' : '입력'
      expectedArea.placeholder = isFunction ? '기대 반환값 (JSON, 예: 55 또는 "abc" 또는 [1,2])' : '기대 출력 (줄 끝 공백과 끝의 빈 줄은 무시하고 비교)'
    }

    function onOpened(problem) {
      isFunction = problem.kind === 'function'
      applyKind()
      if (problemId === problem.id) return
      problemId = problem.id
      results = new Map()
      selectedId = null
      reload(false)
    }

    addButton.addEventListener('click', async () => {
      await add(null)
      nameInput.focus()
    })
    runAllButton.addEventListener('click', runAll)
    saveButton.addEventListener('click', saveCurrent)
    deleteButton.addEventListener('click', removeCurrent)
    unsubscribe = api.onRunEvent(onEvent)

    return {
      element: root,
      onOpened,
      runAll,
      // 실행 결과를 그대로 새 케이스로 저장한다(기대 출력은 나중에 고칠 수 있다).
      async addFromRun(input, expected) {
        const c = await add({ input, expected })
        return c
      },
      get running() {
        return running
      },
      dispose() {
        if (unsubscribe) unsubscribe()
      },
    }
  }

  window.createCasesPanel = createCasesPanel
})()
