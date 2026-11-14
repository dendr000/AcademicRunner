// Copyright (c) dendr000. MIT License.
// "sc." "num." 처럼 점을 찍으면 메서드·속성을 제안한다. 목록과 타입 짐작은 member-data.js, 여기서는 Monaco 에 연결만 한다.
(function () {
  let registered = false

  function registerMemberCompletion(monaco) {
    if (registered) return
    registered = true
    const asSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    for (const language of ['java', 'python', 'javascript']) {
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.'],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const before = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: word.startColumn })
          if (!before.endsWith('.')) return { suggestions: [] }
          const receiver = window.memberData.receiverOf(before.slice(0, -1))
          const members = window.memberData.membersFor(language, model.getValue(), receiver)
          const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
          return {
            suggestions: members.map((item) => ({
              label: item.name,
              kind: item.params === null ? monaco.languages.CompletionItemKind.Field : monaco.languages.CompletionItemKind.Method,
              detail: item.detail,
              // 메서드는 괄호까지 넣고 괄호 안으로 커서를 옮긴다. 속성(length 등)은 이름만.
              insertText: item.params === null ? item.name : item.name + '(' + item.params + ')$0',
              insertTextRules: asSnippet,
              // 속성(length 등)을 메서드보다 먼저 보여 준다.
              sortText: (item.params === null ? '0' : '1') + item.name,
              range,
            })),
          }
        },
      })
    }
  }

  window.registerMemberCompletion = registerMemberCompletion
})()
