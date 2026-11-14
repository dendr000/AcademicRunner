// Copyright (c) dendr000. MIT License.
// 화면 전체를 연결한다: 설정과 문제 목록을 읽어 목록·검색·단계 필터·선택 표시를 만든다.
(function () {
  const api = window.runnerApi
  const searchInput = document.getElementById('search-input')
  const levelFilter = document.getElementById('level-filter')
  const workspace = document.getElementById('workspace')
  const statusRoot = document.getElementById('status-root')

  let scan = null

  const editorPane = window.createEditorPane(workspace, api)
  let openedId = null // 지금 편집기에 열려 있는 문제

  // 문제를 연다. 저장하지 못한 변경 때문에 사용자가 이동을 취소하면 목록 선택을 원래대로 돌린다.
  async function showWorkspace(problem, level) {
    workspace.classList.add('has-editor')
    const moved = await editorPane.open(problem, level)
    if (moved) {
      openedId = problem.id
    } else {
      list.select(openedId)
      refreshList()
    }
  }

  const list = window.createProblemList(document.getElementById('problem-list'), showWorkspace)

  function refreshList() {
    if (!scan || !scan.ok) return // 스캔 실패 상태에서는 목록을 그리지 않는다
    const filtered = window.problemFilter.filterLevels(scan.levels, searchInput.value, levelFilter.value)
    list.render(filtered, '맞는 문제가 없습니다.')
  }

  function fillLevelFilter() {
    levelFilter.replaceChildren()
    const all = document.createElement('option')
    all.value = 'all'
    all.textContent = '전체 단계'
    levelFilter.appendChild(all)
    for (const level of scan.levels) {
      const option = document.createElement('option')
      option.value = String(level.level)
      option.textContent = `Lv${level.level} ${level.label}`
      levelFilter.appendChild(option)
    }
  }

  function showScanError(result) {
    document.getElementById('problem-list').replaceChildren()
    const message = result.error === 'ROOT_NOT_DIRECTORY'
      ? '선택한 경로가 폴더가 아닙니다.'
      : '문제 풀이 폴더를 찾을 수 없습니다. 오른쪽 위 "폴더 선택"으로 지정하세요.'
    const p = document.createElement('p')
    p.className = 'list-empty'
    p.textContent = message
    document.getElementById('problem-list').appendChild(p)
  }

  function showPlaceholder() {
    workspace.classList.remove('has-editor')
    openedId = null
    workspace.replaceChildren()
    const title = document.createElement('p')
    title.className = 'empty-title'
    title.textContent = '과제 풀이를 열어 실행하는 앱'
    const sub = document.createElement('p')
    sub.className = 'empty-sub'
    sub.textContent = '왼쪽에서 문제를 고르세요.'
    workspace.append(title, sub)
  }

  async function load() {
    const settings = await api.getSettings()
    statusRoot.textContent = '문제 폴더: ' + settings.root
    scan = await api.scanProblems()
    // 폴더가 바뀌었을 수 있으므로 이전 선택은 버린다.
    list.select(null)
    showPlaceholder()
    if (!scan.ok) {
      showScanError(scan)
      return
    }
    fillLevelFilter()
    refreshList()
    statusRoot.textContent = `문제 폴더: ${settings.root}  (${scan.problemCount}문제)`
  }

  searchInput.addEventListener('input', refreshList)
  levelFilter.addEventListener('change', refreshList)
  document.getElementById('root-button').addEventListener('click', async () => {
    await editorPane.flush() // 폴더가 바뀌기 전에 편집 중인 내용을 원래 폴더에 저장해 둔다.
    const result = await api.chooseRoot()
    if (result.changed) {
      editorPane.discard()
      await load()
    }
  })

  api.onBeforeClose(async () => {
    try {
      await editorPane.flush()
    } finally {
      api.closeReady()
    }
  })

  api.getAppInfo().then((info) => {
    document.getElementById('app-version').textContent = info.name + ' v' + info.version
  })
  load()
})()
