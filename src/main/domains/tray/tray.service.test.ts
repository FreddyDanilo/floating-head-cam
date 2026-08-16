import { describe, it, expect, beforeEach, vi } from 'vitest'
const {
  mockSetContextMenu, mockSend, mockShow, mockHide,
  mockSetAlwaysOnTop, mockSetVisibleOnAllWorkspaces, MockTray
} = vi.hoisted(() => {
  const mockSetContextMenu = vi.fn()
  const mockSend = vi.fn()
  const mockShow = vi.fn()
  const mockHide = vi.fn()
  const mockSetAlwaysOnTop = vi.fn()
  const mockSetVisibleOnAllWorkspaces = vi.fn()
  const mockSetImage = vi.fn()
  const MockTray = vi.fn().mockImplementation(function() {
    return { setToolTip: vi.fn(), setContextMenu: mockSetContextMenu, setImage: mockSetImage }
  })
  return { mockSetContextMenu, mockSend, mockShow, mockHide, mockSetAlwaysOnTop, mockSetVisibleOnAllWorkspaces, MockTray }
})
const fakeWin = {
  webContents: { send: mockSend },
  show: mockShow, hide: mockHide,
  setAlwaysOnTop: mockSetAlwaysOnTop,
  setVisibleOnAllWorkspaces: mockSetVisibleOnAllWorkspaces
}
vi.mock('electron', () => ({
  app: { quit: vi.fn() },
  BrowserWindow: { getAllWindows: vi.fn(() => [fakeWin]) },
  Menu: { buildFromTemplate: vi.fn((tmpl) => ({ _template: tmpl })) },
  Tray: MockTray,
  nativeImage: {
    createFromPath: vi.fn().mockReturnValue({
      resize: vi.fn().mockReturnThis()
    }),
    createFromDataURL: vi.fn().mockReturnValue({
      resize: vi.fn().mockReturnThis()
    })
  }
}))
vi.mock('electron-updater', () => ({ autoUpdater: { quitAndInstall: vi.fn() } }))
vi.mock('../../../../resources/icon.png?asset', () => ({ default: '/mock/icon.png' }))
vi.mock('../camera/camera.service', () => ({
  getIsCameraOn: vi.fn(() => false),
  setIsCameraOn: vi.fn()
}))
vi.mock('../window/window.service', () => ({
  getSettingsWindow: vi.fn(() => null),
  createSettingsWindow: vi.fn(),
  setWindowPosition: vi.fn()
}))
vi.mock('../settings/settings.service', () => ({
  shortcuts: {
    topLeft: 'Alt+Q', topRight: 'Alt+E', leftMiddle: 'Alt+A',
    center: 'Alt+S', rightMiddle: 'Alt+D', bottomLeft: 'Alt+Z',
    bottomRight: 'Alt+C', sizeSmall: '1', sizeMedium: '2', sizeLarge: '3',
    mirror: 'Alt+M', alwaysOnTop: 'Alt+T',
    shapeCircle: '', shapeSquare: '', shapeVertical: '', shapeHorizontal: ''
  }
}))
import { initTray, buildTrayMenu, toggleCamera, setUpdateReady } from './tray.service'
import { getIsCameraOn, setIsCameraOn } from '../camera/camera.service'
const state = {
  devices: [], selectedDeviceId: '', isMirrored: false,
  shape: 'circle', sizeIndex: 0, rounding: 24, alwaysOnTop: true
}
describe('tray.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getIsCameraOn).mockReturnValue(false)
    setUpdateReady(false)
  })
  describe('initTray', () => {
    it('creates a Tray instance', () => {
      initTray()
      expect(MockTray).toHaveBeenCalledTimes(1)
    })
  })
  describe('buildTrayMenu', () => {
    it('calls tray.setContextMenu after initTray', () => {
      initTray()
      buildTrayMenu(state)
      expect(mockSetContextMenu).toHaveBeenCalled()
    })
    it('shows Turn On label when camera is off', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(false)
      initTray()
      buildTrayMenu(state)
      const menu = mockSetContextMenu.mock.calls[0][0]
      expect(menu._template[0].label).toBe('Turn On')
    })
    it('shows Turn Off label when camera is on', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(true)
      initTray()
      buildTrayMenu(state)
      const menu = mockSetContextMenu.mock.calls[0][0]
      expect(menu._template[0].label).toBe('Turn Off')
    })
    it('sets alwaysOnTop on all non-settings windows', () => {
      initTray()
      buildTrayMenu({ ...state, alwaysOnTop: true })
      expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver')
    })
  })
  describe('toggleCamera', () => {
    it('calls setIsCameraOn with the inverted value', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(false)
      initTray()
      toggleCamera(state)
      expect(setIsCameraOn).toHaveBeenCalledWith(true)
    })
    it('shows window when turning on', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(false)
      initTray()
      toggleCamera(state)
      expect(mockShow).toHaveBeenCalled()
      expect(mockHide).not.toHaveBeenCalled()
    })
    it('hides window when turning off', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(true)
      initTray()
      toggleCamera(state)
      expect(mockHide).toHaveBeenCalled()
      expect(mockShow).not.toHaveBeenCalled()
    })
    it('sends power-state IPC with new value', () => {
      vi.mocked(getIsCameraOn).mockReturnValue(false)
      initTray()
      toggleCamera(state)
      expect(mockSend).toHaveBeenCalledWith('power-state', true)
    })
    it('rebuilds the tray menu after toggle', () => {
      initTray()
      toggleCamera(state)
      expect(mockSetContextMenu).toHaveBeenCalled()
    })
  })
  describe('setUpdateReady', () => {
    it('includes Start Update item when update is ready', () => {
      initTray()
      setUpdateReady(true)
      buildTrayMenu(state)
      const menu = mockSetContextMenu.mock.calls[0][0]
      expect(menu._template.some((i: any) => i.label === 'Start Update')).toBe(true)
    })
    it('excludes Start Update item when no update is ready', () => {
      initTray()
      setUpdateReady(false)
      buildTrayMenu(state)
      const menu = mockSetContextMenu.mock.calls[0][0]
      expect(menu._template.some((i: any) => i.label === 'Start Update')).toBe(false)
    })
  })
})
