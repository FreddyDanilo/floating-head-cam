import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettingsWindow, resizeWindow, setWindowPosition } from './window.service'
const { mockSetContentBounds, mockGetContentBounds, mockGetDisplayMatching } = vi.hoisted(() => ({
  mockSetContentBounds: vi.fn(),
  mockGetContentBounds: vi.fn(() => ({ x: 100, y: 100, width: 300, height: 300 })),
  mockGetDisplayMatching: vi.fn(() => ({
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    bounds: { x: 0, y: 0, width: 1920, height: 1080 }
  }))
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
        isFullScreen: vi.fn(() => false),
        isSimpleFullScreen: vi.fn(() => false),
        setSimpleFullScreen: vi.fn(),
        setFullScreen: vi.fn(),
        getNormalBounds: mockGetContentBounds
      }
    ])
  },
  screen: { getDisplayMatching: mockGetDisplayMatching },
  shell: { openExternal: vi.fn() }
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: false } }))
vi.mock('../../../../resources/icon.png?asset', () => ({ default: '/mock/icon.png' }))
vi.mock('../settings/settings.service', () => ({
  currentState: { x: undefined, y: undefined, shape: 'circle', sizeIndex: 0, alwaysOnTop: true },
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
    it('top-left: sets x=0, y=0', () => {
      setWindowPosition('top-left')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 0, y: 0, width: 300, height: 300 },
        true
      )
    })
    it('top-right: x = workArea.width - winWidth', () => {
      setWindowPosition('top-right')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 1620, y: 0, width: 300, height: 300 },
        true
      )
    })
    it('bottom-left: y = workArea.height - winHeight', () => {
      setWindowPosition('bottom-left')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 0, y: 780, width: 300, height: 300 },
        true
      )
    })
    it('bottom-right: both edges', () => {
      setWindowPosition('bottom-right')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 1620, y: 780, width: 300, height: 300 },
        true
      )
    })
    it('center: calculates center correctly', () => {
      setWindowPosition('center')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 810, y: 390, width: 300, height: 300 },
        true
      )
    })
    it('left-middle: x=0, y=center', () => {
      setWindowPosition('left-middle')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 0, y: 390, width: 300, height: 300 },
        true
      )
    })
    it('right-middle: x=right edge, y=center', () => {
      setWindowPosition('right-middle')
      expect(mockSetContentBounds).toHaveBeenCalledWith(
        { x: 1620, y: 390, width: 300, height: 300 },
        true
      )
    })
  })
  describe('resizeWindow', () => {
    it('clamps x to right edge of workArea', () => {
      mockGetContentBounds.mockReturnValue({ x: 1700, y: 100, width: 300, height: 300 })
      resizeWindow({ width: 450, height: 450 })
      expect(mockSetContentBounds.mock.calls[0][0].x).toBeLessThanOrEqual(1920 - 450)
    })
    it('clamps x to left edge of workArea', () => {
      mockGetContentBounds.mockReturnValue({ x: -50, y: 100, width: 300, height: 300 })
      resizeWindow({ width: 300, height: 300 })
      expect(mockSetContentBounds.mock.calls[0][0].x).toBeGreaterThanOrEqual(0)
    })
    it('clamps y to bottom edge of workArea', () => {
      mockGetContentBounds.mockReturnValue({ x: 100, y: 900, width: 300, height: 300 })
      resizeWindow({ width: 300, height: 450 })
      expect(mockSetContentBounds.mock.calls[0][0].y).toBeLessThanOrEqual(1080 - 450)
    })
    it('applies the new width and height', () => {
      resizeWindow({ width: 450, height: 450 })
      const call = mockSetContentBounds.mock.calls[0][0]
      expect(call.width).toBe(450)
      expect(call.height).toBe(450)
    })
    it('fullscreen: covers the full display bounds, ignoring provided size', () => {
      mockGetDisplayMatching.mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        bounds: { x: 0, y: 25, width: 1920, height: 1080 }
      })
      resizeWindow({ width: 1, height: 1, position: 'fullscreen' })
      const win = BrowserWindow.getAllWindows()[0]
      if (process.platform === 'darwin') {
        expect(win.setSimpleFullScreen).toHaveBeenCalledWith(true)
      } else {
        expect(win.setFullScreen).toHaveBeenCalledWith(true)
      }
    })
  })
})
