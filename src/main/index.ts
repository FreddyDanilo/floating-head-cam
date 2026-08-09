import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, globalShortcut, ipcMain, session, systemPreferences } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getIsCameraOn, setIsCameraOn } from './domains/camera/camera.service'
import {
  currentState,
  loadSettings,
  resetToDefaults,
  saveSettings,
  shortcuts
} from './domains/settings/settings.service'
import {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts
} from './domains/shortcuts/shortcuts.service'
import { buildTrayMenu, initTray, setUpdateReady, toggleCamera } from './domains/tray/tray.service'
import {
  createWindow,
  getSettingsWindow,
  resizeWindow,
  setWindowPosition
} from './domains/window/window.service'

const windowCallbacks = {
  onFocus: (win: BrowserWindow) => {
    registerGlobalShortcuts(win)
  },
  onBlur: () => {
    unregisterGlobalShortcuts()
  }
}
app.whenReady().then(() => {
  const loginSettings = app.getLoginItemSettings()
  if (loginSettings.wasOpenedAtLogin) {
    setIsCameraOn(false)
  } else {
    setIsCameraOn(true)
  }
  loadSettings()
  if (process.platform === 'darwin') {
    app.dock?.hide()
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
    systemPreferences.askForMediaAccess('camera')
  }
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(true)
  )
  session.defaultSession.setPermissionCheckHandler(() => true)
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  initTray()
  buildTrayMenu(currentState)
  globalShortcut.register('F9', () => toggleCamera(currentState))
  autoUpdater.on('update-downloaded', () => {
    setUpdateReady(true)
    buildTrayMenu(currentState)
  })
  autoUpdater.checkForUpdates()
  ipcMain.on('sync-tray', (_, state) => {
    Object.assign(currentState, state)
    saveSettings()
    buildTrayMenu(currentState)
  })
  
  ipcMain.on('update-setting', (_, { key, value }) => {
    currentState[key] = value
    saveSettings()
    buildTrayMenu(currentState)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('sync-setting', { key, value })
      
      if (key === 'shape') {
        win.webContents.send('tray-action', { type: 'set-shape', payload: value })
      } else if (key === 'rounding') {
        win.webContents.send('tray-action', { type: 'set-rounding', payload: value })
      } else if (key === 'borderGradient') {
        win.webContents.send('tray-action', { type: 'set-border-gradient', payload: value })
      }
    })
  })
  ipcMain.on('set-window-position', (_, pos) => {
    setWindowPosition(pos)
  })
  ipcMain.handle('get-initial-state', () => ({ ...currentState, isCameraOn: getIsCameraOn() }))
  ipcMain.handle('get-shortcuts', () => shortcuts)
  ipcMain.on('update-shortcut', (_, key, value) => {
    shortcuts[key] = value
    saveSettings()
    buildTrayMenu(currentState)
    const sw = getSettingsWindow()
    const floatingHead = BrowserWindow.getAllWindows().find((w) => w !== sw)
    if (floatingHead) {
      globalShortcut.unregisterAll()
      globalShortcut.register('F9', () => toggleCamera(currentState))
      if (floatingHead.isFocused()) {
        registerGlobalShortcuts(floatingHead)
      }
    }
  })
  ipcMain.on('reset-settings', () => {
    resetToDefaults()
    saveSettings()
    buildTrayMenu(currentState)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('settings-reset', { shortcuts, state: currentState })
    })
  })
  ipcMain.on('close-window', () => app.quit())
  ipcMain.on('resize-window', (_, sizeObj) => {
    resizeWindow(sizeObj)
  })
  createWindow(windowCallbacks)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(windowCallbacks)
    }
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
