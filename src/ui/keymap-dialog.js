// Copyright (c) dendr000. MIT License.
// "단축키 설정" 창: 동작 목록에서 키 칸을 누르고 새 키를 직접 눌러 지정한다.
// Esc = 취소, Backspace/Delete = 키 지우기. 겹치거나 쓸 수 없는 키는 이유를 보여 주고 받지 않는다. 글자는 textContent 로만 넣는다.
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createKeymapDialog() {
    const lib = window.keymapLib
    let overlay = null
    let captureId = null
    let message = null
    let rows = new Map() // id -> { keyButton, resetButton }
    let unsubscribe = null
    let returnFocus = null

    function renderRow(id) {
      const row = rows.get(id)
      const chord = window.keymap.get(id)
      const capturing = captureId === id
      row.keyButton.textContent = capturing ? '키를 누르세요 (Esc 취소, Backspace 지움)' : lib.displayChord(chord)
      row.keyButton.classList.toggle('capturing', capturing)
      row.keyButton.classList.toggle('custom', window.keymap.isCustom(id))
      row.resetButton.disabled = !window.keymap.isCustom(id)
    }

    function renderAll() {
      for (const id of rows.keys()) renderRow(id)
    }

    function setMessage(text, kind) {
      message.textContent = text
      message.dataset.kind = kind || ''
    }

    function stopCapture() {
      captureId = null
      window.appActions.setCapturing(false)
      renderAll()
    }

    function startCapture(id) {
      captureId = id
      window.appActions.setCapturing(true)
      setMessage('새 키를 누르세요. Esc 는 취소, Backspace 는 키 지우기.', '')
      renderAll()
      rows.get(id).keyButton.focus()
    }

    function onKey(e) {
      if (captureId) {
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'Escape') {
          setMessage('', '')
          stopCapture()
          return
        }
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete')) {
          window.keymap.set(captureId, '')
          setMessage('키를 지웠습니다.', 'ok')
          stopCapture()
          return
        }
        const chord = lib.chordFromEvent(e)
        if (!chord) return // Ctrl 만 누른 상태 등: 다음 키를 기다린다
        const result = window.keymap.set(captureId, chord)
        if (result.ok) setMessage(lib.displayChord(chord) + ' 로 지정했습니다.', 'ok')
        else setMessage(result.reason, 'fail')
        stopCapture()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }

    function build() {
      overlay = el('div', 'dialog-overlay')
      const box = el('div', 'dialog-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-modal', 'true')
      box.setAttribute('aria-label', '단축키 설정')
      box.appendChild(el('h2', 'dialog-title', '단축키 설정'))
      box.appendChild(el('p', 'dialog-sub', '바꿀 항목의 키 칸을 누른 뒤 새 키를 누르세요. Ctrl 또는 Alt 와 함께 누르거나 F1~F12 를 쓸 수 있습니다.'))
      const list = el('div', 'keymap-list')
      let group = null
      rows = new Map()
      for (const a of lib.ACTIONS) {
        if (a.fixed || a.id === 'about') continue // 바꿀 수 없는 항목은 목록에 넣지 않는다
        if (a.group !== group) {
          group = a.group
          list.appendChild(el('h3', 'keymap-group', group))
        }
        const row = el('div', 'keymap-row')
        row.appendChild(el('span', 'keymap-label', a.label))
        const keyButton = el('button', 'keymap-key')
        keyButton.type = 'button'
        keyButton.addEventListener('click', () => (captureId === a.id ? stopCapture() : startCapture(a.id)))
        const resetButton = el('button', 'text-button keymap-reset', '기본값')
        resetButton.type = 'button'
        resetButton.addEventListener('click', () => {
          if (captureId) stopCapture()
          const r = window.keymap.reset(a.id)
          setMessage(r.ok ? '기본 키로 되돌렸습니다.' : r.reason, r.ok ? 'ok' : 'fail')
        })
        row.append(keyButton, resetButton)
        list.appendChild(row)
        rows.set(a.id, { keyButton, resetButton })
      }
      box.appendChild(list)
      message = el('p', 'dialog-message')
      message.setAttribute('role', 'status')
      const bar = el('div', 'dialog-bar')
      const resetAll = el('button', 'text-button', '전체 초기화')
      resetAll.type = 'button'
      resetAll.addEventListener('click', () => {
        if (captureId) stopCapture()
        window.keymap.resetAll()
        setMessage('모든 단축키를 기본값으로 되돌렸습니다.', 'ok')
      })
      const closeButton = el('button', 'text-button primary', '닫기')
      closeButton.type = 'button'
      closeButton.addEventListener('click', close)
      bar.append(resetAll, el('span', 'spacer'), closeButton)
      box.append(message, bar)
      overlay.appendChild(box)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close()
      })
      document.body.appendChild(overlay)
    }

    function open() {
      if (overlay) return
      returnFocus = document.activeElement
      build()
      renderAll()
      unsubscribe = window.keymap.onChange(renderAll)
      window.appActions.setModal(true)
      document.addEventListener('keydown', onKey, true)
      overlay.querySelector('.keymap-key').focus()
    }

    function close() {
      if (!overlay) return
      if (captureId) stopCapture()
      document.removeEventListener('keydown', onKey, true)
      if (unsubscribe) unsubscribe()
      window.appActions.setModal(false)
      overlay.remove()
      overlay = null
      if (returnFocus && returnFocus.focus) returnFocus.focus()
    }

    return { open, close, get isOpen() { return overlay !== null } }
  }

  window.createKeymapDialog = createKeymapDialog
})()
