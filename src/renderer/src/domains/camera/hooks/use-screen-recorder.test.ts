import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenRecorder } from './use-screen-recorder'

describe('useScreenRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    })

    const mockIpcRenderer = {
      invoke: vi.fn((channel) => {
        if (channel === 'check-screen-permission') return Promise.resolve('granted')
        if (channel === 'get-screen-sources') return Promise.resolve([{ id: 'screen:1', name: 'Screen 1' }])
        if (channel === 'recording-stop') return Promise.resolve({ success: true, filePath: 'test.mp4' })
        return Promise.resolve()
      }),
      send: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    }

    vi.stubGlobal('window', {
      electron: {
        ipcRenderer: mockIpcRenderer
      }
    })

    class MockMediaRecorder {
      state = 'inactive'
      start = vi.fn().mockImplementation(() => {
        this.state = 'recording'
      })
      stop = vi.fn().mockImplementation(() => {
        this.state = 'inactive'
        if ((this as any).onstop) (this as any).onstop()
      })
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useScreenRecorder())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.countdown).toBe(null)
  })

  it('starts recording after countdown', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScreenRecorder())

    act(() => {
      result.current.startRecording('1080p', '60')
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.countdown).toBe(3)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(result.current.countdown).toBe(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(result.current.countdown).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    
    expect(result.current.isRecording).toBe(true)

    vi.useRealTimers()
  })

  it('stops recording correctly', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScreenRecorder())

    act(() => {
      result.current.startRecording('720p', '30')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    expect(result.current.isRecording).toBe(true)

    act(() => {
      result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    
    vi.useRealTimers()
  })
})
