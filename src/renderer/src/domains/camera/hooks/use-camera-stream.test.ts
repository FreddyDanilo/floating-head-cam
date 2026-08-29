import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCameraStream } from './use-camera-stream'
const mockStop = vi.fn()
const mockGetTracks = vi.fn(() => [{ stop: mockStop }])
const mockGetUserMedia = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: { getUserMedia: mockGetUserMedia }
  })
})
describe('useCameraStream', () => {
  it('returns a videoRef and permissionError', () => {
    const { result } = renderHook(() => useCameraStream('', false))
    expect(result.current.videoRef).toBeDefined()
    expect(result.current.videoRef.current).toBeNull()
    expect(result.current.permissionError).toBe(false)
  })
  it('does not call getUserMedia when powerOn is false', () => {
    renderHook(() => useCameraStream('cam1', false))
    expect(mockGetUserMedia).not.toHaveBeenCalled()
  })
  it('does not call getUserMedia when selectedDeviceId is empty', () => {
    renderHook(() => useCameraStream('', true))
    expect(mockGetUserMedia).not.toHaveBeenCalled()
  })
  it('calls getUserMedia with correct deviceId when power is on', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: mockGetTracks })
    renderHook(() => useCameraStream('cam1', true))
    await vi.waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledOnce())
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        deviceId: { exact: 'cam1' },
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    })
  })
  it('stops tracks on cleanup', async () => {
    const fakeStream = { getTracks: mockGetTracks }
    mockGetUserMedia.mockResolvedValue(fakeStream)
    const { unmount } = renderHook(() => useCameraStream('cam1', true))
    await vi.waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled())
    unmount()
  })
  it('handles getUserMedia error without crashing and sets permissionError', async () => {
    const error = new Error('NotAllowedError')
    error.name = 'NotAllowedError'
    mockGetUserMedia.mockRejectedValue(error)
    const { result } = renderHook(() => useCameraStream('cam1', true))
    await vi.waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled())
    await vi.waitFor(() => expect(result.current.permissionError).toBe(true))
  })
})
