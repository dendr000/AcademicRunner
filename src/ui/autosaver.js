// Copyright (c) dendr000. MIT License.
// 자동 저장 조율기. 입력이 멈추고 delay 밀리초가 지나면 save 를 한 번 부른다.
// 저장 중에 또 고치면 끝난 뒤 한 번 더 저장한다. 시계는 바깥에서 받아 Node 시험에서도 쓴다.
(function (root) {
  // options: { save: async () => void, delay: 800, setTimer, clearTimer, onState(state) }
  // state: 'clean' | 'dirty' | 'saving' | 'error'
  function createAutosaver(options) {
    const delay = options.delay === undefined ? 800 : options.delay
    const setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms))
    const clearTimer = options.clearTimer || ((id) => clearTimeout(id))
    let timer = null
    let saving = false
    let again = false
    let state = 'clean'

    function setState(next) {
      state = next
      if (options.onState) options.onState(next)
    }

    async function run() {
      timer = null
      if (saving) {
        again = true
        return
      }
      saving = true
      setState('saving')
      let ok = true
      try {
        ok = (await options.save()) !== false
      } catch {
        ok = false
      }
      saving = false
      if (!ok) {
        again = false
        setState('error')
        return
      }
      if (again || timer !== null) {
        again = false
        if (timer === null) await run()
        else setState('dirty')
        return
      }
      setState('clean')
    }

    return {
      // 내용이 바뀌었음을 알린다.
      changed() {
        if (timer !== null) clearTimer(timer)
        timer = setTimer(run, delay)
        if (!saving) setState('dirty')
        else again = true
      },
      // 기다리지 않고 지금 저장한다(Ctrl+S, 문제 이동 직전).
      async flush() {
        if (timer !== null) {
          clearTimer(timer)
          timer = null
        }
        if (state === 'dirty' || state === 'error' || again) await run()
      },
      // 대기 중인 저장을 취소하고 깨끗한 상태로 둔다(파일을 새로 불러왔을 때).
      reset() {
        if (timer !== null) clearTimer(timer)
        timer = null
        again = false
        setState('clean')
      },
      get state() {
        return state
      },
    }
  }

  const api = { createAutosaver }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.autosaver = api
})(typeof window !== 'undefined' ? window : globalThis)
