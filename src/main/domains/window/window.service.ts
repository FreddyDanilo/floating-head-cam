import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import icon from '../../../../resources/icon.png?asset'
import { t } from '../../../shared/i18n'
import { getIsCameraOn } from '../camera/camera.service'
import { currentState, saveSettings } from '../settings/settings.service'
let _settingsWindow: BrowserWindow | null = null
let _recordingWorker: BrowserWindow | null = null
let positionSaveTimer: ReturnType<typeof setTimeout> | null = null

export function getSettingsWindow(): BrowserWindow | null {
  return _settingsWindow
}

export function getRecordingWorker(): BrowserWindow | null {
  return _recordingWorker
}

type WindowCallbacks = {
  onFocus: (win: BrowserWindow) => void
  onBlur: () => void
}
export function createSettingsWindow(): void {
  if (_settingsWindow) {
    _settingsWindow.focus()
    return
  }
  _settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: t('tray.preferences', currentState.language || 'en').replace('...', ''),
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required',
      devTools: false
    }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    _settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/settings')
  } else {
    _settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' })
  }
  _settingsWindow.on('closed', () => {
    _settingsWindow = null
  })
}

export function createRecordingWorker(): void {
  if (_recordingWorker) return

  _recordingWorker = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
      devTools: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    _recordingWorker.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/worker')
  } else {
    _recordingWorker.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/worker' })
  }

  _recordingWorker.on('closed', () => {
    _recordingWorker = null
  })
}
export function setWindowPosition(pos: string): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== _settingsWindow && win !== _recordingWorker) {
      win.webContents.send('set-camera-position', pos)
    }
  })
}

export function resizeWindow(_sizeObj: {
  width: number
  height: number
  position?: 'right' | 'fullscreen'
}): void {
  // Ignored in Full-Screen architecture
}
export function createWindow(callbacks: WindowCallbacks): void {
  const displays = screen.getAllDisplays()
  let selectedDisplay = displays.find(d => d.id.toString() === currentState.cameraScreenId)
  if (!selectedDisplay) selectedDisplay = screen.getPrimaryDisplay()
  
  const { bounds } = selectedDisplay
  
  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    roundedCorners: false,
    ...(process.platform === 'linux' ? { icon, skipTaskbar: true } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required',
      devTools: false
    }
  })
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.on('ready-to-show', () => {
    if (getIsCameraOn()) mainWindow.show()
  })
  mainWindow.on('focus', () => {
    if (process.platform === 'darwin') app.focus({ steal: true })
    callbacks.onFocus(mainWindow)
  })
  mainWindow.on('blur', () => {
    callbacks.onBlur()
  })
  mainWindow.on('moved', () => {
    const [x, y] = mainWindow.getPosition()
    currentState.x = x
    currentState.y = y
    if (positionSaveTimer) clearTimeout(positionSaveTimer)
    positionSaveTimer = setTimeout(() => {
      positionSaveTimer = null
      saveSettings()
    }, 300)
  })
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function moveCameraToScreen(screenId: string): void {
  const displays = screen.getAllDisplays()
  let selectedDisplay = displays.find(d => d.id.toString() === screenId)
  if (!selectedDisplay) selectedDisplay = screen.getPrimaryDisplay()
  
  const { bounds } = selectedDisplay
  
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== _settingsWindow && win !== _recordingWorker) {
      win.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      })
    }
  })
}
