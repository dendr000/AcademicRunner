// Copyright (c) dendr000. MIT License.
// 동작 등록소 + 전체 단축키 처리. 키 -> 동작 id 는 keymap.js(사용자가 바꿀 수 있음)가 정하고,
// 동작 id -> 실제 일은 각 화면 부품이 registerActions 로 등록한다. 메뉴바도 같은 runAction 을 부른다.
// 편집기(Monaco)가 키를 먼저 가져가므로 캡처 단계에서 가로챈다.
(function () {
  const handlers = new Map()
  let capturing = false // 설정 창에서 새 키를 받는 중에는 단축키를 실행하지 않는다
  let modal = false // 설정 창이 열려 있는 동안에는 뒤쪽 화면의 단축키를 막는다

  function registerActions(map) {
    for (const [id, fn] of Object.entries(map)) handlers.set(id, fn)
  }

  // 등록된 동작을 실행한다. 등록되지 않았으면 false.
  function runAction(id) {
    const fn = handlers.get(id)
    if (!fn) return false
    fn()
    return true
  }

  function setCapturing(value) {
    capturing = value
  }

  function setModal(value) {
    modal = value
  }

  function installShortcuts() {
    document.addEventListener(
      'keydown',
      (e) => {
        if (capturing || modal || e.isComposing) return
        const chord = window.keymapLib.chordFromEvent(e)
        if (!chord) return
        const id = window.keymap.actionFor(chord)
        if (!id || !handlers.has(id)) return
        e.preventDefault()
        e.stopPropagation()
        runAction(id)
      },
      true,
    )
  }

  window.appActions = { registerActions, runAction, setCapturing, setModal }
  window.installShortcuts = installShortcuts
})()
