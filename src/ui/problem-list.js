// Copyright (c) dendr000. MIT License.
// 왼쪽 문제 목록을 그린다. 글자는 textContent 로만 넣는다(문제 이름에 특수문자가 있어도 안전).
(function () {
  const KIND_LABEL = { io: '입출력', function: '함수', unknown: '-' }
  const LANGUAGE_LABEL = { java: 'Java', python: 'Python', javascript: 'JS', c: 'C', cpp: 'C++', sql: 'SQL' }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createProblemList(container, onSelect) {
    let selectedId = null

    function render(levels, emptyMessage) {
      container.replaceChildren()
      if (levels.length === 0) {
        container.appendChild(el('p', 'list-empty', emptyMessage || '맞는 문제가 없습니다.'))
        return
      }
      for (const level of levels) {
        const group = el('section', 'level-group')
        group.appendChild(el('h2', 'level-title', `Lv${level.level} ${level.label}`))
        for (const problem of level.problems) {
          const row = el('button', 'problem-row')
          row.type = 'button'
          row.dataset.id = problem.id
          if (problem.id === selectedId) row.classList.add('selected')
          row.appendChild(el('span', 'problem-number', String(problem.number).padStart(2, '0')))
          row.appendChild(el('span', 'problem-title', problem.title))
          row.appendChild(el('span', 'chip chip-kind', KIND_LABEL[problem.kind] || '-'))
          const langs = [...new Set(problem.files.map((f) => f.language))]
          for (const lang of langs) row.appendChild(el('span', 'chip chip-lang', LANGUAGE_LABEL[lang] || lang))
          row.addEventListener('click', () => {
            selectedId = problem.id
            for (const r of container.querySelectorAll('.problem-row.selected')) r.classList.remove('selected')
            row.classList.add('selected')
            onSelect(problem, level)
          })
          group.appendChild(row)
        }
        container.appendChild(group)
      }
    }

    return {
      render,
      select(id) { selectedId = id },
    }
  }

  window.createProblemList = createProblemList
})()
