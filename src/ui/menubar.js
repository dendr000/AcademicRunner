// Copyright (c) dendr000. MIT License.
// 최상단 메뉴바(파일, 보기, 이동, 실행, 설정). 항목은 동작 id 로 정의하고, 누르면 단축키와 같은 runAction 을 부른다.
// 항목 오른쪽에는 지금 지정된 단축키를 보여 준다. 글자는 textContent 로만 넣는다.
(function () {
  // 'sep' 는 구분선
  const MENUS = [
    { label: '파일', items: ['chooseRoot', 'save', 'sep', 'copyAll', 'restore', 'sep', 'quit'] },
    { label: '보기', items: ['toggleSidebar', 'toggleTheme', 'sep', 'fontBigger', 'fontSmaller', 'fontReset'] },
    { label: '이동', items: ['quickJump', 'prevProblem', 'nextProblem'] },
    { label: '실행', items: ['run', 'stop', 'compile', 'runCases', 'sep', 'tabInput', 'tabOutput', 'tabCases'] },
    { label: '설정', items: ['openKeymap'] },
  ]
  // 메뉴에서만 쓰는 이름(전체 문구는 동작 목록의 label)
  const MENU_LABEL = { chooseRoot: '문제 폴더 선택...', openKeymap: '단축키 설정...', quit: '종료' }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createMenubar(container) {
    const labelOf = new Map(window.keymapLib.ACTIONS.map((a) => [a.id, a.label]))
    const bar = el('nav', 'menubar')
    bar.setAttribute('aria-label', '메뉴')
    let openIndex = -1
    const buttons = []
    const pops = []
    const chordCells = [] // [{ id, cell }]

    function refreshChords() {
      for (const { id, cell } of chordCells) cell.textContent = window.keymapLib.displayChord(window.keymap.get(id)).replace(/^없음$/, '')
    }

    function close() {
      if (openIndex < 0) return
      pops[openIndex].hidden = true
      buttons[openIndex].setAttribute('aria-expanded', 'false')
      buttons[openIndex].classList.remove('open')
      openIndex = -1
    }

    function open(index, focusFirst) {
      close()
      openIndex = index
      pops[index].hidden = false
      buttons[index].setAttribute('aria-expanded', 'true')
      buttons[index].classList.add('open')
      if (focusFirst) {
        const first = pops[index].querySelector('.menu-item')
        if (first) first.focus()
      }
    }

    function move(delta) {
      const next = (openIndex + delta + MENUS.length) % MENUS.length
      open(next, true)
    }

    MENUS.forEach((menu, index) => {
      const wrap = el('div', 'menu')
      const button = el('button', 'menu-button', menu.label)
      button.type = 'button'
      button.setAttribute('aria-haspopup', 'menu')
      button.setAttribute('aria-expanded', 'false')
      const pop = el('div', 'menu-pop')
      pop.setAttribute('role', 'menu')
      pop.hidden = true
      for (const id of menu.items) {
        if (id === 'sep') {
          pop.appendChild(el('div', 'menu-sep'))
          continue
        }
        const item = el('button', 'menu-item')
        item.type = 'button'
        item.setAttribute('role', 'menuitem')
        item.appendChild(el('span', 'menu-label', MENU_LABEL[id] || labelOf.get(id)))
        const cell = el('span', 'menu-chord')
        item.appendChild(cell)
        chordCells.push({ id, cell })
        item.addEventListener('click', () => {
          close()
          window.appActions.runAction(id)
        })
        pop.appendChild(item)
      }
      button.addEventListener('click', () => (openIndex === index ? close() : open(index, false)))
      button.addEventListener('mouseenter', () => {
        if (openIndex >= 0 && openIndex !== index) open(index, false)
      })
      wrap.append(button, pop)
      bar.appendChild(wrap)
      buttons.push(button)
      pops.push(pop)
    })

    // 키보드: 열린 메뉴에서 위/아래로 항목, 좌/우로 메뉴 이동, Esc 로 닫기
    bar.addEventListener('keydown', (e) => {
      if (openIndex < 0) return
      const items = [...pops[openIndex].querySelectorAll('.menu-item')]
      const at = items.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') {
        items[(at + 1) % items.length].focus()
      } else if (e.key === 'ArrowUp') {
        items[(at - 1 + items.length) % items.length].focus()
      } else if (e.key === 'ArrowRight') {
        move(1)
      } else if (e.key === 'ArrowLeft') {
        move(-1)
      } else if (e.key === 'Escape') {
        const index = openIndex
        close()
        buttons[index].focus()
      } else {
        return
      }
      e.preventDefault()
      e.stopPropagation()
    })

    // 바깥을 누르면 닫는다
    document.addEventListener('mousedown', (e) => {
      if (openIndex >= 0 && !bar.contains(e.target)) close()
    })
    window.addEventListener('blur', close)

    window.keymap.onChange(refreshChords)
    refreshChords()
    container.prepend(bar)
    return { element: bar, close, refresh: refreshChords }
  }

  window.createMenubar = createMenubar
})()
