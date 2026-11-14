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
              // 'sout' 을 치면 맨 위에 오도록 단어 기반 제안보다 앞에 둔다.
              sortText: '0' + item.label,
              range,
            })),
          }
        },
      })
    }
  }

  window.registerSnippets = registerSnippets
})()
