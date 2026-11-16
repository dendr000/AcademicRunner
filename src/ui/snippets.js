// Copyright (c) dendr000. MIT License.
// 편집기에 단축 입력(스니펫) 자동완성을 등록한다. 목록은 snippet-data.js, 여기서는 Monaco 에 연결만 한다.
(function () {
  let registered = false

  function registerSnippets(monaco) {
    if (registered) return
    registered = true
    const asSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    for (const [language, items] of Object.entries(window.snippetData.SNIPPETS)) {
      monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }
          return {
            suggestions: items.map((item) => ({
              label: item.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: item.detail,
              insertText: item.body,
              insertTextRules: asSnippet,
              // 같은 점수일 때 파일 안 변수(0)보다 뒤, 키워드(2)보다 앞. 'sout' 처럼 변수와 겹치지 않으면 그대로 맨 위에 온다.
              sortText: '1' + item.label,
              // 글자가 딱 맞는 제안이 점수에서 이기지 않도록 끝에 공백을 붙여, 같은 글자로 시작하는 변수(scores)가 먼저 오게 한다.
              filterText: item.label + ' ',
              range,
            })),
          }
        },
      })
    }
  }

  window.registerSnippets = registerSnippets
})()
