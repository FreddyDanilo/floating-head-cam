import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import icon from '../../../../resources/icon.png?asset'
import { getIsCameraOn, setIsCameraOn } from '../camera/camera.service'
import { getSettingsWindow, createSettingsWindow, setWindowPosition } from '../window/window.service'
import { shortcuts } from '../settings/settings.service'

let tray: Tray | null = null
let _updateReady = false

export function setUpdateReady(value: boolean): void {
  _updateReady = value
}

export function initTray(): void {
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Floating Head Cam')
}

export function toggleCamera(state: any): void {
  const newState = !getIsCameraOn()
  setIsCameraOn(newState)
  const sw = getSettingsWindow()
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== sw) {
      newState ? win.show() : win.hide()
      win.webContents.send('power-state', newState)
    }
  })
  buildTrayMenu(state)
}

export function buildTrayMenu(state: any): void {
  if (!tray) return

  const {
    devices = [],
    selectedDeviceId = '',
    isMirrored = false,
    shape = 'circle',
    sizeIndex = 0,
    rounding = 24,
    alwaysOnTop = true
  } = state

  const sw = getSettingsWindow()

  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== sw) {
      win.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
      win.setVisibleOnAllWorkspaces(alwaysOnTop, { visibleOnFullScreen: alwaysOnTop })
    }
  })

  const cameraItems = devices.map((device: any) => ({
    label: device.label || `Camera ${device.deviceId.substring(0, 5)}`,
    type: 'radio' as const,
    checked: device.deviceId === selectedDeviceId,
    click: () => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== sw) win.webContents.send('tray-action', { type: 'set-device', payload: device.deviceId })
      })
    }
  }))

  const menu = Menu.buildFromTemplate([
    {
      label: getIsCameraOn() ? 'Turn Off' : 'Turn On',
      accelerator: 'F9',
      registerAccelerator: false,
      click: () => toggleCamera(state)
    },
    ...(_updateReady ? [
      { type: 'separator' as const },
      { label: 'Start Update', click: () => autoUpdater.quitAndInstall() }
    ] : []),
    { type: 'separator' },
    { label: 'Preferences...', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Cameras', submenu: cameraItems.length > 0 ? cameraItems : [{ label: 'No cameras found', enabled: false }] },
    { type: 'separator' },
    {
      label: 'Position',
      submenu: [
        { label: 'Top Left',     accelerator: shortcuts.topLeft,     registerAccelerator: false, click: () => setWindowPosition('top-left') },
        { label: 'Top Right',    accelerator: shortcuts.topRight,    registerAccelerator: false, click: () => setWindowPosition('top-right') },
        { label: 'Left Middle',  accelerator: shortcuts.leftMiddle,  registerAccelerator: false, click: () => setWindowPosition('left-middle') },
        { label: 'Center',       accelerator: shortcuts.center,      registerAccelerator: false, click: () => setWindowPosition('center') },
        { label: 'Right Middle', accelerator: shortcuts.rightMiddle, registerAccelerator: false, click: () => setWindowPosition('right-middle') },
        { label: 'Bottom Left',  accelerator: shortcuts.bottomLeft,  registerAccelerator: false, click: () => setWindowPosition('bottom-left') },
        { label: 'Bottom Right', accelerator: shortcuts.bottomRight, registerAccelerator: false, click: () => setWindowPosition('bottom-right') },
      ]
    },
    { type: 'separator' },
    {
      label: 'Shape',
      submenu: [
        { label: 'Circle',               type: 'radio' as const, accelerator: shortcuts.shapeCircle,     registerAccelerator: false, checked: shape === 'circle',          click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-shape', payload: 'circle' }) }) },
        { label: 'Square',               type: 'radio' as const, accelerator: shortcuts.shapeSquare,     registerAccelerator: false, checked: shape === 'square',          click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-shape', payload: 'square' }) }) },
        { label: 'Vertical Rectangle',   type: 'radio' as const, accelerator: shortcuts.shapeVertical,   registerAccelerator: false, checked: shape === 'vertical-rect',   click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-shape', payload: 'vertical-rect' }) }) },
        { label: 'Horizontal Rectangle', type: 'radio' as const, accelerator: shortcuts.shapeHorizontal, registerAccelerator: false, checked: shape === 'horizontal-rect', click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-shape', payload: 'horizontal-rect' }) }) },
      ]
    },
    {
      label: 'Rounding',
      enabled: shape !== 'circle',
      submenu: [
        { label: 'Sharp (8px)',   type: 'radio' as const, checked: rounding === 8,  click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-rounding', payload: 8 }) }) },
        { label: 'Subtle (16px)', type: 'radio' as const, checked: rounding === 16, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-rounding', payload: 16 }) }) },
        { label: 'Round (24px)', type: 'radio' as const,  checked: rounding === 24, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-rounding', payload: 24 }) }) },
        { label: 'Maximum (32px)', type: 'radio' as const, checked: rounding === 32, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-rounding', payload: 32 }) }) },
      ]
    },
    {
      label: 'Size',
      submenu: [
        { label: 'Small',  type: 'radio' as const, accelerator: shortcuts.sizeSmall,  registerAccelerator: false, checked: sizeIndex === 0, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-size-index', payload: 0 }) }) },
        { label: 'Medium', type: 'radio' as const, accelerator: shortcuts.sizeMedium, registerAccelerator: false, checked: sizeIndex === 1, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-size-index', payload: 1 }) }) },
        { label: 'Large',  type: 'radio' as const, accelerator: shortcuts.sizeLarge,  registerAccelerator: false, checked: sizeIndex === 2, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-size-index', payload: 2 }) }) },
      ]
    },
    { type: 'separator' },
    { label: 'Mirror Camera', type: 'checkbox' as const, accelerator: shortcuts.mirror,      registerAccelerator: false, checked: isMirrored,  click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-mirror',       payload: !isMirrored }) }) },
    { label: 'Always on Top', type: 'checkbox' as const, accelerator: shortcuts.alwaysOnTop, registerAccelerator: false, checked: alwaysOnTop, click: () => BrowserWindow.getAllWindows().forEach(w => { if (w !== sw) w.webContents.send('tray-action', { type: 'set-always-on-top', payload: !alwaysOnTop }) }) },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}
