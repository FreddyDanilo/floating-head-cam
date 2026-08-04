import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRegister, mockSend, mockSetWindowPosition } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockSend: vi.fn(),
  mockSetWindowPosition: vi.fn()
}))

vi.mock('electron', () => ({
  globalShortcut: { register: mockRegister },
  BrowserWindow: {}
}))

vi.mock('../settings/settings.service', () => ({
  shortcuts: {
    topLeft: 'Alt+Q', topRight: 'Alt+E', leftMiddle: 'Alt+A',
    center: 'Alt+S', rightMiddle: 'Alt+D', bottomLeft: 'Alt+Z',
    bottomRight: 'Alt+C', sizeSmall: '1', sizeMedium: '2', sizeLarge: '3',
    mirror: 'Alt+M', alwaysOnTop: 'Alt+T',
    shapeCircle: '', shapeSquare: '', shapeVertical: '', shapeHorizontal: ''
  },
  currentState: { isMirrored: false, alwaysOnTop: true }
}))

vi.mock('../window/window.service', () => ({
  setWindowPosition: mockSetWindowPosition
}))

import { registerGlobalShortcuts } from './shortcuts.service'

describe('shortcuts.service', () => {
  const mockWin = { webContents: { send: mockSend } } as any

  beforeEach(() => vi.clearAllMocks())

  it('registers all non-empty shortcuts', () => {
    registerGlobalShortcuts(mockWin)
    const keys = mockRegister.mock.calls.map(([k]) => k)
    expect(keys).toContain('Alt+Q')
    expect(keys).toContain('Alt+E')
    expect(keys).toContain('Alt+M')
    expect(keys).toContain('1')
  })

  it('does not register empty string shortcuts', () => {
    registerGlobalShortcuts(mockWin)
    const keys = mockRegister.mock.calls.map(([k]) => k)
    expect(keys).not.toContain('')
  })

  it('size shortcut sends tray-action with correct payload', () => {
    registerGlobalShortcuts(mockWin)
    const call = mockRegister.mock.calls.find(([k]) => k === '1')!
    call[1]()
    expect(mockSend).toHaveBeenCalledWith('tray-action', { type: 'set-size-index', payload: 0 })
  })

  it('position shortcut calls setWindowPosition', () => {
    registerGlobalShortcuts(mockWin)
    const call = mockRegister.mock.calls.find(([k]) => k === 'Alt+Q')!
    call[1]()
    expect(mockSetWindowPosition).toHaveBeenCalledWith('top-left')
  })

  it('does not crash when a shortcut fails to register', () => {
    mockRegister.mockImplementationOnce(() => { throw new Error('already registered') })
    expect(() => registerGlobalShortcuts(mockWin)).not.toThrow()
  })

  it('mirror shortcut sends set-mirror action', () => {
    registerGlobalShortcuts(mockWin)
    const call = mockRegister.mock.calls.find(([k]) => k === 'Alt+M')!
    call[1]()
    expect(mockSend).toHaveBeenCalledWith('tray-action', { type: 'set-mirror', payload: true })
  })
})
