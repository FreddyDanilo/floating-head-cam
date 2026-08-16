import { electronApp, optimizer } from '@electron-toolkit/utils'
import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  session,
  systemPreferences,
  desktopCapturer
} from 'electron'
import { autoUpdater } from 'electron-updater'
import { getIsCameraOn, setIsCameraOn } from './domains/camera/camera.service'
import { t } from '../shared/i18n'
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
import { showCountdown } from './domains/recording/countdown.service'
import {
  createWindow,
  getSettingsWindow,
  resizeWindow,
  setWindowPosition
} from './domains/window/window.service'
import { setupRecordingIPC } from './domains/recording/recording.service'

const windowCallbacks = {
  onFocus: (win: BrowserWindow) => {
    registerGlobalShortcuts(win)
  },
  onBlur: () => {
    unregisterGlobalShortcuts()
  }
}
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess')
app.whenReady().then(() => {
  const loginSettings = app.getLoginItemSettings()
  if (loginSettings.wasOpenedAtLogin) {
    setIsCameraOn(false)
  } else {
    setIsCameraOn(true)
  }
  loadSettings()
  currentState.isRecording = false
  saveSettings()
  if (process.platform === 'darwin') {
    app.dock?.hide()
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
  }
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(true)
  )
  session.defaultSession.setPermissionCheckHandler(() => true)
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          callback({ video: sources[0], audio: 'loopback' })
        })
        .catch((err) => {
          console.error('Error getting sources in setDisplayMediaRequestHandler:', err)
        })
    },
    { useSystemPicker: true }
  )

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"]
      }
    })
  })
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  initTray()
  buildTrayMenu(currentState)
  if (shortcuts.toggleCamera) {
    globalShortcut.register(shortcuts.toggleCamera, () => toggleCamera(currentState))
  }
  if (shortcuts.startRecording) {
    globalShortcut.register(shortcuts.startRecording, async () => {
      if (!currentState.isRecording) {
        await showCountdown()
      }
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== getSettingsWindow() && win.webContents) {
          win.webContents.send(currentState.isRecording ? 'stop-recording' : 'start-recording', {
            resolution: currentState.recordingResolution,
            fps: currentState.recordingFps
          })
        }
      })
    })
  }
  autoUpdater.on('update-downloaded', () => {
    setUpdateReady(true)
    buildTrayMenu(currentState)
  })
  autoUpdater.checkForUpdates()
  ipcMain.on('sync-tray', (_, state) => {
    Object.assign(currentState, state)
    saveSettings()
    buildTrayMenu(currentState)
    const sw = getSettingsWindow()
    if (sw && state.language) {
      sw.setTitle(t('tray.preferences', state.language).replace('...', ''))
    }
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
      } else if (key === 'borderWidth') {
        win.webContents.send('tray-action', { type: 'set-border-width', payload: value })
      } else if (key === 'isBorderAnimated') {
        win.webContents.send('tray-action', { type: 'set-border-animated', payload: value })
      }
    })
  })
  ipcMain.on('set-window-position', (_, pos) => {
    setWindowPosition(pos)
  })
  ipcMain.on('recording-started', () => {
    currentState.isRecording = true
    saveSettings()
    buildTrayMenu(currentState)
  })

  ipcMain.on('recording-stopped', () => {
    currentState.isRecording = false
    saveSettings()
    buildTrayMenu(currentState)
  })

  ipcMain.handle('get-initial-state', () => ({ ...currentState, isCameraOn: getIsCameraOn() }))
  ipcMain.handle('get-shortcuts', () => shortcuts)
  ipcMain.handle('check-media-permission', async (_, mediaType: 'camera' | 'microphone') => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus(mediaType)
      if (status === 'not-determined') {
        const success = await systemPreferences.askForMediaAccess(mediaType)
        return success ? 'granted' : 'denied'
      }
      return status
    }
    return 'granted'
  })

  ipcMain.handle('check-screen-permission', async () => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      if (status !== 'granted') {
        try {
          await desktopCapturer.getSources({ types: ['screen'] })
        } catch (e) {}
        return systemPreferences.getMediaAccessStatus('screen')
      }
      return status
    }
    return 'granted'
  })

  ipcMain.handle('get-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    return sources.map((s) => ({ id: s.id, name: s.name, display_id: s.display_id }))
  })

  ipcMain.on('update-shortcut', (_, key, value) => {
    shortcuts[key] = value
    saveSettings()
    buildTrayMenu(currentState)
    const sw = getSettingsWindow()
    const floatingHead = BrowserWindow.getAllWindows().find((w) => w !== sw)
    if (floatingHead) {
      globalShortcut.unregisterAll()
      if (shortcuts.toggleCamera) {
        globalShortcut.register(shortcuts.toggleCamera, () => toggleCamera(currentState))
      }
      if (shortcuts.startRecording) {
        globalShortcut.register(shortcuts.startRecording, async () => {
          if (!currentState.isRecording) {
            await showCountdown()
          }
          BrowserWindow.getAllWindows().forEach((win) => {
            if (win !== getSettingsWindow() && win.webContents) {
              win.webContents.send(
                currentState.isRecording ? 'stop-recording' : 'start-recording',
                {
                  resolution: currentState.recordingResolution,
                  fps: currentState.recordingFps,
                  encoder: currentState.recordingEncoder || 'libx264',
                  systemAudioVolume: currentState.systemAudioVolume ?? 50,
                  microphoneAudioVolume: currentState.microphoneAudioVolume ?? 100,
                  selectedMicrophoneId: currentState.selectedMicrophoneId || 'default'
                }
              )
            }
          })
        })
      }
      if (floatingHead.isFocused()) {
        registerGlobalShortcuts(floatingHead)
      }
    }
  })
  ipcMain.on('reset-settings', (_, tab) => {
    resetToDefaults(tab)
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

  setupRecordingIPC()

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
