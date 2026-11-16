// Copyright (c) dendr000. MIT License.
// 설정 > SQL 기본 데이터: SQL 문제를 실행할 때 자동으로 만들어 두는 표와 데이터(묶음)를 고친다.
// 내장 묶음(school, shop, dbms)은 고치거나 처음 상태로 되돌릴 수 있고, 새 묶음을 만들 수도 있다. 글자는 textContent 로만 넣는다.
(function () {
  const NEW_TEMPLATE = 'CREATE TABLE memo(id INTEGER PRIMARY KEY, title TEXT);\nINSERT INTO memo VALUES (1, \'예시\');\n'

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // 화면 표시용: SQL 안의 CREATE TABLE 표 이름들
  function tableNames(sql) {
    const text = String(sql).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
    const names = []
    const re = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([A-Za-z_][A-Za-z0-9_]*)/gi
    let m
    while ((m = re.exec(text)) !== null) names.push(m[1])
    return [...new Set(names)]
  }

  function createSqlPresetsDialog(api) {
    let overlay = null
    let returnFocus = null

    function onKey(e) {
      if (window.focusTrap.handleTab(overlay, e)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }

    async function open() {
      if (overlay) return
      returnFocus = document.activeElement
      overlay = el('div', 'dialog-overlay')
      const box = el('div', 'dialog-box about-box preset-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-modal', 'true')
      box.setAttribute('aria-label', 'SQL 기본 데이터')
      box.appendChild(el('h2', 'dialog-title', 'SQL 기본 데이터'))
      box.appendChild(el('p', 'dialog-sub', 'SQL 풀이에 아래 표 이름이 나오면 이 표와 데이터를 자동으로 만들어 둡니다. 여기서 고치면 모든 SQL 문제에 적용됩니다. 입력 탭의 SQL 은 이 위에 더해져 먼저 실행됩니다.'))

      let presets = []
      let currentId = null
      let loadedSql = ''

      const select = el('select', 'settings-input')
      const addButton = el('button', 'text-button', '새 묶음')
      addButton.type = 'button'
      const pickRow = el('div', 'preset-row')
      pickRow.append(select, addButton)

      const newRow = el('div', 'preset-row')
      newRow.hidden = true
      const nameInput = el('input', 'settings-input')
      nameInput.type = 'text'
      nameInput.placeholder = '새 묶음 이름 (영문 소문자·숫자·밑줄)'
      nameInput.maxLength = 20
      nameInput.setAttribute('aria-label', '새 묶음 이름')
      const createButton = el('button', 'text-button primary', '만들기')
      createButton.type = 'button'
      newRow.append(nameInput, createButton)

      const info = el('p', 'dialog-sub preset-info')
      const text = el('textarea', 'preset-text')
      text.spellcheck = false
      text.setAttribute('aria-label', '기본 데이터 SQL')
      const message = el('p', 'preset-message')
      message.setAttribute('role', 'status')

      const bar = el('div', 'dialog-bar')
      const saveButton = el('button', 'text-button primary', '저장')
      const resetButton = el('button', 'text-button', '처음 상태로')
      const removeButton = el('button', 'text-button', '이 묶음 삭제')
      const closeButton = el('button', 'text-button', '닫기')
      for (const b of [saveButton, resetButton, removeButton, closeButton]) b.type = 'button'
      bar.append(saveButton, resetButton, removeButton, el('span', 'spacer'), closeButton)

      box.append(pickRow, newRow, info, text, message, bar)
      overlay.appendChild(box)

      const say = (msg, kind) => {
        message.textContent = msg || ''
        message.dataset.kind = kind || ''
      }
      const isDirty = () => text.value !== loadedSql
      const current = () => presets.find((p) => p.id === currentId)

      function showCurrent() {
        const p = current()
        if (!p) return
        loadedSql = p.sql
        text.value = p.sql
        const tables = tableNames(p.sql)
        info.textContent = '만드는 표: ' + (tables.length ? tables.join(', ') : '(없음)') + ' · 풀이 첫 줄에 -- @data: ' + p.id + ' 를 적으면 직접 고를 수 있어요.'
        resetButton.hidden = !(p.builtin && p.modified)
        removeButton.hidden = p.builtin
        say('')
      }

      function fillSelect() {
        select.replaceChildren()
        for (const p of presets) {
          const o = el('option', undefined, (p.builtin ? p.label : p.id + ' (내가 만든 묶음)') + (p.modified ? ' - 수정됨' : ''))
          o.value = p.id
          select.appendChild(o)
        }
        select.value = currentId
      }

      async function reload(keepId) {
        presets = await api.listSqlPresets()
        currentId = presets.some((p) => p.id === keepId) ? keepId : presets[0] && presets[0].id
        fillSelect()
        showCurrent()
      }

      select.addEventListener('change', () => {
        if (isDirty() && !window.confirm('저장하지 않은 수정이 있습니다. 버리고 다른 묶음을 볼까요?')) {
          select.value = currentId
          return
        }
        currentId = select.value
        showCurrent()
      })
      addButton.addEventListener('click', () => {
        newRow.hidden = !newRow.hidden
        if (!newRow.hidden) nameInput.focus()
      })
      createButton.addEventListener('click', async () => {
        const id = nameInput.value.trim()
        const r = await api.addSqlPreset(id, NEW_TEMPLATE)
        if (!r.ok) return say(r.message || '만들지 못했습니다.', 'error')
        nameInput.value = ''
        newRow.hidden = true
        await reload(id)
        say('새 묶음을 만들었습니다. 내용을 고쳐 저장하세요.', 'ok')
      })
      saveButton.addEventListener('click', async () => {
        const r = await api.saveSqlPreset(currentId, text.value)
        if (!r.ok) return say(r.message || '저장하지 못했습니다.', 'error')
        await reload(currentId)
        say('저장했습니다. 다음 실행부터 적용됩니다.', 'ok')
      })
      resetButton.addEventListener('click', async () => {
        if (!window.confirm('이 묶음을 처음 상태로 되돌립니다. 고친 내용은 사라집니다. 계속할까요?')) return
        const r = await api.resetSqlPreset(currentId)
        if (!r.ok) return say(r.message || '되돌리지 못했습니다.', 'error')
        await reload(currentId)
        say('처음 상태로 되돌렸습니다.', 'ok')
      })
      removeButton.addEventListener('click', async () => {
        if (!window.confirm('"' + currentId + '" 묶음을 삭제합니다. 계속할까요?')) return
        const r = await api.removeSqlPreset(currentId)
        if (!r.ok) return say(r.message || '삭제하지 못했습니다.', 'error')
        await reload()
        say('삭제했습니다.', 'ok')
      })
      closeButton.addEventListener('click', close)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay && !isDirty()) close()
      })

      document.body.appendChild(overlay)
      window.appActions.setModal(true)
      document.addEventListener('keydown', onKey, true)
      try {
        await reload()
      } catch {
        say('기본 데이터를 불러오지 못했습니다.', 'error')
      }
      select.focus()
    }

    function close() {
      if (!overlay) return
      document.removeEventListener('keydown', onKey, true)
      window.appActions.setModal(false)
      overlay.remove()
      overlay = null
      if (returnFocus && returnFocus.focus) returnFocus.focus()
    }

    return { open, close }
  }

  window.createSqlPresetsDialog = createSqlPresetsDialog
})()
