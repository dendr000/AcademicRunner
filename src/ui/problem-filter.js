// Copyright (c) dendr000. MIT License.
// 문제 목록을 검색어와 단계로 거르는 순수 함수. 화면(DOM)을 모르므로 Node 시험에서도 쓴다.
(function (root) {
  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, '')
  }

  // levels: 스캐너 결과의 levels. query: 검색어(번호 또는 제목). levelFilter: 'all' 또는 단계 번호 문자열.
  // 검색어와 맞는 문제만 남기고, 남은 문제가 없는 단계는 뺀다.
  // matches(problem): 선택적 추가 조건(진행 상태 필터). 없으면 모두 통과.
  function filterLevels(levels, query, levelFilter, matches) {
    const q = normalize(query)
    const result = []
    for (const level of levels) {
      if (levelFilter !== 'all' && String(level.level) !== String(levelFilter)) continue
      const problems = level.problems.filter((p) => {
        if (matches && !matches(p)) return false
        if (q === '') return true
        const num = String(p.number).padStart(2, '0')
        return normalize(p.title).includes(q) || num.includes(q) || String(p.number) === q
      })
      if (problems.length > 0) result.push({ ...level, problems })
    }
    return result
  }

  // 문제에 그 언어 파일이 하나라도 있으면 true. language 가 'all' 이거나 비면 모두 통과.
  function hasLanguage(problem, language) {
    if (!language || language === 'all') return true
    return (problem.files || []).some((f) => f.language === language)
  }

  const api = { filterLevels, normalize, hasLanguage }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.problemFilter = api
})(typeof window !== 'undefined' ? window : globalThis)
