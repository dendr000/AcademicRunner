// Copyright (c) dendr000. MIT License.
// 도움말 > 정보: 앱 버전, 찾은 도구(Java, Python, Node) 버전, 문제 폴더를 보여 준다. 글자는 textContent 로만 넣는다.
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createAboutDialog(api) {
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
      const [info, tools, settings] = await Promise.all([api.getAppInfo(), api.getToolInfo(), api.getSettings()])
      if (overlay) return
      overlay = el('div', 'dialog-overlay')
      const box = el('div', 'dialog-box about-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-modal', 'true')
      box.setAttribute('aria-label', '정보')
      box.appendChild(el('h2', 'dialog-title', info.name + ' v' + info.version))
      box.appendChild(el('p', 'dialog-sub', '학원 과제 풀이를 열어 편집하고 실행·시험하는 개인용 도구입니다.'))
      const clean = (v) => (v ? String(v).replace(/^(javac|java|python|node)\s+/i, '') : '찾지 못함')
      const rows = [
        ['Java (javac)', clean(tools.java)],
        ['Python', clean(tools.python)],
        ['Node', clean(tools.node)],
        ['문제 폴더', settings.root],
        ['실행 시간 제한', settings.timeoutSec + '초'],
      ]
      const list = el('div', 'about-list')
      for (const [k, v] of rows) {
        list.appendChild(el('span', 'about-key', k))
        list.appendChild(el('span', 'about-value', v))
      }
      box.appendChild(list)
      const bar = el('div', 'dialog-bar')
      const closeButton = el('button', 'text-button primary', '닫기')
      closeButton.type = 'button'
      closeButton.addEventListener('click', close)
      bar.append(el('span', 'spacer'), closeButton)
      box.appendChild(bar)
      overlay.appendChild(box)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close()
      })
      document.body.appendChild(overlay)
      window.appActions.setModal(true)
      document.addEventListener('keydown', onKey, true)
      closeButton.focus()
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

  window.createAboutDialog = createAboutDialog
})()
