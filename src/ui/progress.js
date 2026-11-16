// Copyright (c) dendr000. MIT License.
// 진행 현황: 문제마다 "안 품 / 작성 중 / 통과" 를 판단하고 집계한다(화면 코드 없음, 시험 가능).
//   안 품   = 첫 풀이 파일이 시작 코드와 같음
//   작성 중 = 시작 코드에서 바뀌었지만 통과 기록이 없거나, 통과한 뒤 코드가 또 바뀜
//   통과    = 시험 케이스를 전부 통과했을 때의 코드와 지금 코드가 같음
// 통과 기록(코드 해시와 날짜)만 앱 저장소에 둔다. 문제 폴더에는 아무것도 쓰지 않는다.
(function (root) {
  const STORAGE_KEY = 'academicrunner.progress'
  const STATUS_LABEL = { untouched: '안 품', working: '작성 중', passed: '통과' }

  function dateKey(date) {
    const pad = (n) => String(n).padStart(2, '0')
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
  }

  function sanitize(raw) {
    const clean = {}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean
    for (const [key, rec] of Object.entries(raw)) {
      if (rec && typeof rec.hash === 'string' && rec.hash !== '' && typeof rec.date === 'string') clean[key] = { hash: rec.hash, date: rec.date }
    }
    return clean
  }

  // storage: getItem/setItem 이 있는 저장소, now: () => Date
  function createProgress(storage, now) {
    const clock = now || (() => new Date())
    let records = {}
    try {
      records = sanitize(JSON.parse(storage.getItem(STORAGE_KEY)))
    } catch {
      records = {}
    }

    function save() {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(records))
      } catch {
        // 저장하지 못하면 이번 실행에서만 유지한다.
      }
    }

    const keyOf = (problemId, fileName) => problemId + '#' + fileName

    return {
      // 시험 케이스를 전부 통과한 코드의 해시를 기록한다.
      markPassed(problemId, fileName, hash) {
        if (!problemId || !fileName || !hash) return false
        records[keyOf(problemId, fileName)] = { hash, date: dateKey(clock()) }
        save()
        return true
      },
      // info: { fileName, edited, hash } (진행 정보). 정보가 없으면 'untouched'.
      // 언어 파일이 여러 개면(files) 어느 하나라도 지금 코드로 통과했으면 통과, 하나라도 고쳤으면 작성 중.
      statusOf(problemId, info) {
        if (!info) return 'untouched'
        const list = Array.isArray(info.files) && info.files.length > 0 ? info.files : [info]
        const edited = list.filter((f) => f.edited)
        if (edited.length === 0) return 'untouched'
        const passed = edited.some((f) => {
          const rec = records[keyOf(problemId, f.fileName)]
          return rec && rec.hash === f.hash
        })
        return passed ? 'passed' : 'working'
      },
      // 오늘 통과한(지금도 통과 상태인) 문제인가
      passedToday(problemId, info) {
        if (!info || this.statusOf(problemId, info) !== 'passed') return false
        const list = Array.isArray(info.files) && info.files.length > 0 ? info.files : [info]
        return list.some((f) => {
          const rec = records[keyOf(problemId, f.fileName)]
          return f.edited && rec && rec.hash === f.hash && rec.date === dateKey(clock())
        })
      },
      forget(problemId, fileName) {
        delete records[keyOf(problemId, fileName)]
        save()
      },
    }
  }

  // levels: 스캐너 결과, statusFn(problem) -> 상태. 반환: { untouched, working, passed, total }
  function countStatuses(levels, statusFn) {
    const counts = { untouched: 0, working: 0, passed: 0, total: 0 }
    for (const level of levels) {
      for (const problem of level.problems) {
        counts[statusFn(problem)]++
        counts.total++
      }
    }
    return counts
  }

  // 상태 필터: 'all' | 'untouched' | 'working' | 'passed' | 'today'. matchFn(problem, filter) 를 만든다.
  function matcherFor(filter, statusFn, todayFn) {
    if (filter === 'all') return () => true
    if (filter === 'today') return (problem) => todayFn(problem)
    return (problem) => statusFn(problem) === filter
  }

  const api = { STORAGE_KEY, STATUS_LABEL, createProgress, countStatuses, matcherFor, dateKey }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.progressLib = api
})(typeof window !== 'undefined' ? window : globalThis)
