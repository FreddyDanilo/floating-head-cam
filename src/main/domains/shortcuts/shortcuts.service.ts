import { globalShortcut, BrowserWindow } from 'electron'
import { shortcuts, currentState } from '../settings/settings.service'
import { setWindowPosition } from '../window/window.service'

export function registerGlobalShortcuts(win: BrowserWindow): void {
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
