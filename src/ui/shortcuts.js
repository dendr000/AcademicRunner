// Copyright (c) dendr000. MIT License.
// 앱 전체 단축키(문제 이동·목록 접기·복사·되돌리기). 실행 관련 키(F5 등)는 run-panel.js 가 맡는다.
// 편집기(Monaco)가 키를 먼저 가져가므로 캡처 단계에서 가로챈다.
(function () {
  // actions: { quickJump(), moveProblem(delta), toggleSidebar(), copyAll(), restore() }
  function installShortcuts(actions) {
    document.addEventListener(
      'keydown',
      (e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
        let handled = true
        if (e.ctrlKey && !e.shiftKey && !e.altKey && key === 'p') actions.quickJump()
        else if (e.ctrlKey && !e.shiftKey && !e.altKey && key === 'b') actions.toggleSidebar()
        else if (e.ctrlKey && e.shiftKey && !e.altKey && key === 'c') actions.copyAll()
        else if (e.ctrlKey && e.shiftKey && !e.altKey && key === 'r') actions.restore()
        else if (e.ctrlKey && e.shiftKey && !e.altKey && key === 'ArrowUp') actions.moveProblem(-1)
        else if (e.ctrlKey && e.shiftKey && !e.altKey && key === 'ArrowDown') actions.moveProblem(1)
        else handled = false
        if (handled) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      true,
    )
  }

  window.installShortcuts = installShortcuts
})()
