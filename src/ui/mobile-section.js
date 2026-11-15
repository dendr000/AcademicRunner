// Copyright (c) dendr000. MIT License.
// 환경 설정 창의 "폰 접속" 부분: 켜고 끄기, 접속 주소, 토큰 새로 만들기. 글자는 textContent 로만 넣는다.
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createMobileSection(api) {
    const root = el('div', 'mobile-section')
    root.appendChild(el('h3', 'mobile-title', '폰 접속 (같은 와이파이, 읽기 전용)'))

    const check = el('input', 'settings-check')
    check.type = 'checkbox'
    const toggle = el('label', 'settings-row')
    toggle.append(el('span', 'about-key', '폰에서 접속 허용'), check)

    const info = el('div', 'mobile-info')
    const message = el('p', 'dialog-sub mobile-msg')
    root.append(toggle, info, message)

    function addressRow(url) {
      const row = el('div', 'mobile-url')
      const input = el('input', 'settings-input mobile-url-input')
      input.type = 'text'
      input.readOnly = true
      input.value = url
      const copy = el('button', 'text-button', '복사')
      copy.type = 'button'
      copy.addEventListener('click', async () => {
        const r = await api.copyText(url)
        copy.textContent = r && r.ok ? '복사됨' : '실패'
        setTimeout(() => (copy.textContent = '복사'), 1200)
      })
      row.append(input, copy)
      return row
    }

    function render(s) {
      check.checked = s.enabled
      info.replaceChildren()
      message.textContent = ''
      if (s.error) {
        message.textContent = s.error
        message.dataset.kind = 'fail'
        return
      }
      message.removeAttribute('data-kind')
      if (!s.enabled) {
        message.textContent = '꺼져 있습니다. 켜면 같은 와이파이의 폰 브라우저에서 문제와 코드를 볼 수 있습니다.'
        return
      }
      if (s.urls.length === 0) {
        message.textContent = '서버는 켜졌지만 접속할 수 있는 와이파이 주소를 찾지 못했습니다.'
        return
      }
      info.appendChild(el('p', 'dialog-sub', '폰 브라우저에 아래 주소를 열면 됩니다 (주소 끝의 토큰은 비밀번호이니 남에게 보여 주지 마세요).'))
      for (const url of s.urls) info.appendChild(addressRow(url))
      const renew = el('button', 'text-button', '토큰 새로 만들기')
      renew.type = 'button'
      renew.addEventListener('click', async () => render(await api.regenerateMobileToken()))
      info.appendChild(renew)
      message.textContent = 'PC 앱이 켜져 있는 동안만 접속할 수 있습니다. 집 밖에서는 Tailscale 같은 개인 VPN 을 쓰세요(공유기 포트 개방은 권하지 않습니다).'
    }

    check.addEventListener('change', async () => {
      check.disabled = true
      render(await api.setMobileEnabled(check.checked))
      check.disabled = false
    })
    api.getMobileStatus().then(render)
    return { element: root }
  }

  window.createMobileSection = createMobileSection
})()
