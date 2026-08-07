import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useShortcuts, formatMacShortcut } from './use-shortcuts'
const mockInvoke = vi.fn()
const mockSend = vi.fn()
const mockOn = vi.fn()
const mockRemoveAllListeners = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).electron = {
    ipcRenderer: { invoke: mockInvoke, send: mockSend, on: mockOn, removeAllListeners: mockRemoveAllListeners }
  }
})
describe('formatMacShortcut', () => {
  it('returns Unbound for empty string', () => {
    expect(formatMacShortcut('')).toBe('Unbound')
  })
  it('replaces Alt with ⌥', () => {
    expect(formatMacShortcut('Alt+Q')).toBe('⌥ Q')
  })
  it('replaces CmdOrCtrl with ⌘', () => {
    expect(formatMacShortcut('CmdOrCtrl+S')).toBe('⌘ S')
  })
  it('replaces Shift with ⇧', () => {
    expect(formatMacShortcut('Shift+A')).toBe('⇧ A')
  })
  it('replaces Control with ⌃', () => {
    expect(formatMacShortcut('Control+C')).toBe('⌃ C')
  })
  it('handles combined modifiers', () => {
    expect(formatMacShortcut('CmdOrCtrl+Shift+S')).toBe('⌘ ⇧ S')
  })
})
describe('useShortcuts', () => {
  it('loads shortcuts on mount via get-shortcuts', async () => {
    mockInvoke.mockResolvedValue({ topLeft: 'Alt+Q', topRight: 'Alt+E' })
    const { result } = renderHook(() => useShortcuts())
    await waitFor(() => expect(result.current.shortcuts.topLeft).toBe('Alt+Q'))
  })
  it('starts with no listeningKey', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    expect(result.current.listeningKey).toBeNull()
  })
  it('setListeningKey updates the listening key', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    act(() => result.current.setListeningKey('topLeft'))
    expect(result.current.listeningKey).toBe('topLeft')
  })
  it('resetSettings sends reset-settings IPC', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    act(() => result.current.resetSettings())
    expect(mockSend).toHaveBeenCalledWith('reset-settings')
  })
  it('captures keydown and sends update-shortcut', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    act(() => result.current.setListeningKey('topLeft'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', altKey: true, bubbles: true }))
    })
    expect(mockSend).toHaveBeenCalledWith('update-shortcut', 'topLeft', 'Alt+Q')
  })
  it('clears listeningKey after key capture', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    act(() => result.current.setListeningKey('topLeft'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', altKey: true, bubbles: true }))
    })
    expect(result.current.listeningKey).toBeNull()
  })
  it('ignores modifier-only keypresses', () => {
    mockInvoke.mockResolvedValue({})
    const { result } = renderHook(() => useShortcuts())
    act(() => result.current.setListeningKey('topLeft'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft', altKey: true }))
    })
    expect(result.current.listeningKey).toBe('topLeft')
  })
  it('removes IPC listeners on unmount', () => {
    mockInvoke.mockResolvedValue({})
    const { unmount } = renderHook(() => useShortcuts())
    unmount()
    expect(mockRemoveAllListeners).toHaveBeenCalledWith('settings-reset')
  })
  it('does nothing when window.electron is unavailable', () => {
    ;(window as any).electron = undefined
    expect(() => renderHook(() => useShortcuts())).not.toThrow()
  })
})
