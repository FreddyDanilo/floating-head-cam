import { app } from 'electron'
import fs from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { cpus } from 'os'

export interface DeviceInfo {
  deviceId: string
  kind?: string
  label: string
  groupId?: string
}
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
  sizeSidebar: '4',
  sizeFullscreen: '5',
  mirror: 'Alt+M',
  alwaysOnTop: 'Alt+T',
  toggleCamera: 'F9',
  shapeCircle: '',
  shapeSquare: '',
  shapeVertical: '',
  shapeHorizontal: '',
  startRecording: 'F10'
}

function getGpuName(): string {
  try {
    return execSync('wmic path win32_VideoController get name', {
      encoding: 'utf8',
      stdio: 'pipe'
    }).toLowerCase()
  } catch {
    return ''
  }
}

function getCpuModel(): string {
  try {
    return cpus()[0]?.model?.toLowerCase() || ''
  } catch {
    return ''
  }
}

function getBestEncoderDefault(): string {
  if (process.platform === 'darwin') return 'h264_videotoolbox'

  if (process.platform === 'win32') {
    const gpuInfo = getGpuName()
    if (gpuInfo.includes('nvidia')) return 'h264_nvenc'
    if (gpuInfo.includes('amd') || gpuInfo.includes('radeon')) return 'h264_amf'
    if (gpuInfo.includes('intel')) return 'h264_qsv'

    const cpuModel = getCpuModel()
    if (cpuModel.includes('intel')) return 'h264_qsv'
    if (cpuModel.includes('amd')) return 'h264_amf'
  }

  return 'libx264'
}

export const defaultState = {
  devices: [] as DeviceInfo[],
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
  language: app.getLocale().startsWith('pt') ? 'pt' : ('en' as 'en' | 'pt'),
  recordingFolder: '',
  recordingResolution: '1080p',
  recordingFps: '60',
  recordingEncoder: getBestEncoderDefault(),
  isRecording: false,
  systemAudioVolume: 50,
  microphoneAudioVolume: 100,
  selectedMicrophoneId: 'default',
  cameraScreenId: '',
  recordingScreenId: ''
}
export const shortcuts: typeof defaultShortcuts = { ...defaultShortcuts }
export const currentState: typeof defaultState & { [key: string]: unknown } = { ...defaultState }
export function loadSettings(): void {
  const p = join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (data.shortcuts) Object.assign(shortcuts, defaultShortcuts, data.shortcuts)
      if (data.state) Object.assign(currentState, defaultState, data.state)
      currentState.devices = []
    } catch (err) {
      console.warn('Failed to load settings, using defaults:', err)
    }
  }
}
export function saveSettings(): void {
  try {
    const p = join(app.getPath('userData'), 'settings.json')
    const stateToPersist = { ...currentState } as Record<string, unknown>
    delete stateToPersist.devices
    fs.writeFileSync(p, JSON.stringify({ shortcuts, state: stateToPersist }, null, 2))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}
export type SettingsTab =
  'visuals' | 'positioning' | 'cameraControl' | 'sizing' | 'recording' | undefined

export function resetToDefaults(tab?: SettingsTab | unknown): void {
  const targetTab =
    typeof tab === 'string' &&
    ['visuals', 'positioning', 'cameraControl', 'sizing', 'recording'].includes(tab)
      ? (tab as SettingsTab)
      : undefined

  if (!targetTab || targetTab === 'recording') {
    currentState.recordingFolder = defaultState.recordingFolder
    currentState.recordingResolution = defaultState.recordingResolution
    currentState.recordingFps = defaultState.recordingFps
    currentState.recordingEncoder = defaultState.recordingEncoder
    currentState.systemAudioVolume = defaultState.systemAudioVolume
    currentState.microphoneAudioVolume = defaultState.microphoneAudioVolume
    currentState.selectedMicrophoneId = defaultState.selectedMicrophoneId
    shortcuts['startRecording'] = defaultShortcuts.startRecording
  }

  if (!targetTab || targetTab === 'visuals') {
    currentState.shape = defaultState.shape
    currentState.rounding = defaultState.rounding
    currentState.borderWidth = defaultState.borderWidth
    currentState.borderGradient = defaultState.borderGradient
    currentState.isBorderAnimated = defaultState.isBorderAnimated
  }

  if (!targetTab || targetTab === 'positioning') {
    const posKeys = [
      'topLeft',
      'topRight',
      'leftMiddle',
      'center',
      'rightMiddle',
      'bottomLeft',
      'bottomRight'
    ]
    posKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
  }

  if (!targetTab || targetTab === 'cameraControl') {
    const camKeys = ['mirror', 'alwaysOnTop', 'toggleCamera']
    camKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.isMirrored = defaultState.isMirrored
    currentState.alwaysOnTop = defaultState.alwaysOnTop
  }

  if (!targetTab || targetTab === 'sizing') {
    const sizeKeys = ['sizeSmall', 'sizeMedium', 'sizeLarge', 'sizeSidebar', 'sizeFullscreen']
    sizeKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.sizeIndex = defaultState.sizeIndex
  }
}
