import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenRecorder } from './use-screen-recorder'

type FakeTrack = { video?: boolean; stop?: () => void }

describe('useScreenRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
          getAudioTracks: () => [{ stop: vi.fn() }],
          getVideoTracks: () => [{ stop: vi.fn() }]
        }),
        getDisplayMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
          getAudioTracks: () => [{ stop: vi.fn() }],
          getVideoTracks: () => [{ stop: vi.fn() }]
        })
      }
    })

    vi.stubGlobal(
      'AudioContext',
      class {
        createMediaStreamDestination = vi
          .fn()
          .mockReturnValue({ stream: { getAudioTracks: () => [{ stop: vi.fn() }] } })
        createMediaStreamSource = vi
          .fn()
          .mockReturnValue({ connect: vi.fn().mockReturnValue({ connect: vi.fn() }) })
        createGain = vi.fn().mockReturnValue({
          gain: { value: 1 },
          connect: vi.fn().mockReturnValue({ connect: vi.fn() })
        })
        close = vi.fn()
      }
    )

    vi.stubGlobal(
      'MediaStream',
      class {
        tracks: FakeTrack[]
        constructor(tracks?: FakeTrack[]) {
          this.tracks = tracks || []
          this.getTracks = () => this.tracks
          this.getAudioTracks = () => this.tracks.filter((t) => !t.video)
          this.getVideoTracks = () => this.tracks.filter((t) => t.video === true)
        }
        getTracks: () => FakeTrack[]
        getAudioTracks: () => FakeTrack[]
        getVideoTracks: () => FakeTrack[]
      }
    )

    const mockIpcRenderer = {
      invoke: vi.fn((channel) => {
        if (channel === 'check-screen-permission') return Promise.resolve('granted')
        if (channel === 'check-media-permission') return Promise.resolve('granted')
        if (channel === 'get-screen-sources')
          return Promise.resolve([{ id: 'screen:1', name: 'Screen 1' }])
        if (channel === 'recording-stop')
          return Promise.resolve({ success: true, filePath: 'test.mp4' })
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
      static isTypeSupported = vi.fn().mockReturnValue(true)
      state = 'inactive'
      onstop?: () => void
      start = vi.fn().mockImplementation(() => {
        this.state = 'recording'
      })
      stop = vi.fn().mockImplementation(() => {
        this.state = 'inactive'
        if (this.onstop) this.onstop()
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
  })

  it('starts recording correctly', async () => {
    const { result } = renderHook(() => useScreenRecorder())

    act(() => {
      result.current.startRecording({
        resolution: '1080p',
        fps: '60',
        encoder: 'libx264',
        systemAudioVolume: 50,
        microphoneAudioVolume: 100,
        selectedMicrophoneId: 'default'
      })
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(window.electron?.ipcRenderer.send).toHaveBeenCalledWith('recording-started')
  })

  it('stops recording correctly', async () => {
    const { result } = renderHook(() => useScreenRecorder())

    act(() => {
      result.current.startRecording({
        resolution: '720p',
        fps: '30',
        encoder: 'libx264',
        systemAudioVolume: 50,
        microphoneAudioVolume: 100,
        selectedMicrophoneId: 'default'
      })
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.stopRecording()
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(window.electron?.ipcRenderer.invoke).toHaveBeenCalledWith('recording-stop')
  })
})
