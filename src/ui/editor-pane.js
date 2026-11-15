// Copyright (c) dendr000. MIT License.
// 가운데 편집 영역: 파일 탭, 저장 상태, 코드 전체 복사, 시작 코드로 되돌리기, 자동 저장, 외부 변경 감지.
// 글자는 textContent 로만 넣는다.
(function () {
  const MONACO_LANGUAGE = { java: 'java', python: 'python', javascript: 'javascript', c: 'c', cpp: 'cpp', sql: 'sql' }
  const STATE_TEXT = { clean: '저장됨', dirty: '저장 대기 중...', saving: '저장 중...', error: '저장 실패' }
  const POLL_MS = 1500

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function button(label, title, onClick) {
    const b = el('button', 'text-button', label)
    b.type = 'button'
    b.title = title
    b.addEventListener('click', onClick)
    return b
  }

  // options: { footer: 편집기 아래에 붙일 요소(실행 패널), onOpened(problem, level, file): 파일을 열었을 때, onSaved(problem): 저장·되돌리기 직후 }
  function createEditorPane(container, api, options) {
    options = options || {}
    // 화면 부품
    const root = el('div', 'editor-pane')
    const header = el('div', 'editor-header')
    const titleEl = el('span', 'editor-title')
    const tabs = el('div', 'editor-tabs')
    const statusEl = el('span', 'editor-status')
    const banner = el('div', 'editor-banner')
    banner.hidden = true
    const host = el('div', 'editor-host')
    root.append(header, banner, host)
    if (options.footer) root.appendChild(options.footer)

    // 열려 있는 파일의 상태
    let monaco = null
    let editor = null
    let model = null
    let current = null // { problem, level, file }
    let baseMtime = 0 // 마지막으로 읽거나 저장했을 때의 파일 수정 시각
    let applying = false // 코드로 내용을 바꾸는 중(사용자 입력이 아님)
    let conflict = false
    let lastError = ''
    let statusTimer = null
    let pollTimer = null
    let openSerial = 0

    const saver = window.autosaver.createAutosaver({
      delay: 800,
      save: saveNow,
      onState: renderStatus,
    })

    function themeName() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs'
    }

    function renderStatus(state) {
      if (state === 'error' && lastError) statusEl.textContent = lastError
      else statusEl.textContent = STATE_TEXT[state] || ''
      statusEl.dataset.state = state
    }

    function flash(message) {
      statusEl.textContent = message
      clearTimeout(statusTimer)
      statusTimer = setTimeout(() => renderStatus(saver.state), 2500)
    }

    function showBanner(message, actions) {
      banner.replaceChildren(el('span', 'banner-text', message))
      for (const [label, fn] of actions) banner.appendChild(button(label, label, fn))
      banner.hidden = false
    }

    function hideBanner() {
      banner.hidden = true
      banner.replaceChildren()
    }

    function setContent(text) {
      applying = true
      try {
        // 파일의 줄바꿈(CRLF/LF)을 그대로 유지한다. 모델의 줄바꿈이 다르면 내용이 달라져 보이고 저장 때 바뀐다.
        const eol = text.includes('\r\n') ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF
        model.setEOL(eol)
        model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null)
      } finally {
        applying = false
      }
    }

    // 저장. false 를 돌려주면 자동 저장기가 '저장 실패' 로 본다.
    async function saveNow() {
      if (!current || !model || conflict) return !conflict
      const { problem, file } = current
      const result = await api.writeFile(problem.id, file.name, model.getValue(), baseMtime, false)
      if (!current || current.problem !== problem || current.file !== file) return true // 저장하는 사이 다른 파일로 옮김
      if (result.ok) {
        baseMtime = result.mtimeMs
        lastError = ''
        if (options.onSaved) options.onSaved(problem)
        return true
      }
      if (result.error === 'CONFLICT') {
        conflict = true
        lastError = '다른 프로그램이 파일을 바꿨습니다'
        showBanner('이 파일을 다른 프로그램(VS Code 등)이 바꿨습니다. 어느 쪽을 쓸까요?', [
          ['내 코드로 덮어쓰기', async () => { await overwrite() }],
          ['파일 내용 불러오기', async () => { await reloadFromDisk('파일 내용을 불러왔습니다') }],
        ])
        return false
      }
      lastError = result.error === 'FILE_NOT_FOUND' ? '파일이 없어 저장할 수 없습니다' : '저장 실패 (' + (result.error || '알 수 없음') + ')'
      return false
    }

    async function overwrite() {
      const { problem, file } = current
      const result = await api.writeFile(problem.id, file.name, model.getValue(), baseMtime, true)
      if (result.ok) {
        baseMtime = result.mtimeMs
        conflict = false
        lastError = ''
        if (options.onSaved) options.onSaved(problem)
        hideBanner()
        saver.reset()
        flash('덮어썼습니다')
      } else {
        flash('덮어쓰기 실패 (' + (result.error || '알 수 없음') + ')')
      }
    }

    async function reloadFromDisk(message) {
      const { problem, file } = current
      const result = await api.readFile(problem.id, file.name)
      if (!result.ok) {
        flash('파일을 읽을 수 없습니다 (' + result.error + ')')
        return
      }
      setContent(result.content)
      baseMtime = result.mtimeMs
      conflict = false
      lastError = ''
      hideBanner()
      saver.reset()
      if (message) flash(message)
    }

    // 1.5초마다 파일이 밖에서 바뀌었는지 확인한다.
    async function poll() {
      if (!current || !model || conflict || saver.state === 'saving') return
      const { problem, file } = current
      const result = await api.statFile(problem.id, file.name)
      if (!result.ok || !current || current.file !== file || saver.state === 'saving' || conflict) return
      if (result.mtimeMs === baseMtime) return
      if (saver.state === 'clean') {
        await reloadFromDisk('다른 프로그램의 변경을 불러왔습니다')
      } else {
        conflict = true
        lastError = '다른 프로그램이 파일을 바꿨습니다'
        renderStatus(saver.state)
        showBanner('편집 중에 다른 프로그램(VS Code 등)이 이 파일을 바꿨습니다. 어느 쪽을 쓸까요?', [
          ['내 코드로 덮어쓰기', async () => { await overwrite() }],
          ['파일 내용 불러오기', async () => { await reloadFromDisk('파일 내용을 불러왔습니다') }],
        ])
      }
    }

    async function copyAll() {
      if (!model) return
      const text = model.getValue()
      const result = await api.copyText(text)
      flash(result.ok ? `전체 복사됨 (${model.getLineCount()}줄)` : '복사 실패')
    }

    async function restore() {
      if (!current || !model) return
      if (!window.confirm('시작 코드로 되돌립니다. 지금 작성한 코드는 파일에서 사라집니다(Ctrl+Z 로는 되살릴 수 있음). 계속할까요?')) return
      const { problem, file } = current
      const result = await api.restoreOriginal(problem.id, file.name)
      if (!result.ok) {
        flash(result.error === 'ORIGINAL_NOT_FOUND' ? '시작 코드(original)를 찾을 수 없습니다' : '되돌리기 실패 (' + result.error + ')')
        return
      }
      setContent(result.content)
      baseMtime = result.mtimeMs
      conflict = false
      lastError = ''
      if (options.onSaved) options.onSaved(problem)
      hideBanner()
      saver.reset()
      flash('시작 코드로 되돌렸습니다')
    }

    async function ensureEditor() {
      if (editor) return true
      try {
        monaco = await window.loadMonaco()
      } catch (e) {
        host.replaceChildren(el('p', 'list-empty', e.message))
        return false
      }
      window.registerSnippets(monaco)
      window.registerMemberCompletion(monaco)
      editor = monaco.editor.create(host, {
        theme: themeName(),
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "D2Coding, Consolas, 'Malgun Gothic', monospace",
        tabSize: 4,
        scrollBeyondLastLine: false,
        mouseWheelZoom: true, // Ctrl + 휠로 글자 크기
        renderWhitespace: 'none',
        snippetSuggestions: 'top', // sout, fori 같은 단축 입력을 제안 맨 위에
        wordBasedSuggestions: 'off', // 같은 파일 이름 제안은 member-completion.js 가 직접 한다
        tabCompletion: 'on', // 단축 입력을 친 뒤 Tab 으로 펼침
      })
      new MutationObserver(() => monaco.editor.setTheme(themeName())).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
      pollTimer = setInterval(poll, POLL_MS)
      return true
    }

    function renderHeader() {
      header.replaceChildren()
      const { problem, level, file } = current
      titleEl.textContent = `Lv${level.level} ${String(problem.number).padStart(2, '0')}. ${problem.title}`
      tabs.replaceChildren()
      for (const f of problem.files) {
        const tab = el('button', 'editor-tab' + (f === file ? ' active' : ''), f.name)
        tab.type = 'button'
        tab.addEventListener('click', () => { if (f !== current.file) openFile(problem, level, f) })
        tabs.appendChild(tab)
      }
      header.append(
        titleEl,
        tabs,
        el('span', 'spacer'),
        statusEl,
        ...(options.onCheck ? [button('제출 전 점검', '컴파일·시험 케이스·흔한 실수를 점검한 뒤 복사합니다', options.onCheck)] : []),
        button('전체 복사', '코드 전체를 클립보드에 복사합니다 (사이트에 붙여 넣기용)', copyAll),
        button('시작 코드로', '사이트 시작 코드로 되돌립니다', restore),
      )
    }

    // 현재 파일의 변경을 저장하고 다른 파일을 연다. 저장에 실패하면 이동을 취소할지 묻고 false 를 돌려준다.
    async function openFile(problem, level, file) {
      const serial = ++openSerial
      if (current && model) {
        await saver.flush()
        if (serial !== openSerial) return false
        if (saver.state === 'error' || conflict) {
          if (!window.confirm('저장하지 못한 변경이 있습니다. 버리고 이동할까요?')) return false
        }
      }
      container.replaceChildren(root)
      if (!(await ensureEditor())) return true
      const result = await api.readFile(problem.id, file.name)
      if (serial !== openSerial) return true
      if (!result.ok) {
        current = null
        container.replaceChildren(el('p', 'list-empty', '파일을 읽을 수 없습니다 (' + result.error + ')'))
        return true
      }
      const previous = model
      model = monaco.editor.createModel(result.content, MONACO_LANGUAGE[file.language] || 'plaintext')
      model.onDidChangeContent(() => {
        if (!applying) saver.changed()
      })
      editor.setModel(model) // 새 모델을 붙인 뒤에 옛 모델을 버린다(붙은 채로 버리면 편집기 내부에서 취소 오류가 난다)
      if (previous) previous.dispose()
      current = { problem, level, file }
      baseMtime = result.mtimeMs
      conflict = false
      lastError = ''
      hideBanner()
      saver.reset()
      renderHeader()
      editor.focus()
      if (options.onOpened) options.onOpened(problem, level, file)
      return true
    }

    return {
      // 문제를 연다. 첫 파일(입출력이면 Main)을 보여 준다. false 면 사용자가 이동을 취소한 것이다.
      async open(problem, level) {
        if (problem.files.length === 0) {
          if (current && model) await saver.flush()
          current = null
          container.replaceChildren(el('p', 'list-empty', '이 문제 폴더에는 풀이 파일이 없습니다.'))
          return true
        }
        return openFile(problem, level, problem.files[0])
      },
      flush: () => saver.flush(),
      // 편집기의 현재 코드 전체(저장 여부와 상관없이 화면에 보이는 그대로)
      getText: () => (model ? model.getValue() : ''),
      // 메뉴에서 편집기 기본 기능을 부른다(실행 취소, 찾기 등). name: Monaco 동작 id
      trigger(name) {
        if (!editor) return
        editor.focus()
        editor.trigger('menu', name, null)
      },
      // 글자 크기: delta 만큼 키우거나(양수) 줄이고(음수), 0 이면 기본(14)으로. 8~40 으로 제한한다.
      changeFontSize(delta) {
        if (!editor) return
        const size = delta === 0 ? 14 : Math.min(40, Math.max(8, editor.getOption(monaco.editor.EditorOption.fontSize) + delta))
        editor.updateOptions({ fontSize: size })
      },
      // 지금 열려 있는 파일. 실행 패널이 무엇을 실행할지 알아내는 데 쓴다.
      currentFile: () => (current ? { problem: current.problem, level: current.level, file: current.file } : null),
      // 실행해도 되는 상태인가: 저장하지 못한 변경이나 충돌이 있으면 디스크의 옛 파일을 실행하게 되므로 막는다.
      async prepareRun() {
        if (!current) return { ok: false, reason: '열려 있는 파일이 없습니다' }
        await saver.flush()
        if (conflict) return { ok: false, reason: '다른 프로그램이 파일을 바꿔 저장하지 못했습니다. 위 안내에서 먼저 선택하세요' }
        if (saver.state === 'error') return { ok: false, reason: lastError || '저장하지 못해 실행하지 않습니다' }
        return { ok: true }
      },
      // 열려 있던 파일을 닫는다(저장은 하지 않음). 문제 폴더가 바뀌었을 때 옛 파일이 새 폴더에 저장되지 않게 한다.
      discard() {
        openSerial++
        saver.reset()
        current = null
        conflict = false
        lastError = ''
        hideBanner()
        if (model) {
          if (editor) editor.setModel(null)
          model.dispose()
          model = null
        }
      },
      copyAll,
      restore,
      get isOpen() {
        return current !== null
      },
      dispose() {
        clearInterval(pollTimer)
      },
    }
  }

  window.createEditorPane = createEditorPane
})()
