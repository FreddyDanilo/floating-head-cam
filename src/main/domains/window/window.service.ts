import { app, BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'
import { currentState, saveSettings } from '../settings/settings.service'
import { getIsCameraOn } from '../camera/camera.service'
let _settingsWindow: BrowserWindow | null = null
export function getSettingsWindow(): BrowserWindow | null {
  return _settingsWindow
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
    title: 'Preferences',
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
export function setWindowPosition(pos: string): void {
  const sw = _settingsWindow
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win === sw) return
    const bounds = win.getContentBounds()
    const display = screen.getDisplayMatching(bounds)
    if (!display) return
    const { workArea } = display
    let newX = bounds.x
    let newY = bounds.y
    const { width, height } = bounds
    switch (pos) {
      case 'top-left':      newX = workArea.x; newY = workArea.y; break
      case 'top-right':     newX = workArea.x + workArea.width - width; newY = workArea.y; break
      case 'bottom-left':   newX = workArea.x; newY = workArea.y + workArea.height - height; break
      case 'bottom-right':  newX = workArea.x + workArea.width - width; newY = workArea.y + workArea.height - height; break
      case 'left-middle':   newX = workArea.x; newY = workArea.y + workArea.height / 2 - height / 2; break
      case 'right-middle':  newX = workArea.x + workArea.width - width; newY = workArea.y + workArea.height / 2 - height / 2; break
      case 'center':        newX = workArea.x + workArea.width / 2 - width / 2; newY = workArea.y + workArea.height / 2 - height / 2; break
    }
    win.setContentBounds({ x: Math.round(newX), y: Math.round(newY), width, height }, true)
  })
}
export function resizeWindow(sizeObj: { width: number; height: number }): void {
  const sw = _settingsWindow
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win === sw) return
    const bounds = win.getContentBounds()
    const display = screen.getDisplayMatching(bounds)
    const { workArea } = display
    let newX = bounds.x
    let newY = bounds.y
    const { width, height } = sizeObj
    if (newX + width > workArea.x + workArea.width) newX = workArea.x + workArea.width - width
    if (newX < workArea.x) newX = workArea.x
    if (newY + height > workArea.y + workArea.height) newY = workArea.y + workArea.height - height
    if (newY < workArea.y) newY = workArea.y
    win.setContentBounds({ x: Math.round(newX), y: Math.round(newY), width, height }, true)
  })
}
export function createWindow(callbacks: WindowCallbacks): void {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    x: currentState.x,
    y: currentState.y,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
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
    saveSettings()
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
