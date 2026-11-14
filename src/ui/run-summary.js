// Copyright (c) dendr000. MIT License.
// 실행 결과(run-service 의 result)를 한 줄 요약으로 바꾼다. 화면(DOM)을 몰라서 Node 시험에서도 쓴다.
(function (root) {
  function formatMs(ms) {
    if (typeof ms !== 'number') return ''
    return ms >= 1000 ? (ms / 1000).toFixed(2) + '초' : Math.round(ms) + 'ms'
  }

  // 반환: { kind: 'ok' | 'fail', text }
  function describeResult(result, timeoutSec) {
    if (!result) return { kind: 'fail', text: '결과를 받지 못했습니다' }
    const time = formatMs(result.durationMs)
    const tool = result.toolVersion ? ` (${result.toolVersion})` : ''

    if (result.ok) {
      return { kind: 'ok', text: result.phase === 'compile' ? `컴파일 성공 ${time}${tool}` : `실행 완료, 종료 코드 0, ${time}${tool}` }
    }
    if (result.stopped) return { kind: 'fail', text: '중지했습니다' }
    if (result.timedOut) return { kind: 'fail', text: `시간 초과: ${timeoutSec}초 안에 끝나지 않아 중단했습니다` }
    if (result.truncated) return { kind: 'fail', text: '출력이 너무 많아(1MB 초과) 중단했습니다' }
    if (result.phase === 'prepare') return { kind: 'fail', text: result.message || '실행을 준비하지 못했습니다' }
    if (result.spawnError) return { kind: 'fail', text: `프로그램을 시작하지 못했습니다 (${result.spawnError})` }
    if (result.phase === 'compile') return { kind: 'fail', text: '컴파일 오류' }
    return { kind: 'fail', text: `실행 실패, 종료 코드 ${result.exitCode}, ${time}` }
  }

  const api = { describeResult, formatMs }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.runSummary = api
})(typeof window !== 'undefined' ? window : globalThis)
