import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import winIcon from '../../../../build/icon.ico?asset'
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
  const isMac = process.platform === 'darwin'
  _settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: t('tray.preferences', currentState.language || 'en').replace('...', ''),
    transparent: isMac,
    backgroundColor: isMac ? '#00000000' : '#0f0f0f',
    ...(isMac
      ? { vibrancy: 'under-window', visualEffectState: 'active', titleBarStyle: 'hiddenInset' }
      : {
          icon: winIcon,
          titleBarStyle: 'hidden',
          titleBarOverlay: { color: '#0f0f0f', symbolColor: '#ffffff', height: 36 }
        }),
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function resizeWindow(_sizeObj: {
  width: number
  height: number
  position?: 'right' | 'fullscreen'
}): void {
  // Ignored in Full-Screen architecture
}

export function getCameraDimensions(): { width: number; height: number } {
  const SIZES = [300, 450, 600]
  const sizeIndex = (currentState.sizeIndex as number) ?? 0
  const shape = (currentState.shape as string) ?? 'circle'
  const borderWidth = (currentState.borderWidth as number) ?? 0
  const hasBorder = sizeIndex !== 4 && (currentState.borderGradient as string) !== 'none'

  if (sizeIndex === 4) {
    const displays = screen.getAllDisplays()
    const display =
      displays.find((d) => d.id.toString() === currentState.cameraScreenId) ??
      screen.getPrimaryDisplay()
    return { width: display.bounds.width, height: display.bounds.height }
  }
  if (sizeIndex === 3) {
    const displays = screen.getAllDisplays()
    const display =
      displays.find((d) => d.id.toString() === currentState.cameraScreenId) ??
      screen.getPrimaryDisplay()
    return { width: Math.round(display.bounds.width * 0.25), height: display.bounds.height }
  }

  const size = SIZES[sizeIndex] || 300
  let w = size
  let h = size
  if (shape === 'vertical-rect') {
    w = Math.round(size * (3 / 4))
    h = size
  } else if (shape === 'horizontal-rect') {
    w = size
    h = Math.round(size * (9 / 16))
  }

  if (hasBorder) {
    w += borderWidth * 2
    h += borderWidth * 2
  }

  return { width: w, height: h }
}

export function moveCameraWindow(x: number, y: number): void {
  if (process.platform !== 'linux') return
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== _settingsWindow && win !== _recordingWorker && !win.isDestroyed()) {
      win.setPosition(Math.round(x), Math.round(y))
    }
  })
}

export function resizeCameraWindow(width: number, height: number, x?: number, y?: number): void {
  if (process.platform !== 'linux') return
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== _settingsWindow && win !== _recordingWorker && !win.isDestroyed()) {
      const [curX, curY] = win.getPosition()
      win.setBounds({
        x: x ?? curX,
        y: y ?? curY,
        width: Math.round(width),
        height: Math.round(height)
      })
    }
  })
}

export function createWindow(callbacks: WindowCallbacks): void {
  const displays = screen.getAllDisplays()
  let selectedDisplay = displays.find((d) => d.id.toString() === currentState.cameraScreenId)
  if (!selectedDisplay) selectedDisplay = screen.getPrimaryDisplay()

  const { bounds } = selectedDisplay

  if (process.platform === 'linux') {
    const camDims = getCameraDimensions()
    const startX = (currentState.x as number) ?? bounds.x
    const startY = (currentState.y as number) ?? bounds.y

    const mainWindow = new BrowserWindow({
      width: camDims.width,
      height: camDims.height,
      x: startX,
      y: startY,
      show: false,
      autoHideMenuBar: true,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      roundedCorners: false,
      icon,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        autoplayPolicy: 'no-user-gesture-required',
        devTools: false
      }
    })
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    mainWindow.on('ready-to-show', () => {
      if (getIsCameraOn()) mainWindow.show()
    })
    mainWindow.on('focus', () => {
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
    return
  }

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
    ...(process.platform === 'win32' ? { icon: winIcon } : {}),
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
  let selectedDisplay = displays.find((d) => d.id.toString() === screenId)
  if (!selectedDisplay) selectedDisplay = screen.getPrimaryDisplay()

  const { bounds } = selectedDisplay

  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== _settingsWindow && win !== _recordingWorker && !win.isDestroyed()) {
      if (process.platform === 'linux') {
        const camDims = getCameraDimensions()
        win.setBounds({
          x: bounds.x,
          y: bounds.y,
          width: camDims.width,
          height: camDims.height
        })
      } else {
        win.setBounds({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        })
      }
      win.webContents.send('screen-changed', {
        width: bounds.width,
        height: bounds.height
      })
    }
  })
}
