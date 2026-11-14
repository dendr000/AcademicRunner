// Copyright (c) dendr000. MIT License.
const { contextBridge, ipcRenderer } = require('electron')

// 화면(렌더러)에는 필요한 함수만 노출한다. Node 의 나머지 기능은 보이지 않는다.
contextBridge.exposeInMainWorld('runnerApi', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  chooseRoot: () => ipcRenderer.invoke('settings:chooseRoot'),
  scanProblems: () => ipcRenderer.invoke('problems:scan'),
})
