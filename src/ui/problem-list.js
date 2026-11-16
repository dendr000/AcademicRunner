// Copyright (c) dendr000. MIT License.
// 왼쪽 문제 목록을 그린다. 글자는 textContent 로만 넣는다(문제 이름에 특수문자가 있어도 안전).
(function () {
  const KIND_LABEL = { io: '입출력', function: '함수', unknown: '-' }
  const STATUS_LABEL = { untouched: '안 품', working: '작성 중', passed: '통과' }
  const LANGUAGE_LABEL = { java: 'Java', python: 'Python', javascript: 'JS', c: 'C', cpp: 'C++', sql: 'SQL' }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // statusOf(problem): 'untouched' | 'working' | 'passed' (없으면 상태 표시 없음)
  function createProblemList(container, onSelect, statusOf) {
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
          if (statusOf) {
            const status = statusOf(problem)
            const dot = el('span', 'status-dot')
            dot.dataset.status = status
            dot.title = STATUS_LABEL[status] || ''
            dot.setAttribute('aria-label', STATUS_LABEL[status] || '')
            row.insertBefore(dot, row.firstChild)
          }
          // 태그는 제목 아래 줄에 따로 둔다(좁은 목록에서 제목이 가려지지 않게, 넘치면 태그가 다음 줄로 접힘).
          const tags = el('span', 'problem-tags')
          tags.appendChild(el('span', 'chip chip-kind', KIND_LABEL[problem.kind] || '-'))
          const langs = [...new Set(problem.files.map((f) => f.language))]
          for (const lang of langs) tags.appendChild(el('span', 'chip chip-lang', LANGUAGE_LABEL[lang] || lang))
          row.appendChild(tags)
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
