
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettingsWindow, resizeWindow, setWindowPosition } from './window.service'
const { 
  mockSetContentBounds, 
  mockGetContentBounds, 
  mockGetDisplayMatching,
  mockSetSimpleFullScreen,
  mockSetFullScreen,
  mockIsFullScreen,
  mockIsSimpleFullScreen,
  mockWebContentsSend
} = vi.hoisted(() => ({
  mockSetContentBounds: vi.fn(),
  mockGetContentBounds: vi.fn(() => ({ x: 100, y: 100, width: 300, height: 300 })),
  mockGetDisplayMatching: vi.fn(() => ({
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    bounds: { x: 0, y: 0, width: 1920, height: 1080 }
  })),
  mockSetSimpleFullScreen: vi.fn(),
  mockSetFullScreen: vi.fn(),
  mockIsFullScreen: vi.fn(() => false),
  mockIsSimpleFullScreen: vi.fn(() => false),
  mockWebContentsSend: vi.fn()
}))
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock'),
    focus: vi.fn(),
    dock: { hide: vi.fn() },
    setLoginItemSettings: vi.fn()
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        getContentBounds: mockGetContentBounds,
        setContentBounds: mockSetContentBounds,
        isFullScreen: mockIsFullScreen,
        isSimpleFullScreen: mockIsSimpleFullScreen,
        setSimpleFullScreen: mockSetSimpleFullScreen,
        setFullScreen: mockSetFullScreen,
        getNormalBounds: mockGetContentBounds,
        webContents: {
          send: mockWebContentsSend
        }
      }
    ])
  },
  screen: { getDisplayMatching: mockGetDisplayMatching },
  shell: { openExternal: vi.fn() }
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: false } }))
vi.mock('../../../../resources/icon.png?asset', () => ({ default: '/mock/icon.png' }))
vi.mock('../settings/settings.service', () => ({
  currentState: { x: undefined, y: undefined, shape: 'circle', sizeIndex: 0, alwaysOnTop: true, cameraScreenId: '' },
  saveSettings: vi.fn()
}))
vi.mock('../camera/camera.service', () => ({ getIsCameraOn: vi.fn(() => false) }))
describe('window.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContentBounds.mockReturnValue({ x: 100, y: 100, width: 300, height: 300 })
    mockGetDisplayMatching.mockReturnValue({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 }
    })
  })
  describe('getSettingsWindow', () => {
    it('returns null before any window is created', () => {
      expect(getSettingsWindow()).toBeNull()
    })
  })
  describe('setWindowPosition', () => {
    it('sends IPC message to renderer', () => {
      setWindowPosition('top-left')
      expect(mockWebContentsSend).toHaveBeenCalledWith('set-camera-position', 'top-left')
    })
  })
  describe('resizeWindow', () => {
    it('is ignored in full-screen architecture', () => {
      resizeWindow({ width: 450, height: 450 })
      expect(mockSetContentBounds).not.toHaveBeenCalled()
    })
  })
})
