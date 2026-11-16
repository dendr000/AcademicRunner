// Copyright (c) dendr000. MIT License.
// 대화창이 열려 있는 동안 Tab / Shift+Tab 이 대화창 안에서만 돌게 한다(뒤의 편집기·목록으로 빠져나가지 않게).
(function () {
  const SELECTOR = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

  // keydown 이벤트를 받아 Tab 이면 container 안에서 포커스를 돌린다. 처리했으면 true.
  function handleTab(container, e) {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || !container) return false
    const items = [...container.querySelectorAll(SELECTOR)].filter((n) => n.offsetParent !== null || n === document.activeElement)
    if (items.length === 0) {
      e.preventDefault()
      return true
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!container.contains(active)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    } else return false // 안쪽 이동은 기본 동작에 맡긴다
    return true
  }

  window.focusTrap = { handleTab }
})()
