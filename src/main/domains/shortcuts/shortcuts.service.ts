import { BrowserWindow, globalShortcut } from 'electron'
import { currentState, shortcuts } from '../settings/settings.service'
import { setWindowPosition } from '../window/window.service'
export function registerGlobalShortcuts(win: BrowserWindow): void {
  const register = (key: string, action: () => void): void => {
    if (key) {
      try {
        globalShortcut.register(key, action)
      } catch {
        console.error('Failed to register shortcut:', key)
      }
    }
  }
  const handlePosition = (pos: string): void => {
    if (currentState.sizeIndex >= 3) return
    setWindowPosition(pos)
  }

  register(shortcuts.topLeft, () => handlePosition('top-left'))
  register(shortcuts.topRight, () => handlePosition('top-right'))
  register(shortcuts.leftMiddle, () => handlePosition('left-middle'))
  register(shortcuts.center, () => handlePosition('center'))
  register(shortcuts.rightMiddle, () => handlePosition('right-middle'))
  register(shortcuts.bottomLeft, () => handlePosition('bottom-left'))
  register(shortcuts.bottomRight, () => handlePosition('bottom-right'))
  register(shortcuts.sizeSmall, () =>
    win.webContents.send('tray-action', { type: 'set-size-index', payload: 0 })
  )
  register(shortcuts.sizeMedium, () =>
    win.webContents.send('tray-action', { type: 'set-size-index', payload: 1 })
  )
  register(shortcuts.sizeLarge, () =>
    win.webContents.send('tray-action', { type: 'set-size-index', payload: 2 })
  )
  register(shortcuts.sizeSidebar, () =>
    win.webContents.send('tray-action', { type: 'set-size-index', payload: 3 })
  )
  register(shortcuts.sizeFullscreen, () =>
    win.webContents.send('tray-action', { type: 'set-size-index', payload: 4 })
  )
  register(shortcuts.mirror, () =>
    win.webContents.send('tray-action', { type: 'set-mirror', payload: !currentState.isMirrored })
  )
  register(shortcuts.alwaysOnTop, () =>
    win.webContents.send('tray-action', {
      type: 'set-always-on-top',
      payload: !currentState.alwaysOnTop
    })
  )
  register(shortcuts.shapeCircle, () =>
    win.webContents.send('tray-action', { type: 'set-shape', payload: 'circle' })
  )
  register(shortcuts.shapeSquare, () =>
    win.webContents.send('tray-action', { type: 'set-shape', payload: 'square' })
  )
  register(shortcuts.shapeVertical, () =>
    win.webContents.send('tray-action', { type: 'set-shape', payload: 'vertical-rect' })
  )
  register(shortcuts.shapeHorizontal, () =>
    win.webContents.send('tray-action', { type: 'set-shape', payload: 'horizontal-rect' })
  )
}
export function unregisterGlobalShortcuts(): void {
  const keysToUnregister = Object.entries(shortcuts)
    .filter(([key]) => key !== 'toggleCamera' && key !== 'startRecording')
    .map(([, value]) => value)

  for (const key of keysToUnregister) {
    if (key && typeof key === 'string') {
      try {
        globalShortcut.unregister(key)
      } catch {
        console.error('Failed to unregister shortcut:', key)
      }
    }
  }
}
