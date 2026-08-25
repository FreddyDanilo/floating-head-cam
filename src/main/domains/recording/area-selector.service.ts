import { BrowserWindow, screen } from 'electron'

let _areaSelectorWindow: BrowserWindow | null = null

export function openAreaSelector(): void {
  if (_areaSelectorWindow && !_areaSelectorWindow.isDestroyed()) {
    _areaSelectorWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  _areaSelectorWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  _areaSelectorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  _areaSelectorWindow.setAlwaysOnTop(true, 'screen-saver')

  _areaSelectorWindow.on('closed', () => {
    _areaSelectorWindow = null
  })

  // Load area selector UI (would need a separate HTML/renderer for this)
  // For now, this is a placeholder implementation
}

export function closeAreaSelector(): void {
  if (_areaSelectorWindow && !_areaSelectorWindow.isDestroyed()) {
    _areaSelectorWindow.close()
  }
}

export function getAreaSelectorOffset(): {
  x: number
  y: number
  width: number
  height: number
} | null {
  // Placeholder - would be set by the area selector UI
  return null
}
