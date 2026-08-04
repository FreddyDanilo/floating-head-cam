import { app, shell, BrowserWindow, ipcMain, systemPreferences, session, Tray, Menu, nativeImage, screen, globalShortcut } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null
let isCameraOn = false
let updateReady = false

const defaultShortcuts = {
  topLeft: 'Alt+Q',
  topRight: 'Alt+E',
  leftMiddle: 'Alt+A',
  center: 'Alt+S',
  rightMiddle: 'Alt+D',
  bottomLeft: 'Alt+Z',
  bottomRight: 'Alt+C',
  sizeSmall: '1',
  sizeMedium: '2',
  sizeLarge: '3',
  mirror: 'Alt+M',
  alwaysOnTop: 'Alt+T',
  shapeCircle: '',
  shapeSquare: '',
  shapeVertical: '',
  shapeHorizontal: ''
}

const defaultState = {
  devices: [],
  selectedDeviceId: '',
  isMirrored: false,
  shape: 'circle',
  sizeIndex: 0,
  rounding: 24,
  alwaysOnTop: true,
  x: undefined,
  y: undefined
}

let shortcuts = { ...defaultShortcuts }
let currentState: any = { ...defaultState }

function loadSettings() {
  const p = join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (data.shortcuts) shortcuts = { ...defaultShortcuts, ...data.shortcuts }
      if (data.state) currentState = { ...defaultState, ...data.state }
    } catch (e) {}
  }
}

function saveSettings() {
  const p = join(app.getPath('userData'), 'settings.json')
  fs.writeFileSync(p, JSON.stringify({ shortcuts, state: currentState }, null, 2))
}

let settingsWindow: BrowserWindow | null = null

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
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
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/settings')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}


function registerGlobalShortcuts(win: BrowserWindow) {
  const register = (key: string, action: () => void) => {
    if (key) {
      try {
        globalShortcut.register(key, action)
      } catch (e) {
        console.error('Failed to register shortcut:', key)
      }
    }
  }

  register(shortcuts.topLeft, () => setWindowPosition('top-left'))
  register(shortcuts.topRight, () => setWindowPosition('top-right'))
  register(shortcuts.leftMiddle, () => setWindowPosition('left-middle'))
  register(shortcuts.center, () => setWindowPosition('center'))
  register(shortcuts.rightMiddle, () => setWindowPosition('right-middle'))
  register(shortcuts.bottomLeft, () => setWindowPosition('bottom-left'))
  register(shortcuts.bottomRight, () => setWindowPosition('bottom-right'))

  register(shortcuts.sizeSmall, () => win.webContents.send('tray-action', { type: 'set-size-index', payload: 0 }))
  register(shortcuts.sizeMedium, () => win.webContents.send('tray-action', { type: 'set-size-index', payload: 1 }))
  register(shortcuts.sizeLarge, () => win.webContents.send('tray-action', { type: 'set-size-index', payload: 2 }))

  register(shortcuts.mirror, () => win.webContents.send('tray-action', { type: 'set-mirror', payload: !currentState.isMirrored }))
  register(shortcuts.alwaysOnTop, () => win.webContents.send('tray-action', { type: 'set-always-on-top', payload: !currentState.alwaysOnTop }))

  register(shortcuts.shapeCircle, () => win.webContents.send('tray-action', { type: 'set-shape', payload: 'circle' }))
  register(shortcuts.shapeSquare, () => win.webContents.send('tray-action', { type: 'set-shape', payload: 'square' }))
  register(shortcuts.shapeVertical, () => win.webContents.send('tray-action', { type: 'set-shape', payload: 'vertical-rect' }))
  register(shortcuts.shapeHorizontal, () => win.webContents.send('tray-action', { type: 'set-shape', payload: 'horizontal-rect' }))
}

