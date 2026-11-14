// Copyright (c) dendr000. MIT License.
// 테마: 'system'(기본, 시스템 설정을 따름) -> 'light' -> 'dark' 순서로 바꾼다. 고른 값은 저장한다.
(function () {
  const STORAGE_KEY = 'academicrunner.theme'
  const ORDER = ['system', 'light', 'dark']
  const ICON_CLASS = { system: 'icon-monitor', light: 'icon-sun', dark: 'icon-moon' }
  const LABEL = { system: '시스템 설정 따름', light: '라이트', dark: '다크' }

  function readSaved() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return ORDER.includes(value) ? value : 'system'
    } catch {
      return 'system'
    }
  }

  function save(mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // 저장소를 못 쓰면 이번 실행에서만 유지한다.
    }
  }

  function resolve(mode) {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
  }

  function apply(mode) {
    document.documentElement.setAttribute('data-theme', resolve(mode))
    const icon = document.getElementById('theme-icon')
    const button = document.getElementById('theme-button')
    if (icon) icon.className = 'icon ' + ICON_CLASS[mode]
    if (button) button.title = '테마: ' + LABEL[mode] + ' (누르면 바뀜)'
  }

  let mode = readSaved()
  apply(mode)

  // 시스템 설정을 따르는 중이면 Windows 의 라이트/다크 변경도 바로 반영한다.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode === 'system') apply(mode)
  })

  document.getElementById('theme-button').addEventListener('click', () => {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
    save(mode)
    apply(mode)
  })
})()
