import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function showCountdown(): Promise<void> {
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
    win.center()

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/countdown')
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'countdown' })
    }

    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.close()
      }
      resolve()
    }, 3000)
  })
}