function createWindow(): void {
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
    if (isCameraOn) {
      mainWindow.show()
    }
  })

  mainWindow.on('focus', () => {
    if (process.platform === 'darwin') {
      app.focus({ steal: true })
    }
    registerGlobalShortcuts(mainWindow)
  })

  mainWindow.on('blur', () => {
    globalShortcut.unregisterAll()
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

function setWindowPosition(pos: string) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (win === settingsWindow) return

    const bounds = win.getContentBounds()
    const display = screen.getDisplayMatching(bounds)
    if (!display) return
    const { workArea } = display
    
    let newX = bounds.x
    let newY = bounds.y
    const { width, height } = bounds

    switch (pos) {
      case 'top-left':
        newX = workArea.x
        newY = workArea.y
        break
      case 'top-right':
        newX = workArea.x + workArea.width - width
        newY = workArea.y
        break
      case 'bottom-left':
        newX = workArea.x
        newY = workArea.y + workArea.height - height
        break
      case 'bottom-right':
        newX = workArea.x + workArea.width - width
        newY = workArea.y + workArea.height - height
        break
      case 'left-middle':
        newX = workArea.x
        newY = workArea.y + (workArea.height / 2) - (height / 2)
        break
      case 'right-middle':
        newX = workArea.x + workArea.width - width
        newY = workArea.y + (workArea.height / 2) - (height / 2)
        break
      case 'center':
        newX = workArea.x + (workArea.width / 2) - (width / 2)
        newY = workArea.y + (workArea.height / 2) - (height / 2)
        break
    }
    
    win.setContentBounds({ x: Math.round(newX), y: Math.round(newY), width, height }, true)
  })
}

