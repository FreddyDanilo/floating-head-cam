import { app, BrowserWindow, Menu, nativeImage, Tray, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import icon from '../../../../resources/icon.png?asset'
import { t } from '../../../shared/i18n'
import { getIsCameraOn, setIsCameraOn } from '../camera/camera.service'
import { saveSettings, shortcuts } from '../settings/settings.service'
import {
  createSettingsWindow,
  getSettingsWindow,
  setWindowPosition
} from '../window/window.service'

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
    sizeIndex = 0,
    alwaysOnTop = true,
    isRecording = false
  } = state

  const defaultIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })

  const recordingIconBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAVUlEQVR4nGNgGGjAiEviv6vVfwzFu49hqGciVjMucSZiNeOSZyJFMzZ1TKRqRlfPxEAhYBpGBjBiSST4AEw9EzZBYjVjGECMIejyWMMAlyGkepMoAAB46CQabkYFpwAAAABJRU5ErkJggg=='
  const recordingIcon = nativeImage
    .createFromDataURL(recordingIconBase64)
    .resize({ width: 16, height: 16 })

  tray.setImage(isRecording ? recordingIcon : defaultIcon)

  const sw = getSettingsWindow()
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== sw) {
      win.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
      win.setVisibleOnAllWorkspaces(alwaysOnTop, { visibleOnFullScreen: alwaysOnTop })
    }
  })

  const lang = state.language || 'en'
  const cameraItems = devices.map((device: any) => ({
    label:
      device.label ||
      t('tray.cameraFallback', lang).replace('{id}', device.deviceId.substring(0, 5)),
    type: 'radio' as const,
    checked: device.deviceId === selectedDeviceId,
    click: () => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== sw)
          win.webContents.send('tray-action', { type: 'set-device', payload: device.deviceId })
      })
    }
  }))

  const menu = Menu.buildFromTemplate([
    {
      label: getIsCameraOn() ? t('tray.turnOff', lang) : t('tray.turnOn', lang),
      accelerator: shortcuts.toggleCamera,
      registerAccelerator: false,
      click: () => toggleCamera(state)
    },
    ...(_updateReady
      ? [
          { type: 'separator' as const },
          { label: t('tray.startUpdate', lang), click: () => autoUpdater.quitAndInstall() }
        ]
      : []),
    { type: 'separator' },
    { label: t('tray.preferences', lang), click: () => createSettingsWindow() },
    { type: 'separator' },
    {
      label: t('tray.cameras', lang),
      submenu:
        cameraItems.length > 0
          ? cameraItems
          : [{ label: t('tray.noCameras', lang), enabled: false }]
    },
    { type: 'separator' },
    {
      label: t('tray.position', lang),
      submenu: [
        {
          label: t('settings.topLeft', lang),
          accelerator: shortcuts.topLeft,
          registerAccelerator: false,
          click: () => setWindowPosition('top-left')
        },
        {
          label: t('settings.topRight', lang),
          accelerator: shortcuts.topRight,
          registerAccelerator: false,
          click: () => setWindowPosition('top-right')
        },
        {
          label: t('settings.leftMiddle', lang),
          accelerator: shortcuts.leftMiddle,
          registerAccelerator: false,
          click: () => setWindowPosition('left-middle')
        },
        {
          label: t('settings.center', lang),
          accelerator: shortcuts.center,
          registerAccelerator: false,
          click: () => setWindowPosition('center')
        },
        {
          label: t('settings.rightMiddle', lang),
          accelerator: shortcuts.rightMiddle,
          registerAccelerator: false,
          click: () => setWindowPosition('right-middle')
        },
        {
          label: t('settings.bottomLeft', lang),
          accelerator: shortcuts.bottomLeft,
          registerAccelerator: false,
          click: () => setWindowPosition('bottom-left')
        },
        {
          label: t('settings.bottomRight', lang),
          accelerator: shortcuts.bottomRight,
          registerAccelerator: false,
          click: () => setWindowPosition('bottom-right')
        }
      ]
    },
    { type: 'separator' },
    {
      label: t('tray.size', lang),
      submenu: [
        {
          label: t('tray.size.small', lang),
          type: 'radio' as const,
          accelerator: shortcuts.sizeSmall,
          registerAccelerator: false,
          checked: sizeIndex === 0,
          click: () =>
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-size-index', payload: 0 })
            })
        },
        {
          label: t('tray.size.medium', lang),
          type: 'radio' as const,
          accelerator: shortcuts.sizeMedium,
          registerAccelerator: false,
          checked: sizeIndex === 1,
          click: () =>
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-size-index', payload: 1 })
            })
        },
        {
          label: t('tray.size.large', lang),
          type: 'radio' as const,
          accelerator: shortcuts.sizeLarge,
          registerAccelerator: false,
          checked: sizeIndex === 2,
          click: () =>
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-size-index', payload: 2 })
            })
        },
        {
          label: t('tray.size.sidebar', lang),
          type: 'radio' as const,
          accelerator: shortcuts.sizeSidebar,
          registerAccelerator: false,
          checked: sizeIndex === 3,
          click: () =>
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-size-index', payload: 3 })
            })
        },
        {
          label: t('tray.size.fullscreen', lang),
          type: 'radio' as const,
          accelerator: shortcuts.sizeFullscreen,
          registerAccelerator: false,
          checked: sizeIndex === 4,
          click: () =>
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-size-index', payload: 4 })
            })
        }
      ]
    },
    { type: 'separator' },
    {
      label: t('tray.mirror', lang),
      type: 'checkbox' as const,
      accelerator: shortcuts.mirror,
      registerAccelerator: false,
      checked: isMirrored,
      click: () =>
        BrowserWindow.getAllWindows().forEach((w) => {
          if (w !== sw)
            w.webContents.send('tray-action', { type: 'set-mirror', payload: !isMirrored })
        })
    },
    {
      label: t('tray.alwaysOnTop', lang),
      type: 'checkbox' as const,
      accelerator: shortcuts.alwaysOnTop,
      registerAccelerator: false,
      checked: alwaysOnTop,
      click: () =>
        BrowserWindow.getAllWindows().forEach((w) => {
          if (w !== sw)
            w.webContents.send('tray-action', { type: 'set-always-on-top', payload: !alwaysOnTop })
        })
    },
    {
      label: t('settings.language', lang) || 'Language',
      submenu: [
        {
          label: 'English',
          type: 'radio',
          checked: lang === 'en',
          click: () => {
            Object.assign(state, { language: 'en' })
            saveSettings()
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-language', payload: 'en' })
              else w.webContents.send('sync-language', 'en')
            })
            buildTrayMenu(state)
            if (sw) sw.setTitle(t('tray.preferences', 'en').replace('...', ''))
          }
        },
        {
          label: 'Português',
          type: 'radio',
          checked: lang === 'pt',
          click: () => {
            Object.assign(state, { language: 'pt' })
            saveSettings()
            BrowserWindow.getAllWindows().forEach((w) => {
              if (w !== sw)
                w.webContents.send('tray-action', { type: 'set-language', payload: 'pt' })
              else w.webContents.send('sync-language', 'pt')
            })
            buildTrayMenu(state)
            if (sw) sw.setTitle(t('tray.preferences', 'pt').replace('...', ''))
          }
        }
      ]
    },
    { type: 'separator' },
    { label: t('tray.about', lang), click: () => shell.openExternal('https://github.com/FreddyDanilo/floating-head-cam') },
    { label: t('tray.quit', lang), click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
}
