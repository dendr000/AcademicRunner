// Copyright (c) dendr000. MIT License.
// 화면 전체를 연결한다: 설정과 문제 목록을 읽어 목록·검색·단계 필터·선택 표시를 만든다.
(function () {
  const api = window.runnerApi
  const searchInput = document.getElementById('search-input')
  const levelFilter = document.getElementById('level-filter')
  const workspace = document.getElementById('workspace')
  const statusRoot = document.getElementById('status-root')
  const layout = document.querySelector('.layout')
  const LAST_PROBLEM_KEY = 'academicrunner.lastProblem'
  const SIDEBAR_KEY = 'academicrunner.sidebarCollapsed'

  function readSaved(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function writeSaved(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // 저장소를 못 쓰면 이번 실행에서만 유지한다.
    }
  }

  let scan = null

  // 실행 패널은 편집기 아래에 붙는다. 편집기가 "저장 상태가 괜찮은지"와 "무슨 파일이 열렸는지"를 알려 준다.
  let editorPane = null
  const runPanel = window.createRunPanel(api, {
    prepareRun: () => editorPane.prepareRun(),
    currentFile: () => editorPane.currentFile(),
  })
  const editorSettings = window.editorSettingsLib.createEditorSettings(window.localStorage)
  editorPane = window.createEditorPane(workspace, api, {
    settings: editorSettings,
    footer: runPanel.element,
    onCheck: () => submitFlow.open(),
    onOpened: (problem) => runPanel.onOpened(problem),
    onSaved: (problem) => updateProgressOf(problem.id),
  })
  let openedId = null // 지금 편집기에 열려 있는 문제
  const submitFlow = window.createSubmitFlow(api, { editorPane, runPanel })

  // 문제를 연다. 저장하지 못한 변경 때문에 사용자가 이동을 취소하면 목록 선택을 원래대로 돌린다.
  async function showWorkspace(problem, level) {
    workspace.classList.add('has-editor')
    const moved = await editorPane.open(problem, level)
    if (moved) {
      openedId = problem.id
      writeSaved(LAST_PROBLEM_KEY, problem.id)
    } else {
      list.select(openedId)
      refreshList()
    }
  }

  // 진행 현황: 파일이 시작 코드에서 바뀌었는지(main 이 계산)와 통과 기록(이 화면 저장소)으로 상태를 정한다.
  const statusFilter = document.getElementById('status-filter')
  const progressSummary = document.getElementById('progress-summary')
  const progress = window.progressLib.createProgress(window.localStorage)
  let progressMap = {}
  const statusOf = (problem) => progress.statusOf(problem.id, progressMap[problem.id])
  const list = window.createProblemList(document.getElementById('problem-list'), showWorkspace, statusOf)

  async function loadProgress() {
    try {
      progressMap = (await api.getProgressAll()) || {}
    } catch {
      progressMap = {}
    }
  }

  async function updateProgressOf(problemId) {
    try {
      const info = await api.getProgressOne(problemId)
      if (info) progressMap[problemId] = info
      else delete progressMap[problemId]
    } catch {
      return
    }
    refreshList()
  }

  // 시험 케이스를 전부 통과했으면 그때의 코드를 통과로 기록한다.
  api.onRunEvent((event) => {
    const r = event && event.type === 'done' ? event.result : null
    if (!r || r.phase !== 'cases' || !r.ok || r.stopped || !(r.total > 0) || !r.codeHash || !event.problemId) return
    if (progress.markPassed(event.problemId, event.fileName, r.codeHash)) updateProgressOf(event.problemId)
  })

  // 지금 화면에 보이는(검색·단계 필터를 거친) 단계 목록
  function visibleLevels() {
    if (!scan || !scan.ok) return []
    const matches = window.progressLib.matcherFor(statusFilter.value, statusOf, (p) => progress.passedToday(p.id, progressMap[p.id]))
    return window.problemFilter.filterLevels(scan.levels, searchInput.value, levelFilter.value, matches)
  }

  function refreshList() {
    if (!scan || !scan.ok) return // 스캔 실패 상태에서는 목록을 그리지 않는다
    list.render(visibleLevels(), '맞는 문제가 없습니다.')
    const c = window.progressLib.countStatuses(scan.levels, statusOf)
    progressSummary.textContent = `통과 ${c.passed} / 작성 중 ${c.working} / 전체 ${c.total}`
  }

  // 목록에서 고른 것처럼 문제를 연다(단축키·마지막 문제 복원용).
  async function openProblem(entry) {
    if (!entry) return
    list.select(entry.problem.id)
    refreshList()
    const row = document.querySelector('.problem-row.selected')
    if (row) row.scrollIntoView({ block: 'nearest' })
    await showWorkspace(entry.problem, entry.level)
  }

  function setSidebarCollapsed(collapsed) {
    layout.classList.toggle('sidebar-collapsed', collapsed)
    document.getElementById('sidebar-button').setAttribute('aria-pressed', collapsed ? 'true' : 'false')
    writeSaved(SIDEBAR_KEY, collapsed ? '1' : '0')
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
    await loadProgress()
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
    // 마지막에 연 문제가 아직 있으면 다시 연다.
    await openProblem(window.problemNav.findById(scan.levels, readSaved(LAST_PROBLEM_KEY)))
  }

  searchInput.addEventListener('input', refreshList)
  // 검색칸에서 Enter 를 누르면 맨 위 문제를 연다(Ctrl+P 빠른 이동).
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const first = window.problemNav.flatten(visibleLevels())[0]
      if (first) openProblem(first)
    }
  })
  setSidebarCollapsed(readSaved(SIDEBAR_KEY) === '1')
  document.getElementById('sidebar-button').addEventListener('click', () => {
    setSidebarCollapsed(!layout.classList.contains('sidebar-collapsed'))
  })
  // 동작 등록: 단축키와 메뉴바가 같은 동작을 부른다(어떤 키에 묶을지는 keymap.js).
  const keymapDialog = window.createKeymapDialog()
  const aboutDialog = window.createAboutDialog(api)
  const editorSettingsDialog = window.createEditorSettingsDialog(editorSettings, api)
  window.appActions.registerActions({
    chooseRoot: () => document.getElementById('root-button').click(),
    save: () => editorPane.flush(),
    submitCheck: () => submitFlow.open(),
    copyAll: () => editorPane.copyAll(),
    restore: () => editorPane.restore(),
    quit: () => window.close(), // 닫기 전에 저장하는 기존 흐름(onBeforeClose)을 그대로 탄다
    toggleSidebar: () => setSidebarCollapsed(!layout.classList.contains('sidebar-collapsed')),
    toggleTheme: () => document.getElementById('theme-button').click(),
    fontBigger: () => editorPane.changeFontSize(1),
    fontSmaller: () => editorPane.changeFontSize(-1),
    fontReset: () => editorPane.changeFontSize(0),
    quickJump() {
      setSidebarCollapsed(false)
      searchInput.focus()
      searchInput.select()
    },
    prevProblem: () => openProblem(window.problemNav.neighbor(visibleLevels(), openedId, -1)),
    nextProblem: () => openProblem(window.problemNav.neighbor(visibleLevels(), openedId, 1)),
    openKeymap: () => keymapDialog.open(),
    openEditorSettings: () => editorSettingsDialog.open(),
    about: () => aboutDialog.open(),
    undo: () => editorPane.trigger('undo'),
    redo: () => editorPane.trigger('redo'),
    find: () => editorPane.trigger('actions.find'),
    replace: () => editorPane.trigger('editor.action.startFindReplace'),
    commentLine: () => editorPane.trigger('editor.action.commentLine'),
  })
  window.installShortcuts()
  window.createMenubar(document.body)
  const sidebarButton = document.getElementById('sidebar-button')
  const refreshSidebarTitle = () => {
    const chord = window.keymap.get('toggleSidebar')
    sidebarButton.title = chord ? '문제 목록 접기·펴기 (' + window.keymapLib.displayChord(chord) + ')' : '문제 목록 접기·펴기'
  }
  window.keymap.onChange(refreshSidebarTitle)
  refreshSidebarTitle()
  api.getToolInfo().then((t) => {
    const clean = (v) => (v ? String(v).replace(/^(javac|java|python|node)\s+/i, '') : '없음')
    document.getElementById('status-tools').textContent = `Java ${clean(t.java)}  Python ${clean(t.python)}  Node ${clean(t.node)}`
  })
  levelFilter.addEventListener('change', refreshList)
  statusFilter.addEventListener('change', refreshList)
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
