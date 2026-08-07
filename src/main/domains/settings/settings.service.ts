import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
export const defaultShortcuts = {
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
export const defaultState = {
  devices: [] as any[],
  selectedDeviceId: '',
  isMirrored: false,
  shape: 'circle',
  sizeIndex: 0,
  rounding: 24,
  alwaysOnTop: true,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  language: app.getLocale().startsWith('pt') ? 'pt' : 'en' as 'en' | 'pt'
}
export const shortcuts: typeof defaultShortcuts = { ...defaultShortcuts }
export const currentState: typeof defaultState & { [key: string]: any } = { ...defaultState }
export function loadSettings(): void {
  const p = join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (data.shortcuts) Object.assign(shortcuts, defaultShortcuts, data.shortcuts)
      if (data.state) Object.assign(currentState, defaultState, data.state)
    } catch (e) {}
  }
}
export function saveSettings(): void {
  const p = join(app.getPath('userData'), 'settings.json')
  fs.writeFileSync(p, JSON.stringify({ shortcuts, state: currentState }, null, 2))
}
export function resetToDefaults(): void {
  Object.assign(shortcuts, defaultShortcuts)
  Object.assign(currentState, {
    ...defaultState,
    devices: currentState.devices,
    selectedDeviceId: currentState.selectedDeviceId
  })
}
