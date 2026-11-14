// Copyright (c) dendr000. MIT License.
// 같이 들고 있는 Monaco(VS Code 의 편집기 부품)를 처음 필요할 때 한 번만 불러온다.
// 인터넷에서 받지 않는다: src/vendor/monaco/vs (npm run vendor 로 복사된 것)만 쓴다.
(function () {
  const BASE = new URL('vendor/monaco/', document.baseURI).href // 끝이 / 인 폴더 주소
  let loading = null

  function injectLoaderScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = BASE + 'vs/loader.js'
      script.onload = resolve
      script.onerror = () => reject(new Error('편집기 부품(src/vendor/monaco)을 찾을 수 없습니다. npm run vendor 를 실행하세요.'))
      document.head.appendChild(script)
    })
  }

  function load() {
    if (loading) return loading
    loading = injectLoaderScript().then(
      () =>
        new Promise((resolve, reject) => {
          // 편집기 계산용 작업자(worker)는 blob 주소로 띄운다(CSP 가 blob: 만 허용).
          window.MonacoEnvironment = {
            getWorkerUrl() {
              const code = `self.MonacoEnvironment={baseUrl:'${BASE}'};importScripts('${BASE}vs/base/worker/workerMain.js');`
              return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
            },
          }
          window.require.config({ paths: { vs: BASE + 'vs' } })
          window.require(['vs/editor/editor.main'], () => resolve(window.monaco), reject)
        }),
    )
    loading.catch(() => {
      loading = null // 실패하면 다음에 다시 시도할 수 있게 한다.
    })
    return loading
  }

  // 편집기 내부에서 하던 일이 정리 과정에서 취소되면(Canceled) 오류처럼 보이지만 정상 동작이다. 콘솔 오류로 남기지 않는다.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (reason && (reason.name === 'Canceled' || reason.message === 'Canceled')) event.preventDefault()
  })

  window.loadMonaco = load
})()
