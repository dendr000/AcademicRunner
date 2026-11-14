// Copyright (c) dendr000. MIT License.
const { contextBridge, ipcRenderer } = require('electron')

// 화면(렌더러)에는 필요한 함수만 노출한다. Node 의 나머지 기능은 보이지 않는다.
contextBridge.exposeInMainWorld('runnerApi', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  chooseRoot: () => ipcRenderer.invoke('settings:chooseRoot'),
  scanProblems: () => ipcRenderer.invoke('problems:scan'),
  readFile: (problemId, fileName) => ipcRenderer.invoke('files:read', problemId, fileName),
  statFile: (problemId, fileName) => ipcRenderer.invoke('files:stat', problemId, fileName),
  writeFile: (problemId, fileName, content, baseMtimeMs, force) =>
    ipcRenderer.invoke('files:write', problemId, fileName, content, baseMtimeMs, force === true),
  restoreOriginal: (problemId, fileName) => ipcRenderer.invoke('files:restoreOriginal', problemId, fileName),
  // 창을 닫기 전에 메인 프로세스가 부른다. 저장을 마친 뒤 closeReady() 로 알린다.
  onBeforeClose: (callback) => ipcRenderer.on('app:before-close', () => callback()),
  closeReady: () => ipcRenderer.send('app:close-ready'),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
})
