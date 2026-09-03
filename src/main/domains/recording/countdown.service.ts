import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function showCountdown(recordingScreenId?: string): Promise<void> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 400,
      height: 400,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      hasShadow: false,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    win.setIgnoreMouseEvents(true)

    const displays = screen.getAllDisplays()
    const target = recordingScreenId
      ? (displays.find((d) => String(d.id) === recordingScreenId) ?? screen.getPrimaryDisplay())
      : screen.getPrimaryDisplay()

    const { x, y, width, height } = target.bounds
    win.setBounds({
      x: Math.round(x + (width - 400) / 2),
      y: Math.round(y + (height - 400) / 2),
      width: 400,
      height: 400
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/countdown')
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/countdown' })
    }

    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.close()
      }
      resolve()
    }, 3000)
  })
}

