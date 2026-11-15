// Copyright (c) dendr000. MIT License.
// 폰 브라우저용 화면: 문제 목록, 풀이 코드 보기, 전체 복사. 글자는 textContent 로만 넣는다. 서버에는 읽기만 요청한다.
(function () {
  const KEY = 'academicrunner.mobileToken'
  const $ = (id) => document.getElementById(id)
  let token = ''
  let data = null

  function load(key) {
    try {
      return window.localStorage.getItem(key) || ''
    } catch {
      return ''
    }
  }
  function save(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // 저장소를 못 쓰면 이번 방문에서만 유지한다.
    }
  }

  function show(name) {
    for (const id of ['login', 'list', 'code']) $(id).hidden = id !== name
    $('back').hidden = name !== 'code'
    if (name !== 'code') $('title').textContent = 'AcademicRunner'
  }

  function status(text, isError) {
    $('status').textContent = text || ''
    $('status').className = 'msg' + (isError ? ' err' : '')
  }

  async function get(path) {
    const res = await fetch(path, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
    if (res.status === 401) throw new Error('BAD_TOKEN')
    if (res.status === 429) throw new Error('TOO_MANY')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json()
  }

  function needLogin(message) {
    show('login')
    $('login-msg').textContent = message || ''
    $('login-msg').className = 'msg' + (message ? ' err' : '')
    $('token').focus()
  }

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, '')
  }

  function renderList() {
    const q = normalize($('search').value)
    const box = $('groups')
    box.replaceChildren()
    for (const level of data.levels) {
      const items = level.problems.filter((p) => q === '' || normalize(p.title).includes(q) || String(p.number).padStart(2, '0').includes(q))
      if (items.length === 0) continue
      const h = document.createElement('h2')
      h.className = 'level'
      h.textContent = 'Lv' + level.level + ' ' + level.label
      box.appendChild(h)
      for (const p of items) {
        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'row'
        const dot = document.createElement('span')
        dot.className = 'dot' + (data.edited[p.id] ? ' on' : '')
        dot.setAttribute('aria-label', data.edited[p.id] ? '작성함' : '안 품')
        const num = document.createElement('span')
        num.className = 'num'
        num.textContent = String(p.number).padStart(2, '0')
        const name = document.createElement('span')
        name.className = 'name'
        name.textContent = p.title
        row.append(dot, num, name)
        row.addEventListener('click', () => openProblem(p))
        box.appendChild(row)
      }
    }
    if (!box.firstChild) status('맞는 문제가 없습니다.')
    else status('')
  }

  async function openFile(problem, file, tabButton) {
    for (const b of $('tabs').children) b.setAttribute('aria-pressed', String(b === tabButton))
    $('copy-msg').textContent = ''
    $('source').value = '불러오는 중...'
    try {
      const r = await get('/api/file?problemId=' + encodeURIComponent(problem.id) + '&fileName=' + encodeURIComponent(file.name))
      $('source').value = r.ok ? r.content : '불러오지 못했습니다 (' + r.error + ')'
    } catch (e) {
      $('source').value = ''
      handleError(e)
    }
  }

  function openProblem(problem) {
    show('code')
    $('title').textContent = String(problem.number).padStart(2, '0') + '. ' + problem.title
    const tabs = $('tabs')
    tabs.replaceChildren()
    let first = null
    for (const f of problem.files) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = f.name
      b.addEventListener('click', () => openFile(problem, f, b))
      tabs.appendChild(b)
      if (!first) first = { f, b }
    }
    if (first) openFile(problem, first.f, first.b)
    else $('source').value = '풀이 파일이 없습니다.'
  }

  // http 주소에서는 navigator.clipboard 를 쓸 수 없어서, 글자를 선택한 뒤 복사 명령을 쓴다.
  function copyAll() {
    const area = $('source')
    area.focus()
    area.select()
    area.setSelectionRange(0, area.value.length)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    $('copy-msg').textContent = ok ? '복사했습니다' : '복사하지 못했습니다. 글자를 길게 눌러 직접 복사하세요.'
  }

  function handleError(e) {
    if (e && e.message === 'BAD_TOKEN') {
      token = ''
      save(KEY, '')
      needLogin('토큰이 맞지 않습니다.')
    } else if (e && e.message === 'TOO_MANY') {
      status('시도가 너무 많습니다. 잠시 뒤에 다시 하세요.', true)
    } else {
      status('PC 앱에 연결하지 못했습니다. 같은 와이파이인지, PC 앱의 폰 접속이 켜져 있는지 확인하세요.', true)
    }
  }

  async function start() {
    try {
      data = await get('/api/problems')
    } catch (e) {
      handleError(e)
      return
    }
    if (!data.ok) {
      show('list')
      $('groups').replaceChildren()
      status('문제 목록을 읽지 못했습니다 (' + data.error + ')', true)
      return
    }
    show('list')
    renderList()
  }

  $('login-go').addEventListener('click', () => {
    token = $('token').value.trim()
    if (token === '') return
    save(KEY, token)
    $('token').value = ''
    start()
  })
  $('search').addEventListener('input', () => data && renderList())
  $('back').addEventListener('click', () => {
    show('list')
    renderList()
  })
  $('copy').addEventListener('click', copyAll)

  // 주소 뒤 #t=토큰 으로 들어오면 저장하고 주소창에서 지운다(# 뒤는 서버로 보내지 않는다).
  const m = /(?:^#|&)t=([A-Za-z0-9_-]+)/.exec(window.location.hash)
  if (m) {
    token = m[1]
    save(KEY, token)
    window.history.replaceState(null, '', window.location.pathname)
  } else {
    token = load(KEY)
  }
  if (token) start()
  else needLogin('')
})()
