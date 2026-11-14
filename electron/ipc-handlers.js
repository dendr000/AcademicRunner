// Copyright (c) dendr000. MIT License.
// 화면(렌더러)이 부를 수 있는 기능을 허용 목록으로만 등록한다.
const { ipcMain, dialog, app } = require('electron')
const { scanProblems } = require('./core/scanner')
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
