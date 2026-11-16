// Copyright (c) dendr000. MIT License.
// 실행 패널의 "표" 탭(SQL 문제 전용): 지금 풀이에서 쓸 수 있는 표 이름·열·내용(SELECT * FROM 표 와 같은 결과)을 보여 준다.
// 글자는 textContent 로만 넣는다.
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // hooks: { currentFile(): {problem, file} | null, prepareRun(): Promise<{ok, reason}>, getInput(): string, onStatus(text, kind) }
  function createSqlTablesPanel(api, hooks) {
    const root = el('section', 'tables-panel')
    root.setAttribute('aria-label', '표 보기')

    const head = el('div', 'tables-head')
    const chips = el('div', 'tables-chips')
    const copyButton = el('button', 'text-button', 'SELECT 문 복사')
    copyButton.type = 'button'
    copyButton.title = '고른 표를 조회하는 SELECT * FROM 문을 클립보드에 복사합니다'
    const refreshButton = el('button', 'text-button', '새로 고침')
    refreshButton.type = 'button'
    head.append(chips, el('span', 'spacer'), copyButton, refreshButton)

    const info = el('div', 'tables-info')
    const columnsLine = el('div', 'tables-columns')
    const message = el('div', 'tables-message')
    const wrap = el('div', 'tables-grid-wrap')
    root.append(head, info, columnsLine, wrap, message)

    let data = null
    let selected = null
    let loading = 0

    function currentTable() {
      return data && data.tables.find((t) => t.name === selected)
    }

    function say(text, kind) {
      message.textContent = text || ''
      message.dataset.kind = kind || ''
      message.hidden = !text
    }

    function renderGrid() {
      wrap.replaceChildren()
      columnsLine.replaceChildren()
      const t = currentTable()
      copyButton.disabled = !t
      if (!t) return
      for (const c of t.columns) {
        const chip = el('span', 'tables-col')
        chip.append(el('span', 'tables-col-name', c.name))
        const meta = [c.type, c.pk ? 'PK' : ''].filter(Boolean).join(' ')
        if (meta) chip.append(el('span', 'tables-col-type', meta))
        columnsLine.appendChild(chip)
      }
      const table = el('table', 'tables-grid')
      const thead = el('thead')
      const hr = el('tr')
      for (const c of t.columns) hr.appendChild(el('th', undefined, c.name))
      thead.appendChild(hr)
      const tbody = el('tbody')
      for (const row of t.rows) {
        const tr = el('tr')
        for (const v of row) {
          const td = v === null ? el('td', 'tables-null', 'NULL') : el('td', undefined, v)
          tr.appendChild(td)
        }
        tbody.appendChild(tr)
      }
      table.append(thead, tbody)
      wrap.appendChild(table)
    }

    function renderChips() {
      chips.replaceChildren()
      if (!data) return
      for (const t of data.tables) {
        const b = el('button', 'tables-chip' + (t.name === selected ? ' active' : ''), t.name)
        b.type = 'button'
        b.append(el('span', 'tables-chip-count', String(t.rowCount)))
        b.title = t.name + ' (' + t.rowCount + '줄)'
        b.addEventListener('click', () => {
          selected = t.name
          renderChips()
          renderGrid()
          renderInfo()
        })
        chips.appendChild(b)
      }
    }

    function renderInfo() {
      const t = currentTable()
      const parts = []
      if (data && data.presets.length) parts.push('기본 데이터: ' + data.presets.join(', '))
      if (data && data.guessed) parts.push('풀이에 표 이름을 쓰면 그 표의 기본 데이터가 실행에 들어갑니다')
      if (t && t.truncated) parts.push('앞의 ' + t.rows.length + '줄만 보여 줍니다 (전체 ' + t.rowCount + '줄)')
      info.textContent = parts.join(' · ')
    }

    // 지금 풀이(저장된 파일)와 입력 탭의 준비 SQL 로 표를 다시 조사한다.
    async function refresh() {
      const target = hooks.currentFile()
      if (!target || target.file.language !== 'sql') {
        data = null
        chips.replaceChildren()
        wrap.replaceChildren()
        columnsLine.replaceChildren()
        info.textContent = ''
        copyButton.disabled = true
        say('SQL 문제를 열면 표를 볼 수 있습니다.', '')
        return
      }
      const token = ++loading
      const prep = await hooks.prepareRun()
      if (token !== loading) return
      if (!prep.ok) {
        say(prep.reason, 'error')
        return
      }
      let result
      try {
        result = await api.inspectSqlTables(target.problem.id, target.file.name, hooks.getInput())
      } catch {
        result = { ok: false, error: '표를 조사하지 못했습니다.' }
      }
      if (token !== loading) return
      if (!result || !result.ok) {
        data = null
        chips.replaceChildren()
        wrap.replaceChildren()
        columnsLine.replaceChildren()
        info.textContent = ''
        say((result && result.error) || '표를 조사하지 못했습니다.', 'error')
        return
      }
      data = result
      if (!data.tables.some((t) => t.name === selected)) selected = data.tables[0] ? data.tables[0].name : null
      say(data.tables.length ? '' : '만들어진 표가 없습니다. 풀이나 입력 탭에 CREATE TABLE 을 쓰거나 student 같은 기본 표 이름을 쓰세요.', '')
      renderChips()
      renderInfo()
      renderGrid()
    }

    copyButton.addEventListener('click', async () => {
      const t = currentTable()
      if (!t) return
      const name = /^w+$/.test(t.name) ? t.name : '"' + t.name.replace(/"/g, '""') + '"'
      const r = await api.copyText('SELECT * FROM ' + name + ';')
      hooks.onStatus(r && r.ok === false ? '복사하지 못했습니다' : 'SELECT * FROM ' + name + '; 를 복사했습니다', r && r.ok === false ? 'fail' : 'ok')
    })
    refreshButton.addEventListener('click', refresh)

    return { element: root, refresh }
  }

  window.createSqlTablesPanel = createSqlTablesPanel
})()
