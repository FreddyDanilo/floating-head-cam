import { app, ipcMain, session, BrowserWindow, globalShortcut, systemPreferences } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { loadSettings, saveSettings, shortcuts, currentState, resetToDefaults } from './domains/settings/settings.service'
import { getIsCameraOn } from './domains/camera/camera.service'
import { createWindow, getSettingsWindow, setWindowPosition, resizeWindow } from './domains/window/window.service'
import { registerGlobalShortcuts } from './domains/shortcuts/shortcuts.service'
import { initTray, buildTrayMenu, toggleCamera, setUpdateReady } from './domains/tray/tray.service'

const windowCallbacks = {
  onFocus: (win: BrowserWindow) => registerGlobalShortcuts(win),
  onBlur: () => {
    globalShortcut.unregisterAll()
    globalShortcut.register('F9', () => toggleCamera(currentState))
  }
}

app.whenReady().then(() => {
  loadSettings()

  if (process.platform === 'darwin') {
    app.dock?.hide()
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
    systemPreferences.askForMediaAccess('camera')
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(true))
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
    buildTrayMenu(state)
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
    const floatingHead = BrowserWindow.getAllWindows().find(w => w !== sw)
    if (floatingHead && floatingHead.isFocused()) {
      globalShortcut.unregisterAll()
      globalShortcut.register('F9', () => toggleCamera(currentState))
      registerGlobalShortcuts(floatingHead)
    }
  })

  ipcMain.on('reset-settings', () => {
    resetToDefaults()
    saveSettings()
    buildTrayMenu(currentState)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('settings-reset', { shortcuts, state: currentState })
    })
  })

  ipcMain.on('close-window', () => app.quit())

  ipcMain.on('resize-window', (_, sizeObj) => {
    resizeWindow(sizeObj)
  })

  createWindow(windowCallbacks)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(windowCallbacks)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
