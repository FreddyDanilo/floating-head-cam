import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  session,
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
import {
  buildTrayMenu,
  initTray,
  setOnToggleRecording,
  setUpdateReady,
  toggleCamera
} from './domains/tray/tray.service'
import { showCountdown } from './domains/recording/countdown.service'
import {
  createWindow,
  getSettingsWindow,
  resizeWindow,
  setWindowPosition,
  getRecordingWorker,
  createRecordingWorker,
  moveCameraToScreen,
  moveCameraWindow,
  resizeCameraWindow
} from './domains/window/window.service'
import { setupRecordingIPC, setOnRecordingAborted } from './domains/recording/recording.service'
import {
  getMediaPermissionStatus,
  isTrustedOrigin,
  openSystemSettings,
  readScreenPermissionStatus,
  requestMediaAccess,
  requestScreenPermission
} from './domains/permissions/permissions.service'

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
      await showCountdown(currentState.recordingScreenId as string | undefined)
    }
    const worker = getRecordingWorker()
    if (worker && worker.webContents) {
      worker.webContents.send(
        currentState.isRecording ? 'stop-recording' : 'start-recording',
        buildRecordingPayload()
      )
    }
  } finally {
    isRecordingFlowInFlight = false
  }
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('disable-color-correct-rendering')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

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
  // Only auto-grant the permissions this app actually uses, and only to our
  // own renderer. Granting everything to every renderer is needless attack
  // surface.
  const ALLOWED_PERMISSIONS = new Set(['media', 'display-capture', 'fullscreen'])
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (!ALLOWED_PERMISSIONS.has(permission)) return callback(false)
    callback(isTrustedOrigin(webContents?.getURL() ?? ''))
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (!ALLOWED_PERMISSIONS.has(permission)) return false
    return isTrustedOrigin(webContents?.getURL() ?? '')
  })
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      if (!isTrustedOrigin(request.securityOrigin)) {
        console.warn('[main] denied display media request from untrusted origin')
        callback({})
        return
      }
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          if (!sources.length) {
            callback({})
            return
          }
          const primaryDisplay = screen.getPrimaryDisplay()
          let targetSource = sources.find(
            (s) => s.display_id === String(currentState.recordingScreenId)
          )
          if (!targetSource) {
            targetSource =
              sources.find((s) => s.display_id === String(primaryDisplay.id)) ?? sources[0]
          }
          if (process.platform === 'darwin' || process.platform === 'win32') {
            callback({ video: targetSource, audio: 'loopback' })
          } else {
            callback({ video: targetSource })
          }
        })
        .catch((err) => {
          console.error('Error getting sources in setDisplayMediaRequestHandler:', err)
          callback({})
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
        // object-src/base-uri/frame-src are additive hardening; they cannot
        // conflict with the renderer's own meta CSP.
        'Content-Security-Policy': [
          `${scriptSrc}; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'`
        ]
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
    'language',
    'cameraScreenId',
    'x',
    'y',
    'sidebarWidthPercentage',
    'sidebarPosition'
  ])
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
    'selectedMicrophoneId',
    'cameraScreenId',
    'recordingScreenId',
    'sidebarWidthPercentage',
    'sidebarPosition'
  ])

  const ENUM_VALUES: Record<string, string[]> = {
    shape: ['circle', 'square', 'vertical-rect', 'horizontal-rect'],
    language: ['en', 'pt'],
    sidebarPosition: ['left', 'right'],
    recordingResolution: ['720p', '1080p', '1440p', '2160p'],
    recordingFps: ['30', '60']
  }
  const BOOLEAN_KEYS = new Set(['isMirrored', 'alwaysOnTop', 'isBorderAnimated'])
  const NUMBER_RANGES: Record<string, [number, number]> = {
    borderWidth: [0, 100],
    sizeIndex: [0, 4],
    rounding: [0, 9999],
    sidebarWidthPercentage: [0, 100],
    systemAudioVolume: [0, 100],
    microphoneAudioVolume: [0, 100]
  }

  function sanitizeValue(key: string, value: unknown): unknown {
    if (ENUM_VALUES[key]) {
      return typeof value === 'string' && ENUM_VALUES[key].includes(value)
        ? value
        : currentState[key]
    }
    if (BOOLEAN_KEYS.has(key)) {
      return typeof value === 'boolean' ? value : Boolean(value)
    }
    if (key in NUMBER_RANGES) {
      const [min, max] = NUMBER_RANGES[key]
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return currentState[key]
      return Math.round(Math.min(max, Math.max(min, n)))
    }
    if (key === 'x' || key === 'y') {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : undefined
    }
    return value
  }

  ipcMain.on('sync-tray', (_, state) => {
    if (!state || typeof state !== 'object') return
    for (const key of Object.keys(state)) {
      if (allowedSyncTrayKeys.has(key)) {
        currentState[key] = sanitizeValue(key, state[key])
      }
    }
    saveSettings()
    buildTrayMenu(currentState)
    const sw = getSettingsWindow()
    const lang = sanitizeValue('language', state.language)
    if (sw && (lang === 'en' || lang === 'pt')) {
      sw.setTitle(t('tray.preferences', lang as 'en' | 'pt').replace('...', ''))
    }
  })

  ipcMain.on('update-setting', (_, { key, value }) => {
    if (!allowedSettingKeys.has(key)) return
    const safeValue = sanitizeValue(key, value)
    currentState[key] = safeValue
    saveSettings()
    buildTrayMenu(currentState)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('sync-setting', { key, value: safeValue })

      if (key === 'shape') {
        win.webContents.send('tray-action', { type: 'set-shape', payload: safeValue })
      } else if (key === 'rounding') {
        win.webContents.send('tray-action', { type: 'set-rounding', payload: safeValue })
      } else if (key === 'borderGradient') {
        win.webContents.send('tray-action', { type: 'set-border-gradient', payload: safeValue })
      } else if (key === 'borderWidth') {
        win.webContents.send('tray-action', { type: 'set-border-width', payload: safeValue })
      } else if (key === 'isBorderAnimated') {
        win.webContents.send('tray-action', { type: 'set-border-animated', payload: safeValue })
      } else if (key === 'sidebarWidthPercentage') {
        win.webContents.send('tray-action', { type: 'set-sidebar-width', payload: safeValue })
      } else if (key === 'sidebarPosition') {
        win.webContents.send('tray-action', { type: 'set-sidebar-position', payload: safeValue })
      }
    })

    if (key === 'cameraScreenId' && typeof safeValue === 'string') {
      moveCameraToScreen(safeValue)
    }
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

  ipcMain.on('recording-permission-denied', (_, payload) => {
    setRecordingState(false)
    BrowserWindow.getAllWindows().forEach((w) => {
      if (w !== getRecordingWorker()) {
        w.webContents.send('recording-permission-denied', payload)
      }
    })
  })

  setOnRecordingAborted(() => setRecordingState(false))

  // Renderer-originated recording failures (e.g. MediaRecorder error, missing
  // capture device) are relayed to the visible windows so the user sees them.
  ipcMain.on('recording-error-renderer', (_event, payload: unknown) => {
    setRecordingState(false)
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : 'Recording failed'
    BrowserWindow.getAllWindows().forEach((w) => {
      if (w !== getRecordingWorker()) {
        w.webContents.send('recording-error', { code: 'unknown', message, stderr: '' })
      }
    })
  })

  setOnToggleRecording(() => startRecordingFlow())

  ipcMain.handle('get-initial-state', () => ({ ...currentState, isCameraOn: getIsCameraOn() }))
  ipcMain.handle('get-shortcuts', () => shortcuts)

  ipcMain.handle(
    'check-media-permission',
    async (_, mediaType: 'camera' | 'microphone'): Promise<string> => {
      if (mediaType !== 'camera' && mediaType !== 'microphone') return 'unknown'
      return requestMediaAccess(mediaType)
    }
  )

  // Read-only variants: these never trigger an OS prompt and are safe to call
  // from passive UI (status badges, overlays).
  ipcMain.handle('get-media-permission-status', (_, mediaType: 'camera' | 'microphone'): string => {
    if (mediaType !== 'camera' && mediaType !== 'microphone') return 'unknown'
    return getMediaPermissionStatus(mediaType)
  })

  ipcMain.handle('get-screen-permission-status', (): string => readScreenPermissionStatus())

  ipcMain.handle('check-screen-permission', async (): Promise<string> => {
    return requestScreenPermission()
  })

  ipcMain.handle(
    'open-system-settings',
    async (_, type: 'camera' | 'microphone' | 'screen'): Promise<boolean> => {
      if (type !== 'camera' && type !== 'microphone' && type !== 'screen') return false
      return openSystemSettings(type)
    }
  )

  ipcMain.handle('get-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    return sources.map((s) => ({ id: s.id, name: s.name, display_id: s.display_id }))
  })

  ipcMain.handle('get-displays', () => {
    return screen.getAllDisplays().map((d) => ({
      id: d.id.toString(),
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds
    }))
  })

  ipcMain.on('update-shortcut', (_, key, value) => {
    if (typeof key !== 'string' || !(key in shortcuts)) return
    if (typeof value !== 'string') return
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

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    if (process.platform === 'linux') return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (options) {
        win.setIgnoreMouseEvents(ignore, options)
      } else {
        win.setIgnoreMouseEvents(ignore)
      }
    }
  })

  ipcMain.on('move-camera-window', (_, x: number, y: number) => {
    moveCameraWindow(x, y)
  })

  ipcMain.on('resize-camera-window', (_, width: number, height: number, x?: number, y?: number) => {
    resizeCameraWindow(width, height, x, y)
  })

  createWindow(windowCallbacks)
  createRecordingWorker()

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
