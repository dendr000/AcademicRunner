// Copyright (c) dendr000. MIT License.
// 화면(렌더러)이 부를 수 있는 기능을 허용 목록으로만 등록한다.
const { ipcMain, dialog, app, clipboard } = require('electron')
const { scanProblems } = require('./core/scanner')
const files = require('./core/solution-files')
const { createSettingsStore } = require('./core/settings')

function registerIpcHandlers(getWindow, appId) {
  const settings = createSettingsStore(app.getPath('userData'))

  ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    appId,
  }))

  ipcMain.handle('settings:get', () => settings.get())

  ipcMain.handle('problems:scan', () => scanProblems(settings.get().root))

  // 풀이 파일 읽기·저장. 인수 검사는 solution-files 가 한다(화면 값은 믿지 않는다).
  ipcMain.handle('files:read', (_e, problemId, fileName) => files.readSolution(settings.get().root, problemId, fileName))
  ipcMain.handle('files:stat', (_e, problemId, fileName) => files.statSolution(settings.get().root, problemId, fileName))
  ipcMain.handle('files:write', (_e, problemId, fileName, content, baseMtimeMs, force) =>
    files.writeSolution(settings.get().root, problemId, fileName, content, baseMtimeMs, force === true),
  )
  ipcMain.handle('files:restoreOriginal', (_e, problemId, fileName) => files.restoreOriginal(settings.get().root, problemId, fileName))
  ipcMain.handle('clipboard:write', (_e, text) => {
    if (typeof text !== 'string') return { ok: false }
    clipboard.writeText(text)
    return { ok: true }
  })

  // 문제 루트 폴더를 사용자가 고른다. 취소하면 아무것도 바꾸지 않는다.
  ipcMain.handle('settings:chooseRoot', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: '문제 풀이 폴더 선택',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return { changed: false, settings: settings.get() }
    return { changed: true, settings: settings.set({ root: result.filePaths[0] }) }
  })
}

module.exports = { registerIpcHandlers }
