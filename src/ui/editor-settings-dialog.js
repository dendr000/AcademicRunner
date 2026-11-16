// Copyright (c) dendr000. MIT License.
// 설정 > 환경 설정: 글자 크기, 탭 칸 수, 줄 바꿈, 미니맵(편집기)과 실행 시간 제한. 바꾸면 바로 적용되고 저장된다. 글자는 textContent 로만 넣는다.
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createEditorSettingsDialog(settings, api) {
    const lib = window.editorSettingsLib
    let overlay = null
    let returnFocus = null
    let off = null

    function onKey(e) {
      if (window.focusTrap.handleTab(overlay, e)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }

    function row(label, control) {
      const wrap = el('label', 'settings-row')
      wrap.append(el('span', 'about-key', label), control)
      return wrap
    }

    function open() {
      if (overlay) return
      returnFocus = document.activeElement
      overlay = el('div', 'dialog-overlay')
      const box = el('div', 'dialog-box about-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-modal', 'true')
      box.setAttribute('aria-label', '환경 설정')
      box.appendChild(el('h2', 'dialog-title', '환경 설정'))
      box.appendChild(el('p', 'dialog-sub', '바꾸면 바로 적용되고 다음 실행에도 유지됩니다. 시간 제한은 다음 실행부터 적용됩니다.'))

      const cur = settings.get()
      const font = el('input', 'settings-input')
      font.type = 'number'
      font.min = String(lib.FONT_MIN)
      font.max = String(lib.FONT_MAX)
      font.step = '1'
      font.value = String(cur.fontSize)
      // 입력 중에는 범위 밖 값도 허용하고, 값이 정수이고 범위 안일 때만 적용한다. 칸을 떠날 때 값을 맞춰 보여 준다.
      font.addEventListener('input', () => {
        const n = Number(font.value)
        if (Number.isInteger(n) && n >= lib.FONT_MIN && n <= lib.FONT_MAX) settings.set({ fontSize: n })
      })
      font.addEventListener('blur', () => {
        font.value = String(settings.get().fontSize)
      })

      const tab = el('select', 'settings-input')
      for (const n of lib.TAB_SIZES) {
        const o = el('option', undefined, n + '칸')
        o.value = String(n)
        tab.appendChild(o)
      }
      tab.value = String(cur.tabSize)
      tab.addEventListener('change', () => settings.set({ tabSize: Number(tab.value) }))

      const wrapBox = el('input', 'settings-check')
      wrapBox.type = 'checkbox'
      wrapBox.checked = cur.wordWrap
      wrapBox.addEventListener('change', () => settings.set({ wordWrap: wrapBox.checked }))

      const mini = el('input', 'settings-check')
      mini.type = 'checkbox'
      mini.checked = cur.minimap
      mini.addEventListener('change', () => settings.set({ minimap: mini.checked }))

      const hintsBox = el('input', 'settings-check')
      hintsBox.type = 'checkbox'
      hintsBox.checked = cur.paramHints
      hintsBox.addEventListener('change', () => settings.set({ paramHints: hintsBox.checked }))

      // 실행 시간 제한(초): 앱 설정 파일에 저장되고 다음 실행부터 적용된다. 값은 메인 프로세스가 1~120 으로 검사한다.
      const limit = el('input', 'settings-input')
      limit.type = 'number'
      limit.min = '1'
      limit.max = '120'
      limit.step = '1'
      api.getSettings().then((s) => {
        limit.value = String(s.timeoutSec)
      })
      limit.addEventListener('input', () => {
        const n = Number(limit.value)
        if (Number.isInteger(n) && n >= 1 && n <= 120) api.setTimeoutSec(n)
      })
      limit.addEventListener('blur', async () => {
        limit.value = String((await api.getSettings()).timeoutSec)
      })

      const list = el('div', 'settings-list')
      list.append(row('글자 크기 (' + lib.FONT_MIN + '~' + lib.FONT_MAX + ')', font), row('탭 칸 수', tab), row('긴 줄 바꿈', wrapBox), row('미니맵', mini), row('매개변수 이름 힌트', hintsBox), row('실행 시간 제한 (1~120초)', limit))
      box.appendChild(list)
      box.appendChild(window.createMobileSection(api).element)

      // 다른 곳(Ctrl + 휠, 단축키)에서 바뀐 값도 창에 반영한다.
      off = settings.onChange((v) => {
        if (document.activeElement !== font) font.value = String(v.fontSize)
        tab.value = String(v.tabSize)
        wrapBox.checked = v.wordWrap
        mini.checked = v.minimap
        hintsBox.checked = v.paramHints
      })

      const bar = el('div', 'dialog-bar')
      const reset = el('button', 'text-button', '기본값으로')
      reset.type = 'button'
      reset.addEventListener('click', () => settings.reset())
      const closeButton = el('button', 'text-button primary', '닫기')
      closeButton.type = 'button'
      closeButton.addEventListener('click', close)
      bar.append(reset, el('span', 'spacer'), closeButton)
      box.appendChild(bar)
      overlay.appendChild(box)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close()
      })
      document.body.appendChild(overlay)
      window.appActions.setModal(true)
      document.addEventListener('keydown', onKey, true)
      font.focus()
    }

    function close() {
      if (!overlay) return
      document.removeEventListener('keydown', onKey, true)
      if (off) off()
      off = null
      window.appActions.setModal(false)
      overlay.remove()
      overlay = null
      if (returnFocus && returnFocus.focus) returnFocus.focus()
    }

    return { open, close }
  }

  window.createEditorSettingsDialog = createEditorSettingsDialog
})()
