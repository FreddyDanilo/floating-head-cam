import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCameraDevices } from './use-camera-devices'
const mockGetUserMedia = vi.fn()
const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
const mockEnumerateDevices = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  })
})
describe('useCameraDevices', () => {
  it('starts with empty devices and no selectedDeviceId', () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([])
    const { result } = renderHook(() => useCameraDevices())
    expect(result.current.devices).toEqual([])
    expect(result.current.selectedDeviceId).toBe('')
    expect(result.current.permissionError).toBe(false)
  })
  it('loads only video devices on mount', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam1', label: 'Camera 1' },
      { kind: 'audioinput', deviceId: 'mic1', label: 'Mic 1' }
    ])
    const { result } = renderHook(() => useCameraDevices())
    await waitFor(() => expect(result.current.devices).toHaveLength(1))
    expect(result.current.devices[0].deviceId).toBe('cam1')
  })
  it('auto-selects the first video device', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam1', label: 'Camera 1' },
      { kind: 'videoinput', deviceId: 'cam2', label: 'Camera 2' }
    ])
    const { result } = renderHook(() => useCameraDevices())
    await waitFor(() => expect(result.current.selectedDeviceId).toBe('cam1'))
  })
  it('does not auto-select when no video devices exist', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([{ kind: 'audioinput', deviceId: 'mic1', label: 'Mic' }])
    const { result } = renderHook(() => useCameraDevices())
    await waitFor(() => expect(result.current.devices).toHaveLength(0))
    expect(result.current.selectedDeviceId).toBe('')
  })
  it('handles getUserMedia error gracefully and sets permissionError', async () => {
    const error = new Error('NotAllowedError')
    error.name = 'NotAllowedError'
    mockGetUserMedia.mockRejectedValue(error)
    const { result } = renderHook(() => useCameraDevices())
    await vi.waitFor(() => expect(result.current.devices).toEqual([]))
    await vi.waitFor(() => expect(result.current.permissionError).toBe(true))
  })
  it('setSelectedDeviceId updates device selection', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([{ kind: 'videoinput', deviceId: 'cam1', label: 'Camera 1' }])
    const { result } = renderHook(() => useCameraDevices())
    await waitFor(() => expect(result.current.selectedDeviceId).toBe('cam1'))
    act(() => {
      result.current.setSelectedDeviceId('cam2')
    })
    await waitFor(() => expect(result.current.selectedDeviceId).toBe('cam2'))
  })
})
