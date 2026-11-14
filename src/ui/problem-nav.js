// Copyright (c) dendr000. MIT License.
// 문제 이동 계산(순수 함수): 화면에 보이는 목록 순서에서 이전/다음 문제를 고르고, 마지막으로 연 문제를 찾는다.
(function (root) {
  // levels: [{ level, problems: [{ id, ... }] }] -> [{ problem, level }] (화면에 보이는 순서)
  function flatten(levels) {
    const out = []
    for (const level of levels) for (const problem of level.problems) out.push({ problem, level })
    return out
  }

  // 현재 문제에서 delta(-1/+1)만큼 이동한 항목. 현재가 없으면 delta 가 양수일 때 처음, 음수일 때 마지막. 끝에서는 멈춘다(순환 안 함).
  function neighbor(levels, currentId, delta) {
    const flat = flatten(levels)
    if (flat.length === 0) return null
    const index = flat.findIndex((x) => x.problem.id === currentId)
    if (index < 0) return delta >= 0 ? flat[0] : flat[flat.length - 1]
    const next = index + delta
    if (next < 0 || next >= flat.length) return null
    return flat[next]
  }

  // 전체 목록에서 id 로 문제를 찾는다. 없으면 null.
  function findById(levels, id) {
    if (typeof id !== 'string') return null
    return flatten(levels).find((x) => x.problem.id === id) || null
  }

  const api = { flatten, neighbor, findById }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.problemNav = api
})(typeof window !== 'undefined' ? window : globalThis)
