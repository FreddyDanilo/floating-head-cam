import { app } from 'electron'
import fs from 'fs'
import { join } from 'path'
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
  toggleCamera: 'F9',
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
  borderWidth: 4,
  borderGradient: 'none',
  isBorderAnimated: false,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  language: app.getLocale().startsWith('pt') ? 'pt' : ('en' as 'en' | 'pt')
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
export type SettingsTab = 'visuals' | 'positioning' | 'cameraControl' | 'sizing' | undefined

export function resetToDefaults(tab?: SettingsTab | unknown): void {
  // If the parameter passed is an IPC event object or unknown string, we default to full reset (undefined)
  const targetTab = (typeof tab === 'string' && ['visuals', 'positioning', 'cameraControl', 'sizing'].includes(tab)) ? tab as SettingsTab : undefined;
  
  if (!targetTab || targetTab === 'visuals') {
    currentState.shape = defaultState.shape
    currentState.rounding = defaultState.rounding
    currentState.borderWidth = defaultState.borderWidth
    currentState.borderGradient = defaultState.borderGradient
    currentState.isBorderAnimated = defaultState.isBorderAnimated
  }
  
  if (!targetTab || targetTab === 'positioning') {
    const posKeys = ['topLeft', 'topRight', 'leftMiddle', 'center', 'rightMiddle', 'bottomLeft', 'bottomRight']
    posKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
  }
  
  if (!targetTab || targetTab === 'cameraControl') {
    const camKeys = ['mirror', 'alwaysOnTop', 'toggleCamera']
    camKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.isMirrored = defaultState.isMirrored
    currentState.alwaysOnTop = defaultState.alwaysOnTop
  }
  
  if (!targetTab || targetTab === 'sizing') {
    const sizeKeys = ['sizeSmall', 'sizeMedium', 'sizeLarge']
    sizeKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.sizeIndex = defaultState.sizeIndex
  }
}
