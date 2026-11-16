// Copyright (c) dendr000. MIT License.
// Java 편집 보조를 Monaco 에 연결한다: 매개변수 이름 힌트(화면에 얹는 글자)와 타입 오타·빠진 import 밑줄 표시.
// 분석 자체는 param-hints.js, java-diagnostics.js(순수 함수)가 하고, 여기서는 위치 변환과 등록만 한다.
(function () {
  let hintsRegistered = false

  // 매개변수 이름 힌트: 표시 여부는 편집기 옵션 inlayHints.enabled(환경 설정의 "매개변수 이름 힌트")가 정한다.
  function registerParamHints(monaco) {
    if (hintsRegistered) return
    hintsRegistered = true
    monaco.languages.registerInlayHintsProvider('java', {
      provideInlayHints(model, range) {
        const hints = []
        for (const h of window.paramHints.computeParamHints(model.getValue())) {
          const position = model.getPositionAt(h.offset)
          if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) continue
          hints.push({ label: h.label, position, kind: monaco.languages.InlayHintKind.Parameter, paddingRight: true })
        }
        return { hints, dispose() {} }
      },
    })
  }

  // 편집기 하나에 타입 오타·import 점검을 붙인다. 글자를 멈추고 0.4초 뒤에 다시 점검한다.
  function attachDiagnostics(monaco, editor) {
    let timer = null
    function update() {
      const model = editor.getModel()
      if (!model) return
      if (model.getLanguageId() !== 'java') {
        monaco.editor.setModelMarkers(model, 'academicrunner', [])
        return
      }
      const markers = window.javaDiagnostics.analyzeAll(model.getValue()).map((d) => {
        const start = model.getPositionAt(d.start)
        const end = model.getPositionAt(d.end)
        return {
          severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          message: d.message,
          source: 'AcademicRunner',
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        }
      })
      monaco.editor.setModelMarkers(model, 'academicrunner', markers)
    }
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(update, 400)
    }
    editor.onDidChangeModelContent(later)
    editor.onDidChangeModel(update)
    update()
  }

  window.javaEditorFeatures = { registerParamHints, attachDiagnostics }
})()
