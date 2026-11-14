// Copyright (c) dendr000. MIT License.
const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron')
const path = require('node:path')
const { registerIpcHandlers } = require('./ipc-handlers')

const APP_ID = 'com.academicrunner.app'

// 작업 표시줄 그룹·고정의 정체성. 창을 만들기 전에 호출해야 한다. package.json 의 appId 와 같은 값.
app.setName('AcademicRunner')
app.setAppUserModelId(APP_ID)

// 두 번 실행되어 아이콘이 둘 생기는 것을 막는다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'AcademicRunner',
    // 첫 화면이 번쩍이지 않도록 시스템 테마에 맞는 배경색을 미리 준다.
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1b1e24' : '#f6f7f9',
    // 개발 모드(electron .)에서도 앱 아이콘이 보이게 한다. 패키징된 exe 는 exe 안의 아이콘을 쓴다.
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'))
  // 닫기 전에 화면에 "저장하라"고 알리고, 저장이 끝났다는 답을 받은 뒤 닫는다(자동 저장 대기 중인 내용을 잃지 않게).
  // 답이 없어도 3초 뒤에는 닫는다.
  let closeApproved = false
  let closeTimer = null
  const approveClose = () => {
    closeApproved = true
    clearTimeout(closeTimer)
    if (mainWindow) mainWindow.close()
  }
  mainWindow.on('close', (event) => {
    if (closeApproved) return
    event.preventDefault()
    if (closeTimer) return
    closeTimer = setTimeout(approveClose, 3000)
    mainWindow.webContents.send('app:before-close')
  })
  ipcMain.once('app:close-ready', approveClose)
  mainWindow.on('closed', () => {
    clearTimeout(closeTimer)
    mainWindow = null
  })
}

// 화면이 부를 수 있는 기능은 허용 목록 IPC 로만 등록한다.
registerIpcHandlers(() => mainWindow, APP_ID)

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
