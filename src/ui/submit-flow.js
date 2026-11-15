// Copyright (c) dendr000. MIT License.
// "제출 전 점검": 코드 정적 점검 -> 컴파일(문법) 확인 -> 저장된 시험 케이스 전부 실행 순서로 확인하고,
// 결과를 한 창에 모아 보여 준다. 끝나면 그 자리에서 코드 전체를 복사할 수 있다.
// 판단 규칙은 submit-check.js(순수 함수). 글자는 textContent 로만 넣는다.
(function () {
  const LEVEL_TEXT = { ok: '통과', warn: '주의', fail: '실패', busy: '진행' }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // deps: { editorPane, runPanel }
  function createSubmitFlow(api, deps) {
    let overlay = null
    let cancelled = false
    let running = false
    let returnFocus = null

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }

    // 실행 하나를 시작하고 끝날 때까지 기다린다. 끝난 결과(run-service 결과)를 돌려준다.
    function runJob(request) {
      return new Promise((resolve) => {
        const dones = new Map()
        let runId = null
        let off = null
        const finish = (result) => {
          if (off) off()
          resolve(result)
        }
        off = api.onRunEvent((event) => {
          if (event.type !== 'done') return
          if (runId === null) dones.set(event.runId, event.result)
          else if (event.runId === runId) finish(event.result)
        })
        api.startRun(request).then((started) => {
          if (!started.ok) {
            finish({ ok: false, phase: 'prepare', error: started.error, message: started.error === 'BUSY' ? '다른 실행이 진행 중입니다' : started.error })
            return
          }
          runId = started.runId
          if (dones.has(runId)) finish(dones.get(runId))
        })
      })
    }

    function build(title) {
      overlay = el('div', 'dialog-overlay')
      const box = el('div', 'dialog-box submit-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-modal', 'true')
      box.setAttribute('aria-label', '제출 전 점검')
      box.appendChild(el('h2', 'dialog-title', '제출 전 점검'))
      box.appendChild(el('p', 'dialog-sub', title))
      const list = el('div', 'check-list')
      list.setAttribute('role', 'status')
      const verdict = el('p', 'dialog-message')
      const bar = el('div', 'dialog-bar')
      const copyButton = el('button', 'text-button primary', '복사하기')
      copyButton.type = 'button'
      copyButton.disabled = true
      const closeButton = el('button', 'text-button', '닫기')
      closeButton.type = 'button'
      closeButton.addEventListener('click', close)
      bar.append(el('span', 'spacer'), closeButton, copyButton)
      box.append(list, verdict, bar)
      overlay.appendChild(box)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close()
      })
      document.body.appendChild(overlay)
      window.appActions.setModal(true)
      document.addEventListener('keydown', onKey, true)
      closeButton.focus()
      return { list, verdict, copyButton }
    }

    function addRow(list, level, text) {
      const row = el('div', 'check-row')
      const badge = el('span', 'check-badge', LEVEL_TEXT[level])
      badge.dataset.level = level
      row.append(badge, el('span', 'check-text', text))
      list.appendChild(row)
      return row
    }

    async function open() {
      if (overlay) return
      returnFocus = document.activeElement
      const target = deps.editorPane.currentFile()
      const parts = build(target ? target.problem.title + ' / ' + target.file.name : '열린 파일이 없습니다')
      const { list, verdict, copyButton } = parts
      if (!target) {
        addRow(list, 'fail', '먼저 왼쪽에서 문제를 고르세요')
        return
      }
      if (deps.runPanel.running || deps.runPanel.casesRunning) {
        addRow(list, 'fail', '실행 중에는 점검할 수 없습니다. 실행이 끝난 뒤 다시 시도하세요')
        return
      }
      cancelled = false
      running = true
      deps.runPanel.setExternalBusy(true)
      const items = []
      const show = (level, text) => {
        items.push({ level, text })
        addRow(list, level, text)
      }
      const busyRow = addRow(list, 'busy', '점검 중...')
      try {
        // 1) 저장 확인
        const prep = await deps.editorPane.prepareRun()
        if (!prep.ok) {
          show('fail', prep.reason)
          return
        }
        // 2) 코드 점검
        for (const it of window.submitCheck.staticChecks(target.file.language, target.file.kind, deps.editorPane.getText())) show(it.level, it.text)
        if (cancelled) return
        // 3) 컴파일(문법) 확인
        busyRow.querySelector('.check-text').textContent = '컴파일(문법) 확인 중...'
        const compiled = await runJob({ problemId: target.problem.id, fileName: target.file.name, mode: 'compile', input: '' })
        if (cancelled) return
        const compileItem = window.submitCheck.compileItem(compiled)
        show(compileItem.level, compileItem.text)
        // 4) 시험 케이스 전부 실행(컴파일이 통과했을 때만 의미가 있다)
        const saved = await api.listCases(target.problem.id)
        if (compileItem.level === 'fail') {
          if (saved.length > 0) show('warn', '컴파일 오류가 있어 시험 케이스는 실행하지 않았습니다')
        } else if (saved.length === 0) {
          const none = window.submitCheck.casesItem(null, 0)
          show(none.level, none.text)
        } else {
          busyRow.querySelector('.check-text').textContent = '시험 케이스 ' + saved.length + '개 실행 중...'
          const ran = await runJob({ problemId: target.problem.id, fileName: target.file.name, mode: 'run', useCases: true })
          if (cancelled) return
          const c = window.submitCheck.casesItem(ran, saved.length)
          show(c.level, c.text)
        }
      } finally {
        running = false
        deps.runPanel.setExternalBusy(false)
        if (!cancelled && overlay) {
          busyRow.remove()
          const worst = window.submitCheck.worst(items)
          verdict.dataset.kind = worst === 'ok' ? 'ok' : worst === 'warn' ? '' : 'fail'
          verdict.textContent =
            worst === 'ok' ? '모두 통과했습니다. 제출해도 좋습니다.' : worst === 'warn' ? '확인할 것이 있습니다. 내용을 보고 판단하세요.' : '실패 항목이 있습니다. 고친 뒤 제출하는 것을 권합니다.'
          copyButton.textContent = worst === 'fail' ? '그래도 복사' : '복사하기'
          copyButton.disabled = false
          copyButton.addEventListener('click', async () => {
            await deps.editorPane.copyAll()
            close()
          })
          copyButton.focus()
        }
      }
    }

    function close() {
      if (!overlay) return
      if (running) {
        cancelled = true
        api.stopRun()
      }
      document.removeEventListener('keydown', onKey, true)
      window.appActions.setModal(false)
      overlay.remove()
      overlay = null
      if (returnFocus && returnFocus.focus) returnFocus.focus()
    }

    return { open, close }
  }

  window.createSubmitFlow = createSubmitFlow
})()
