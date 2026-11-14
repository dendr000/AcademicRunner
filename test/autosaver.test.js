// Copyright (c) dendr000. MIT License.
const test = require('node:test')
const assert = require('node:assert')
const { createAutosaver } = require('../src/ui/autosaver')

// 가짜 시계: 시간을 손으로 흘려 보낸다.
function fakeClock() {
  let now = 0
  let nextId = 1
  const timers = new Map()
  return {
    setTimer(fn, ms) {
      const id = nextId++
      timers.set(id, { fn, at: now + ms })
      return id
    },
    clearTimer(id) {
      timers.delete(id)
    },
    async advance(ms) {
      now += ms
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id)
          await t.fn()
        }
      }
    },
    pending: () => timers.size,
  }
}

function setup(saveImpl) {
  const clock = fakeClock()
  const states = []
  const saves = []
  const saver = createAutosaver({
    delay: 800,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onState: (s) => states.push(s),
    save: async () => {
      saves.push(saves.length + 1)
      return saveImpl ? saveImpl(saves.length) : true
    },
  })
  return { clock, states, saves, saver }
}

test('입력이 멈춘 뒤 0.8초가 지나야 한 번 저장한다', async () => {
  const { clock, saves, saver, states } = setup()
  saver.changed()
  await clock.advance(700)
  assert.strictEqual(saves.length, 0)
  await clock.advance(100)
  assert.strictEqual(saves.length, 1)
  assert.deepStrictEqual(states, ['dirty', 'saving', 'clean'])
})

test('계속 입력하면 저장이 미뤄지고 마지막에 한 번만 저장한다', async () => {
  const { clock, saves, saver } = setup()
  saver.changed()
  await clock.advance(500)
  saver.changed()
  await clock.advance(500)
  saver.changed()
  await clock.advance(799)
  assert.strictEqual(saves.length, 0)
  await clock.advance(1)
  assert.strictEqual(saves.length, 1)
})

test('flush 는 기다리지 않고 바로 저장하고 대기 중인 타이머를 없앤다', async () => {
  const { clock, saves, saver } = setup()
  saver.changed()
  await saver.flush()
  assert.strictEqual(saves.length, 1)
  assert.strictEqual(clock.pending(), 0)
  await saver.flush() // 바뀐 게 없으면 저장하지 않는다
  assert.strictEqual(saves.length, 1)
})

test('저장이 실패하면 error 상태가 되고 flush 로 다시 시도한다', async () => {
  const { clock, saves, saver } = setup((n) => n > 1)
  saver.changed()
  await clock.advance(800)
  assert.strictEqual(saver.state, 'error')
  await saver.flush()
  assert.strictEqual(saves.length, 2)
  assert.strictEqual(saver.state, 'clean')
})

test('save 가 예외를 던져도 error 상태가 되고 멈추지 않는다', async () => {
  const { clock, saver } = setup(() => {
    throw new Error('boom')
  })
  saver.changed()
  await clock.advance(800)
  assert.strictEqual(saver.state, 'error')
})

test('저장 중에 또 고치면 끝난 뒤 한 번 더 저장한다', async () => {
  let release
  const clock = fakeClock()
  const saves = []
  const saver = createAutosaver({
    delay: 800,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    save: () => {
      saves.push(1)
      return saves.length === 1 ? new Promise((r) => (release = () => r(true))) : Promise.resolve(true)
    },
  })
  saver.changed()
  const running = clock.advance(800) // 첫 저장이 끝나지 않은 채 대기
  await Promise.resolve()
  saver.changed()
  release()
  await running
  await clock.advance(800)
  assert.strictEqual(saves.length, 2)
  assert.strictEqual(saver.state, 'clean')
})

test('reset 은 대기 중인 저장을 취소한다', async () => {
  const { clock, saves, saver } = setup()
  saver.changed()
  saver.reset()
  await clock.advance(2000)
  assert.strictEqual(saves.length, 0)
  assert.strictEqual(saver.state, 'clean')
})