function buildTrayMenu(state: any) {
  if (!tray) return

  const { devices = [], selectedDeviceId = '', isMirrored = false, shape = 'circle', sizeIndex = 0, rounding = 24, alwaysOnTop = true } = state

  BrowserWindow.getAllWindows().forEach(win => {
    if (win !== settingsWindow) {
      win.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
      win.setVisibleOnAllWorkspaces(alwaysOnTop, { visibleOnFullScreen: alwaysOnTop })
    }
  })

  const cameraItems = devices.map((device: any) => ({
    label: device.label || `Camera ${device.deviceId.substring(0, 5)}`,
    type: 'radio',
    checked: device.deviceId === selectedDeviceId,
    click: () => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-device', payload: device.deviceId })
      })
    }
  }))

  const menu = Menu.buildFromTemplate([
    {
      label: isCameraOn ? 'Turn Off' : 'Turn On',
      click: () => {
        isCameraOn = !isCameraOn
        BrowserWindow.getAllWindows().forEach(win => {
          if (win !== settingsWindow) {
            if (isCameraOn) {
              win.show()
            } else {
              win.hide()
            }
            win.webContents.send('power-state', isCameraOn)
          }
        })
        buildTrayMenu(state)
      }
    },
    ...(updateReady ? [
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
        { label: 'Top Left', accelerator: shortcuts.topLeft, registerAccelerator: false, click: () => setWindowPosition('top-left') },
        { label: 'Top Right', accelerator: shortcuts.topRight, registerAccelerator: false, click: () => setWindowPosition('top-right') },
        { label: 'Left Middle', accelerator: shortcuts.leftMiddle, registerAccelerator: false, click: () => setWindowPosition('left-middle') },
        { label: 'Center', accelerator: shortcuts.center, registerAccelerator: false, click: () => setWindowPosition('center') },
        { label: 'Right Middle', accelerator: shortcuts.rightMiddle, registerAccelerator: false, click: () => setWindowPosition('right-middle') },
        { label: 'Bottom Left', accelerator: shortcuts.bottomLeft, registerAccelerator: false, click: () => setWindowPosition('bottom-left') },
        { label: 'Bottom Right', accelerator: shortcuts.bottomRight, registerAccelerator: false, click: () => setWindowPosition('bottom-right') },
      ]
    },
    { type: 'separator' },
    {
      label: 'Shape',
      submenu: [
        {
          label: 'Circle',
          type: 'radio',
          accelerator: shortcuts.shapeCircle,
          registerAccelerator: false,
          checked: shape === 'circle',
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-shape', payload: 'circle' }) })
        },
        {
          label: 'Square',
          type: 'radio',
          accelerator: shortcuts.shapeSquare,
          registerAccelerator: false,
          checked: shape === 'square',
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-shape', payload: 'square' }) })
        },
        {
          label: 'Vertical Rectangle',
          type: 'radio',
          accelerator: shortcuts.shapeVertical,
          registerAccelerator: false,
          checked: shape === 'vertical-rect',
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-shape', payload: 'vertical-rect' }) })
        },
        {
          label: 'Horizontal Rectangle',
          type: 'radio',
          accelerator: shortcuts.shapeHorizontal,
          registerAccelerator: false,
          checked: shape === 'horizontal-rect',
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-shape', payload: 'horizontal-rect' }) })
        }
      ]
    },
    {
      label: 'Rounding',
      enabled: shape !== 'circle',
      submenu: [
        {
          label: 'Sharp (8px)',
          type: 'radio',
          checked: rounding === 8,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-rounding', payload: 8 }) })
        },
        {
          label: 'Subtle (16px)',
          type: 'radio',
          checked: rounding === 16,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-rounding', payload: 16 }) })
        },
        {
          label: 'Round (24px)',
          type: 'radio',
          checked: rounding === 24,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-rounding', payload: 24 }) })
        },
        {
          label: 'Maximum (32px)',
          type: 'radio',
          checked: rounding === 32,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-rounding', payload: 32 }) })
        }
      ]
    },
    {
      label: 'Size',
      submenu: [
        {
          label: 'Small',
          type: 'radio',
          accelerator: shortcuts.sizeSmall,
          registerAccelerator: false,
          checked: sizeIndex === 0,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-size-index', payload: 0 }) })
        },
        {
          label: 'Medium',
          type: 'radio',
          accelerator: shortcuts.sizeMedium,
          registerAccelerator: false,
          checked: sizeIndex === 1,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-size-index', payload: 1 }) })
        },
        {
          label: 'Large',
          type: 'radio',
          accelerator: shortcuts.sizeLarge,
          registerAccelerator: false,
          checked: sizeIndex === 2,
          click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-size-index', payload: 2 }) })
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Mirror Camera',
      type: 'checkbox',
      accelerator: shortcuts.mirror,
      registerAccelerator: false,
      checked: isMirrored,
      click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-mirror', payload: !isMirrored }) })
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      accelerator: shortcuts.alwaysOnTop,
      registerAccelerator: false,
      checked: alwaysOnTop,
      click: () => BrowserWindow.getAllWindows().forEach(win => { if (win !== settingsWindow) win.webContents.send('tray-action', { type: 'set-always-on-top', payload: !alwaysOnTop }) })
    },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}

app.whenReady().then(() => {
  loadSettings()

  if (process.platform === 'darwin') {
    app.dock?.hide()
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    })
    systemPreferences.askForMediaAccess('camera')
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(true))
  session.defaultSession.setPermissionCheckHandler(() => true)

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Floating Head Cam')
  buildTrayMenu(currentState) 
  
  autoUpdater.on('update-downloaded', () => {
    updateReady = true
    buildTrayMenu(currentState)
  })
  
  autoUpdater.checkForUpdates()

  ipcMain.on('sync-tray', (_, state) => {
    currentState = state
    saveSettings()
    buildTrayMenu(state)
  })

  ipcMain.on('set-window-position', (_, pos) => {
    setWindowPosition(pos)
  })
  
  ipcMain.handle('get-initial-state', () => ({ ...currentState, isCameraOn }))
  ipcMain.handle('get-shortcuts', () => shortcuts)
  
  ipcMain.on('update-shortcut', (_, key, value) => {
    shortcuts[key] = value
    saveSettings()
    buildTrayMenu(currentState)
    
    const floatingHead = BrowserWindow.getAllWindows().find(w => w !== settingsWindow)
    if (floatingHead && floatingHead.isFocused()) {
      globalShortcut.unregisterAll()
      registerGlobalShortcuts(floatingHead)
    }
  })

  ipcMain.on('reset-settings', () => {
    shortcuts = { ...defaultShortcuts }
    currentState = { ...defaultState, devices: currentState.devices, selectedDeviceId: currentState.selectedDeviceId }
    saveSettings()
    buildTrayMenu(currentState)
    
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('settings-reset', { shortcuts, state: currentState })
    })
  })

  ipcMain.on('close-window', () => app.quit())
  
  ipcMain.on('resize-window', (_, sizeObj) => {
    BrowserWindow.getAllWindows().forEach(win => {
      if (win === settingsWindow) return

      const bounds = win.getContentBounds()
      const display = screen.getDisplayMatching(bounds)
      const { workArea } = display
      
      let newX = bounds.x
      let newY = bounds.y
      const { width, height } = sizeObj
      
      if (newX + width > workArea.x + workArea.width) {
        newX = workArea.x + workArea.width - width
      }
      if (newX < workArea.x) {
        newX = workArea.x
      }
      
      if (newY + height > workArea.y + workArea.height) {
        newY = workArea.y + workArea.height - height
      }
      if (newY < workArea.y) {
        newY = workArea.y
      }
      
      win.setContentBounds({ x: Math.round(newX), y: Math.round(newY), width: width, height: height }, true)
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
