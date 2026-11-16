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
  // options: { collapsed: 접어 둔 단계 번호 배열(처음 상태), onCollapseChange(배열) }
  function createProblemList(container, onSelect, statusOf, options) {
    let selectedId = null
    const opts = options || {}
    const collapsed = new Set((opts.collapsed || []).map(String))
    let lastRender = null

    // forceOpen: 검색·필터 중에는 접힌 단계도 펼쳐서 결과가 숨지 않게 한다.
    function render(levels, emptyMessage, forceOpen) {
      lastRender = { levels, emptyMessage, forceOpen }
      container.replaceChildren()
      if (levels.length === 0) {
        container.appendChild(el('p', 'list-empty', emptyMessage || '맞는 문제가 없습니다.'))
        return
      }
      for (const level of levels) {
        const key = String(level.level)
        const isClosed = !forceOpen && collapsed.has(key)
        const group = el('section', 'level-group')
        const title = el('h2', 'level-title')
        const toggle = el('button', 'level-toggle')
        toggle.type = 'button'
        toggle.setAttribute('aria-expanded', isClosed ? 'false' : 'true')
        toggle.appendChild(el('span', 'level-chevron'))
        toggle.appendChild(el('span', 'level-name', `Lv${level.level} ${level.label}`))
        toggle.appendChild(el('span', 'level-count', String(level.problems.length)))
        toggle.addEventListener('click', () => {
          if (forceOpen) return
          if (collapsed.has(key)) collapsed.delete(key)
          else collapsed.add(key)
          if (opts.onCollapseChange) opts.onCollapseChange([...collapsed])
          render(lastRender.levels, lastRender.emptyMessage, lastRender.forceOpen)
        })
        title.appendChild(toggle)
        group.appendChild(title)
        if (isClosed) {
          container.appendChild(group)
          continue
        }
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
      setAllCollapsed(levelNumbers, closed) {
        collapsed.clear()
        if (closed) for (const n of levelNumbers) collapsed.add(String(n))
        if (opts.onCollapseChange) opts.onCollapseChange([...collapsed])
        if (lastRender) render(lastRender.levels, lastRender.emptyMessage, lastRender.forceOpen)
      },
    }
  }

  window.createProblemList = createProblemList
})()
