import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTrayEvents } from './use-tray-events'

const mockOn = vi.fn()
const mockRemoveAllListeners = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).electron = {
    ipcRenderer: { on: mockOn, removeAllListeners: mockRemoveAllListeners }
  }
})


function makeHandlers() {
  return {
    setSelectedDeviceId: vi.fn(),
    setShape: vi.fn(),
    setIsMirrored: vi.fn(),
    setSizeIndex: vi.fn(),
    setRounding: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setPowerOn: vi.fn(),
    applySize: vi.fn(),
    sizeIndex: 0,
    shape: 'circle'
  }
}

describe('useTrayEvents', () => {
  it('registers tray-action, settings-reset and power-state listeners on mount', () => {
    renderHook(() => useTrayEvents(makeHandlers()))
    const channels = mockOn.mock.calls.map(([ch]) => ch)
    expect(channels).toContain('tray-action')
    expect(channels).toContain('settings-reset')
    expect(channels).toContain('power-state')
  })

  it('removes all listeners on unmount', () => {
    const { unmount } = renderHook(() => useTrayEvents(makeHandlers()))
    unmount()
    expect(mockRemoveAllListeners).toHaveBeenCalledWith('tray-action')
    expect(mockRemoveAllListeners).toHaveBeenCalledWith('settings-reset')
    expect(mockRemoveAllListeners).toHaveBeenCalledWith('power-state')
  })

  it('set-device action calls setSelectedDeviceId', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-device', payload: 'cam2' })
    expect(handlers.setSelectedDeviceId).toHaveBeenCalledWith('cam2')
  })

  it('set-shape action calls setShape and applySize', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-shape', payload: 'square' })
    expect(handlers.setShape).toHaveBeenCalledWith('square')
    expect(handlers.applySize).toHaveBeenCalledWith(0, 'square')
  })

  it('set-mirror action calls setIsMirrored', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-mirror', payload: true })
    expect(handlers.setIsMirrored).toHaveBeenCalledWith(true)
  })

  it('set-size-index action calls setSizeIndex and applySize', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-size-index', payload: 2 })
    expect(handlers.setSizeIndex).toHaveBeenCalledWith(2)
    expect(handlers.applySize).toHaveBeenCalledWith(2, 'circle')
  })

  it('set-rounding action calls setRounding', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-rounding', payload: 16 })
    expect(handlers.setRounding).toHaveBeenCalledWith(16)
  })

  it('set-always-on-top action calls setAlwaysOnTop', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, trayHandler] = mockOn.mock.calls.find(([ch]) => ch === 'tray-action')!
    trayHandler({}, { type: 'set-always-on-top', payload: false })
    expect(handlers.setAlwaysOnTop).toHaveBeenCalledWith(false)
  })

  it('power-state event calls setPowerOn', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, powerHandler] = mockOn.mock.calls.find(([ch]) => ch === 'power-state')!
    powerHandler({}, true)
    expect(handlers.setPowerOn).toHaveBeenCalledWith(true)
  })

  it('settings-reset restores all state values', () => {
    const handlers = makeHandlers()
    renderHook(() => useTrayEvents(handlers))
    const [, resetHandler] = mockOn.mock.calls.find(([ch]) => ch === 'settings-reset')!
    resetHandler({}, { state: { isMirrored: true, shape: 'square', sizeIndex: 1, rounding: 16, alwaysOnTop: false } })
    expect(handlers.setIsMirrored).toHaveBeenCalledWith(true)
    expect(handlers.setShape).toHaveBeenCalledWith('square')
    expect(handlers.setSizeIndex).toHaveBeenCalledWith(1)
    expect(handlers.setRounding).toHaveBeenCalledWith(16)
    expect(handlers.setAlwaysOnTop).toHaveBeenCalledWith(false)
  })

  it('does nothing if window.electron is not available', () => {
    ;(window as any).electron = undefined
    expect(() => renderHook(() => useTrayEvents(makeHandlers()))).not.toThrow()
    expect(mockOn).not.toHaveBeenCalled()
  })
})
