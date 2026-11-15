// Copyright (c) dendr000. MIT License.
// 편집기 설정(글자 크기, 탭 칸 수, 줄 바꿈, 미니맵)의 기본값·검사·저장. 화면(DOM)과 Monaco 를 모르는 순수 로직이라 시험할 수 있다.
// 바꾼 값만이 아니라 전체를 저장하되, 읽을 때 항목마다 검사해 이상한 값은 기본값으로 되돌린다.
(function (root) {
  const STORAGE_KEY = 'academicrunner.editor'
  const FONT_MIN = 8
  const FONT_MAX = 40
  const TAB_SIZES = [2, 4, 8]
  const DEFAULTS = { fontSize: 14, tabSize: 4, wordWrap: false, minimap: false }

  // 임의의 값을 받아 유효한 설정 객체를 만든다. 없거나 틀린 항목은 기본값.
  function sanitize(raw) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const font = Number(src.fontSize)
    return {
      fontSize: Number.isInteger(font) && font >= FONT_MIN && font <= FONT_MAX ? font : DEFAULTS.fontSize,
      tabSize: TAB_SIZES.includes(src.tabSize) ? src.tabSize : DEFAULTS.tabSize,
      wordWrap: typeof src.wordWrap === 'boolean' ? src.wordWrap : DEFAULTS.wordWrap,
      minimap: typeof src.minimap === 'boolean' ? src.minimap : DEFAULTS.minimap,
    }
  }

  function clampFont(size) {
    const n = Math.round(Number(size))
    if (!Number.isFinite(n)) return DEFAULTS.fontSize
    return Math.min(FONT_MAX, Math.max(FONT_MIN, n))
  }

  // Monaco 옵션 모양으로 바꾼다.
  function toMonacoOptions(settings) {
    return { fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap ? 'on' : 'off', minimap: { enabled: settings.minimap } }
  }

  // storage: getItem/setItem 이 있는 저장소
  function createEditorSettings(storage) {
    let value = DEFAULTS
    try {
      value = sanitize(JSON.parse(storage.getItem(STORAGE_KEY)))
    } catch {
      value = { ...DEFAULTS }
    }
    const listeners = new Set()

    function save() {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // 저장하지 못하면 이번 실행에서만 유지한다.
      }
    }

    function apply(next) {
      const clean = sanitize({ ...value, ...next, ...(next && 'fontSize' in next ? { fontSize: clampFont(next.fontSize) } : {}) })
      if (JSON.stringify(clean) === JSON.stringify(value)) return false
      value = clean
      save()
      for (const fn of listeners) fn(value)
      return true
    }

    return {
      get: () => ({ ...value }),
      // 일부 항목만 바꾼다. 바뀐 것이 없으면 false.
      set: apply,
      reset: () => apply({ ...DEFAULTS }),
      onChange(fn) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }
  }

  const api = { STORAGE_KEY, FONT_MIN, FONT_MAX, TAB_SIZES, DEFAULTS, sanitize, clampFont, toMonacoOptions, createEditorSettings }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.editorSettingsLib = api
})(typeof window !== 'undefined' ? window : globalThis)
