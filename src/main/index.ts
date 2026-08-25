import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
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
import { setupRecordingIPC, setOnRecordingAborted } from './domains/recording/recording.service'

const windowCallbacks = {
  onFocus: (win: BrowserWindow) => {
    registerGlobalShortcuts(win)
  },
  onBlur: () => {
    unregisterGlobalShortcuts()
  }
}

function buildRecordingPayload(): {
  resolution: string
  fps: string
  encoder: string
  systemAudioVolume: number
  microphoneAudioVolume: number
  selectedMicrophoneId: string
} {
  return {
    resolution: currentState.recordingResolution,
    fps: currentState.recordingFps,
    encoder: currentState.recordingEncoder || 'libx264',
    systemAudioVolume: currentState.systemAudioVolume ?? 50,
    microphoneAudioVolume: currentState.microphoneAudioVolume ?? 100,
    selectedMicrophoneId: currentState.selectedMicrophoneId || 'default'
  }
}

let isRecordingFlowInFlight = false
async function startRecordingFlow(): Promise<void> {
  if (isRecordingFlowInFlight) return
  isRecordingFlowInFlight = true
  try {
    if (!currentState.isRecording) {
      await showCountdown()
    }
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win !== getSettingsWindow() && win.webContents) {
        win.webContents.send(
          currentState.isRecording ? 'stop-recording' : 'start-recording',
          buildRecordingPayload()
        )
      }
    })
  } finally {
    isRecordingFlowInFlight = false
  }
}
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}
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
    app.setLoginItemSettings({ openAtLogin: false, openAsHidden: false })
  }
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(true)
  )
  session.defaultSession.setPermissionCheckHandler(() => true)
  const supportsLoopbackAudio = process.platform === 'darwin' || process.platform === 'win32'
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          const primaryDisplay = screen.getPrimaryDisplay()
          const primarySource =
            sources.find((s) => s.display_id === String(primaryDisplay.id)) ?? sources[0]
          callback(
            supportsLoopbackAudio
              ? { video: primarySource, audio: 'loopback' }
              : { video: primarySource }
          )
        })
        .catch((err) => {
          console.error('Error getting sources in setDisplayMediaRequestHandler:', err)
        })
    },
    { useSystemPicker: false }
  )

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = is.dev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self'"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [scriptSrc]
      }
    })
  })
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  app.on('web-contents-created', (_, webContents) => {
    webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' || 
        (input.control && input.shift && input.key.toLowerCase() === 'i') || 
        (input.meta && input.shift && input.key.toLowerCase() === 'i')
      ) {
        event.preventDefault()
      }
    })
  })
  initTray()
  buildTrayMenu(currentState)
  if (shortcuts.toggleCamera) {
    globalShortcut.register(shortcuts.toggleCamera, () => toggleCamera(currentState))
  }
  if (shortcuts.startRecording) {
    globalShortcut.register(shortcuts.startRecording, () => startRecordingFlow())
  }
  autoUpdater.on('update-downloaded', () => {
    setUpdateReady(true)
    buildTrayMenu(currentState)
  })
  if (app.isPackaged && (process.platform !== 'linux' || process.env.APPIMAGE)) {
    autoUpdater.checkForUpdates().catch((err: unknown) => {
      console.warn('Auto-update check failed:', err instanceof Error ? err.message : err)
    })
  }
  const allowedSyncTrayKeys = new Set([
    'devices',
    'selectedDeviceId',
    'isMirrored',
    'shape',
    'borderGradient',
    'borderWidth',
    'isBorderAnimated',
    'sizeIndex',
    'rounding',
    'alwaysOnTop',
    'language'
  ])
  ipcMain.on('sync-tray', (_, state) => {
    for (const key of Object.keys(state)) {
      if (allowedSyncTrayKeys.has(key)) {
        currentState[key] = state[key]
      }
    }
    saveSettings()
    buildTrayMenu(currentState)
    const sw = getSettingsWindow()
    if (sw && state.language) {
      sw.setTitle(t('tray.preferences', state.language).replace('...', ''))
    }
  })

  const allowedSettingKeys = new Set([
    'shape',
    'rounding',
    'borderGradient',
    'borderWidth',
    'isBorderAnimated',
    'recordingFolder',
    'recordingResolution',
    'recordingFps',
    'recordingEncoder',
    'systemAudioVolume',
    'microphoneAudioVolume',
    'selectedMicrophoneId'
  ])
  ipcMain.on('update-setting', (_, { key, value }) => {
    if (!allowedSettingKeys.has(key)) return
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
  ipcMain.handle('choose-recording-folder', async () => {
    const result = await dialog.showOpenDialog(getSettingsWindow() as BrowserWindow, {
      title: t('settings.recordingFolder', currentState.language || 'en'),
      defaultPath:
        typeof currentState.recordingFolder === 'string' && currentState.recordingFolder
          ? currentState.recordingFolder
          : app.getPath('videos'),
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.on('set-window-position', (_, pos) => {
    setWindowPosition(pos)
  })
  function setRecordingState(isRecording: boolean): void {
    currentState.isRecording = isRecording
    saveSettings()
    buildTrayMenu(currentState)
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('sync-setting', { key: 'isRecording', value: isRecording })
    )
  }

  ipcMain.on('recording-started', () => setRecordingState(true))

  ipcMain.on('recording-stopped', () => setRecordingState(false))

  setOnRecordingAborted(() => setRecordingState(false))

  ;(app as any).on('tray-toggle-recording', () => startRecordingFlow())

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
        } catch {
          return systemPreferences.getMediaAccessStatus('screen')
        }
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
        globalShortcut.register(shortcuts.startRecording, () => startRecordingFlow())
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
