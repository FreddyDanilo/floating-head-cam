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
    // `wmic` is synchronous and deprecated on newer Windows; bound its runtime
    // so a slow/missing binary can never hang the main process at startup.
    return execSync('wmic path win32_VideoController get name', {
      encoding: 'utf8',
      stdio: 'pipe',
      windowsHide: true,
      timeout: 2000
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

let cachedBestEncoder: string | null = null

function getBestEncoderDefault(): string {
  if (cachedBestEncoder) return cachedBestEncoder

  if (process.platform === 'darwin') {
    cachedBestEncoder = 'h264_videotoolbox'
    return cachedBestEncoder
  }

  if (process.platform === 'win32') {
    const gpuInfo = getGpuName()
    if (gpuInfo.includes('nvidia')) cachedBestEncoder = 'h264_nvenc'
    else if (gpuInfo.includes('amd') || gpuInfo.includes('radeon')) cachedBestEncoder = 'h264_amf'
    else if (gpuInfo.includes('intel')) cachedBestEncoder = 'h264_qsv'
    else {
      const cpuModel = getCpuModel()
      if (cpuModel.includes('intel')) cachedBestEncoder = 'h264_qsv'
      else if (cpuModel.includes('amd')) cachedBestEncoder = 'h264_amf'
    }
  }

  if (!cachedBestEncoder) cachedBestEncoder = 'libx264'
  return cachedBestEncoder
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
  recordingScreenId: '',
  sidebarWidthPercentage: 35,
  sidebarPosition: 'right'
}
export type ShortcutKey = keyof typeof defaultShortcuts
export const shortcuts: typeof defaultShortcuts & { [key: string]: string } = {
  ...defaultShortcuts
}
export const currentState: typeof defaultState & { [key: string]: unknown } = { ...defaultState }

const VALID_SHAPES = ['circle', 'square', 'vertical-rect', 'horizontal-rect']
const VALID_RESOLUTIONS = ['720p', '1080p', '1440p', '2160p']

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function sanitizeShortcuts(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const key of Object.keys(defaultShortcuts)) {
    if (typeof r[key] === 'string') out[key] = r[key]
  }
  return out
}

function sanitizeState(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}

  if (typeof r.shape === 'string' && VALID_SHAPES.includes(r.shape)) out.shape = r.shape
  out.rounding = clampNumber(r.rounding, defaultState.rounding, 0, 9999)
  out.borderWidth = clampNumber(r.borderWidth, defaultState.borderWidth, 0, 100)
  if (typeof r.borderGradient === 'string') out.borderGradient = r.borderGradient
  if (typeof r.isBorderAnimated === 'boolean') out.isBorderAnimated = r.isBorderAnimated
  out.sizeIndex = Math.round(clampNumber(r.sizeIndex, defaultState.sizeIndex, 0, 4))
  if (typeof r.alwaysOnTop === 'boolean') out.alwaysOnTop = r.alwaysOnTop
  if (typeof r.isMirrored === 'boolean') out.isMirrored = r.isMirrored
  if (typeof r.x === 'number' && Number.isFinite(r.x)) out.x = r.x
  if (typeof r.y === 'number' && Number.isFinite(r.y)) out.y = r.y
  if (r.language === 'pt' || r.language === 'en') out.language = r.language
  if (typeof r.recordingFolder === 'string') out.recordingFolder = r.recordingFolder
  if (
    typeof r.recordingResolution === 'string' &&
    VALID_RESOLUTIONS.includes(r.recordingResolution)
  ) {
    out.recordingResolution = r.recordingResolution
  }
  if (
    r.recordingFps === '30' ||
    r.recordingFps === '60' ||
    r.recordingFps === 30 ||
    r.recordingFps === 60
  ) {
    out.recordingFps = String(r.recordingFps)
  }
  if (typeof r.recordingEncoder === 'string') out.recordingEncoder = r.recordingEncoder
  out.systemAudioVolume = clampNumber(r.systemAudioVolume, defaultState.systemAudioVolume, 0, 100)
  out.microphoneAudioVolume = clampNumber(
    r.microphoneAudioVolume,
    defaultState.microphoneAudioVolume,
    0,
    100
  )
  if (typeof r.selectedMicrophoneId === 'string') out.selectedMicrophoneId = r.selectedMicrophoneId
  if (typeof r.cameraScreenId === 'string') out.cameraScreenId = r.cameraScreenId
  if (typeof r.recordingScreenId === 'string') out.recordingScreenId = r.recordingScreenId
  out.sidebarWidthPercentage = clampNumber(
    r.sidebarWidthPercentage,
    defaultState.sidebarWidthPercentage,
    0,
    100
  )
  if (r.sidebarPosition === 'left' || r.sidebarPosition === 'right') {
    out.sidebarPosition = r.sidebarPosition
  }

  return out
}

export function loadSettings(): void {
  const p = join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      Object.assign(shortcuts, defaultShortcuts, sanitizeShortcuts(data.shortcuts))
      Object.assign(currentState, defaultState, sanitizeState(data.state))
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
    // Atomic write: write to a temp file then rename so a crash mid-write can
    // never leave a truncated/corrupted settings.json behind.
    const tmp = `${p}.tmp`
    fs.writeFileSync(tmp, JSON.stringify({ shortcuts, state: stateToPersist }, null, 2))
    fs.renameSync(tmp, p)
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
    const posKeys: ShortcutKey[] = [
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
    const camKeys: ShortcutKey[] = ['mirror', 'alwaysOnTop', 'toggleCamera']
    camKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.isMirrored = defaultState.isMirrored
    currentState.alwaysOnTop = defaultState.alwaysOnTop
  }

  if (!targetTab || targetTab === 'sizing') {
    const sizeKeys: ShortcutKey[] = [
      'sizeSmall',
      'sizeMedium',
      'sizeLarge',
      'sizeSidebar',
      'sizeFullscreen'
    ]
    sizeKeys.forEach((k) => (shortcuts[k] = defaultShortcuts[k]))
    currentState.sizeIndex = defaultState.sizeIndex
    currentState.sidebarWidthPercentage = defaultState.sidebarWidthPercentage
    currentState.sidebarPosition = defaultState.sidebarPosition
  }
}
