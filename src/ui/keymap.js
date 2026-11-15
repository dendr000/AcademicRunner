// Copyright (c) dendr000. MIT License.
// 단축키 표: 동작 목록, 기본 키, 사용자가 바꾼 키(덮어쓰기), 키 이벤트 -> 글자 변환, 충돌 검사.
// 화면 코드 없이 순수 함수만 둔다(시험 가능). 저장은 localStorage 에 "바꾼 것만" 둔다.
(function (root) {
  // key: 기본 키. 빈 글자는 "지정 안 됨".
  const ACTIONS = [
    { id: 'chooseRoot', label: '문제 폴더 선택', group: '파일', key: '' },
    { id: 'save', label: '지금 저장', group: '파일', key: 'Ctrl+S' },
    { id: 'submitCheck', label: '제출 전 점검', group: '파일', key: 'Ctrl+Shift+Enter' },
    { id: 'copyAll', label: '코드 전체 복사', group: '파일', key: 'Ctrl+Shift+C' },
    { id: 'restore', label: '시작 코드로 되돌리기', group: '파일', key: 'Ctrl+Shift+R' },
    { id: 'quit', label: '종료', group: '파일', key: '' },
    // fixed: 편집기(Monaco)가 정한 키를 메뉴에 보여 주기만 한다(바꿀 수 없고 단축키 설정 목록에도 없다).
    { id: 'undo', label: '실행 취소', group: '편집', key: '', fixed: 'Ctrl+Z' },
    { id: 'redo', label: '다시 실행', group: '편집', key: '', fixed: 'Ctrl+Y' },
    { id: 'find', label: '찾기', group: '편집', key: '', fixed: 'Ctrl+F' },
    { id: 'replace', label: '바꾸기', group: '편집', key: '', fixed: 'Ctrl+H' },
    { id: 'commentLine', label: '줄 주석 토글', group: '편집', key: '', fixed: 'Ctrl+/' },
    { id: 'about', label: '정보', group: '도움말', key: '' },
    { id: 'toggleSidebar', label: '문제 목록 접기/펴기', group: '보기', key: 'Ctrl+B' },
    { id: 'toggleTheme', label: '테마 전환 (시스템/라이트/다크)', group: '보기', key: '' },
    { id: 'fontBigger', label: '편집기 글자 크게', group: '보기', key: 'Ctrl+=' },
    { id: 'fontSmaller', label: '편집기 글자 작게', group: '보기', key: 'Ctrl+-' },
    { id: 'fontReset', label: '편집기 글자 크기 기본', group: '보기', key: 'Ctrl+0' },
    { id: 'quickJump', label: '빠른 이동 (문제 검색)', group: '이동', key: 'Ctrl+P' },
    { id: 'prevProblem', label: '이전 문제', group: '이동', key: 'Ctrl+Shift+Up' },
    { id: 'nextProblem', label: '다음 문제', group: '이동', key: 'Ctrl+Shift+Down' },
    { id: 'run', label: '실행', group: '실행', key: 'F5' },
    { id: 'runAlt', label: '실행 (보조 키)', group: '실행', key: 'Ctrl+Enter' },
    { id: 'stop', label: '실행 중지', group: '실행', key: 'Shift+F5' },
    { id: 'compile', label: '컴파일(문법) 확인', group: '실행', key: 'F6' },
    { id: 'runCases', label: '케이스 전부 실행', group: '실행', key: 'F7' },
    { id: 'tabInput', label: '하단 입력 탭', group: '실행', key: 'Ctrl+1' },
    { id: 'tabOutput', label: '하단 출력 탭', group: '실행', key: 'Ctrl+2' },
    { id: 'tabCases', label: '하단 케이스 탭', group: '실행', key: 'Ctrl+3' },
    { id: 'openKeymap', label: '단축키 설정 열기', group: '설정', key: 'Ctrl+,' },
  ]
  const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]))
  const STORAGE_KEY = 'academicrunner.keymap'

  const CODE_NAMES = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Enter', Space: 'Space', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Escape: 'Esc',
    Equal: '=', Minus: '-', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  }
  const MODIFIER_CODES = /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/
  // 편집 기본 키(복사 등)나 OS 가 쓰는 키는 덮어쓰지 못하게 한다.
  const RESERVED = new Set(['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+A', 'Ctrl+F', 'Ctrl+H', 'Ctrl+D', 'Alt+F4', 'Ctrl+Shift+Z'])

  // e: { code, key, ctrlKey, altKey, shiftKey }. 글자 키만 누르는 중(Ctrl 만 등)이면 null.
  function chordFromEvent(e) {
    const code = e.code || ''
    if (!code || MODIFIER_CODES.test(code)) return null
    let name = null
    if (/^Key[A-Z]$/.test(code)) name = code.slice(3)
    else if (/^Digit[0-9]$/.test(code)) name = code.slice(5)
    else if (/^Numpad[0-9]$/.test(code)) name = code.slice(6)
    else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) name = code
    else if (CODE_NAMES[code]) name = CODE_NAMES[code]
    if (!name) return null
    const parts = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    parts.push(name)
    return parts.join('+')
  }

  // 지정해도 되는 키인가: 글자만 누르는 키는 입력과 겹치므로 Ctrl/Alt 가 있거나 F1~F24 여야 한다.
  function checkAllowed(chord) {
    if (typeof chord !== 'string' || chord === '') return { ok: false, reason: '키가 비어 있습니다' }
    const parts = chord.split('+')
    const key = parts[parts.length - 1]
    const mods = parts.slice(0, -1)
    if (key === 'Esc') return { ok: false, reason: 'Esc 는 쓸 수 없습니다' }
    const isFunctionKey = /^F([1-9]|1[0-9]|2[0-4])$/.test(key)
    if (!isFunctionKey && !mods.includes('Ctrl') && !mods.includes('Alt')) return { ok: false, reason: 'Ctrl 또는 Alt 와 함께 누르거나 F1~F12 를 쓰세요' }
    if (RESERVED.has(chord)) return { ok: false, reason: chord + ' 는 편집 기본 키라 쓸 수 없습니다' }
    return { ok: true }
  }

  function displayChord(chord) {
    if (!chord) return '없음'
    return chord.replace(/\bUp$/, '↑').replace(/\bDown$/, '↓').replace(/\bLeft$/, '←').replace(/\bRight$/, '→')
  }

  // 덮어쓰기 값을 검사해 알 수 없는 동작·잘못된 키는 버린다(저장소가 손상돼도 앱은 기본 키로 동작).
  function sanitizeOverrides(raw) {
    const clean = {}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean
    for (const [id, chord] of Object.entries(raw)) {
      if (!BY_ID.has(id) || typeof chord !== 'string') continue
      if (chord === '' || checkAllowed(chord).ok) clean[id] = chord
    }
    // 같은 키를 두 동작이 갖게 되면 바꾼 쪽(덮어쓰기)을 버린다.
    for (let guard = 0; guard < ACTIONS.length; guard++) {
      const map = effective(clean)
      const owner = new Map()
      let dropped = false
      for (const a of ACTIONS) {
        const chord = map[a.id]
        if (!chord) continue
        if (owner.has(chord)) {
          const victim = a.id in clean ? a.id : owner.get(chord)
          delete clean[victim]
          dropped = true
          break
        }
        owner.set(chord, a.id)
      }
      if (!dropped) break
    }
    return clean
  }

  // id -> 키(빈 글자는 지정 안 됨)
  function effective(overrides) {
    const map = {}
    for (const a of ACTIONS) map[a.id] = a.id in overrides ? overrides[a.id] : a.key
    return map
  }

  // 같은 키를 이미 쓰는 다른 동작의 id, 없으면 null
  function findConflict(map, id, chord) {
    if (!chord) return null
    for (const [other, c] of Object.entries(map)) if (other !== id && c === chord) return other
    return null
  }

  function actionForChord(map, chord) {
    for (const [id, c] of Object.entries(map)) if (c && c === chord) return id
    return null
  }

  // storage: getItem/setItem 이 있는 저장소(없거나 막혀 있어도 동작).
  function createKeymap(storage) {
    let overrides = {}
    try {
      overrides = sanitizeOverrides(JSON.parse(storage.getItem(STORAGE_KEY)))
    } catch {
      overrides = {}
    }
    const listeners = new Set()
    let map = effective(overrides)

    function commit() {
      map = effective(overrides)
      try {
        if (Object.keys(overrides).length === 0) storage.removeItem(STORAGE_KEY)
        else storage.setItem(STORAGE_KEY, JSON.stringify(overrides))
      } catch {
        // 저장하지 못하면 이번 실행에서만 유지한다.
      }
      for (const fn of listeners) fn()
    }

    return {
      get: (id) => map[id] || '',
      all: () => ({ ...map }),
      isCustom: (id) => id in overrides,
      actionFor: (chord) => actionForChord(map, chord),
      // 결과: { ok: true } 또는 { ok: false, reason, conflict? }
      set(id, chord) {
        if (!BY_ID.has(id)) return { ok: false, reason: '알 수 없는 동작입니다' }
        if (chord !== '') {
          const allowed = checkAllowed(chord)
          if (!allowed.ok) return allowed
          const other = findConflict(map, id, chord)
          if (other) return { ok: false, reason: displayChord(chord) + ' 는 "' + BY_ID.get(other).label + '" 에 이미 쓰입니다', conflict: other }
        }
        if (chord === BY_ID.get(id).key) delete overrides[id]
        else overrides[id] = chord
        commit()
        return { ok: true }
      },
      // 기본 키로 되돌린다. 기본 키를 다른 동작이 쓰고 있으면 되돌리지 못한다.
      reset(id) {
        const def = BY_ID.get(id) && BY_ID.get(id).key
        const other = def ? findConflict(map, id, def) : null
        if (other) return { ok: false, reason: displayChord(def) + ' 는 "' + BY_ID.get(other).label + '" 에 쓰이고 있어 먼저 그 항목을 바꾸세요', conflict: other }
        delete overrides[id]
        commit()
        return { ok: true }
      },
      resetAll() {
        overrides = {}
        commit()
      },
      onChange(fn) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }
  }

  const api = { ACTIONS, STORAGE_KEY, chordFromEvent, checkAllowed, displayChord, sanitizeOverrides, effective, findConflict, actionForChord, createKeymap }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else {
    root.keymapLib = api
    let store
    try {
      store = createKeymap(root.localStorage)
    } catch {
      store = createKeymap({ getItem: () => null, setItem() {}, removeItem() {} })
    }
    root.keymap = store
  }
})(typeof window !== 'undefined' ? window : globalThis)
