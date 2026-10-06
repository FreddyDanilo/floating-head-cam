import { describe, it, expect, vi, beforeEach } from 'vitest'

const ipcHandlers: Record<string, (...args: unknown[]) => unknown> = {}
const ipcListeners: Record<string, (...args: unknown[]) => unknown> = {}
const appListeners: Record<string, (...args: unknown[]) => unknown> = {}
const mockSend = vi.fn()

vi.mock('electron', () => ({
  app: {
    getLocale: vi.fn().mockReturnValue('en-US'),
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      appListeners[event] = handler
    }),
    getPath: vi.fn().mockReturnValue('/tmp/videos')
  },
  ipcMain: {
    on: vi.fn().mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcListeners[channel] = handler
    }),
    handle: vi
      .fn()
      .mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
        ipcHandlers[channel] = handler
      })
  },
  dialog: {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: 'test-recording.mp4' })
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockImplementation(() => [{ webContents: { send: mockSend } }])
  }
}))

let ffmpegEndCallback: (() => void) | null = null
let ffmpegErrorCallback: ((err: Error, _stdout: string, stderr: string) => void) | null = null

vi.mock('fluent-ffmpeg', () => {
  const ffmpegMock = Object.assign(
    vi.fn(() => ({
      inputFormat: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      videoCodec: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      audioCodec: vi.fn().mockReturnThis(),
      audioBitrate: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        callback: (...args: unknown[]) => void
      ) {
        if (event === 'end') ffmpegEndCallback = callback as () => void
        if (event === 'error')
          ffmpegErrorCallback = callback as (err: Error, _stdout: string, stderr: string) => void
        return this
      }),
      run: vi.fn()
    })),
    { setFfmpegPath: vi.fn() }
  )
  return { default: ffmpegMock }
})

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    accessSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    rmSync: vi.fn(),
    constants: { W_OK: 2 }
  }
}))

vi.mock('ffmpeg-static', () => ({ default: '/usr/bin/ffmpeg' }))

const mockEvent = { sender: { id: 1 } }

describe('recording.service', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    ffmpegEndCallback = null
    ffmpegErrorCallback = null
    Object.keys(ipcHandlers).forEach((k) => delete ipcHandlers[k])
    Object.keys(ipcListeners).forEach((k) => delete ipcListeners[k])
    Object.keys(appListeners).forEach((k) => delete appListeners[k])
  })

  it('sets up IPC handlers', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    const { ipcMain } = await import('electron')
    setupRecordingIPC()
    expect(ipcMain.handle).toHaveBeenCalledWith('recording-start', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('recording-chunk', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('recording-stop', expect.any(Function))
  })

  it('registers a before-quit handler', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()
    expect(appListeners['before-quit']).toBeTypeOf('function')
  })

  it('happy path: start → chunk → stop resolves with filePath', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    const started = await ipcHandlers['recording-start'](mockEvent, {
      encoder: 'libx264',
      resolution: '1080p',
      fps: '60'
    })
    expect(started).toBe(true)

    ipcListeners['recording-chunk']({}, Buffer.from('fake-chunk'))

    const stopPromise = ipcHandlers['recording-stop']() as Promise<{
      success: boolean
      filePath?: string
    }>

    ffmpegEndCallback?.()

    const result = await stopPromise
    expect(result.success).toBe(true)
    expect(result.filePath).toMatch(/\.mov$/)
  })

  it('ignores duplicate recording-start while one is in progress', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    await ipcHandlers['recording-start'](mockEvent, { encoder: 'libx264' })
    const second = await ipcHandlers['recording-start'](mockEvent, { encoder: 'libx264' })
    expect(second).toBe(false)
  })

  it('FFmpeg error sends recording-error with codec-unavailable code', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    await ipcHandlers['recording-start'](mockEvent, { encoder: 'libx264' })
    ffmpegErrorCallback?.(new Error('encoding failed'), '', 'unknown encoder libx264')

    expect(mockSend).toHaveBeenCalledWith('stop-recording')
    expect(mockSend).toHaveBeenCalledWith('recording-error', {
      code: 'codec-unavailable',
      message: 'encoding failed',
      stderr: 'unknown encoder libx264'
    })
  })

  it('FFmpeg error classifies disk-full correctly', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    await ipcHandlers['recording-start'](mockEvent, { encoder: 'libx264' })
    ffmpegErrorCallback?.(new Error('write error'), '', 'no space left on device')

    expect(mockSend).toHaveBeenCalledWith('recording-error', {
      code: 'disk-full',
      message: 'write error',
      stderr: 'no space left on device'
    })
  })

  it('before-quit does nothing when no recording is in progress', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    const event = { preventDefault: vi.fn() }
    appListeners['before-quit'](event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('before-quit prevents quit and ends stream when recording is active', async () => {
    const { setupRecordingIPC } = await import('./recording.service')
    setupRecordingIPC()

    await ipcHandlers['recording-start'](mockEvent, { encoder: 'libx264' })

    const event = { preventDefault: vi.fn() }
    appListeners['before-quit'](event)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  describe('validation helpers', () => {
    it('resolveEncoder falls back to a safe default for unknown encoders', async () => {
      const { resolveEncoder } = await import('./recording.service')
      expect(resolveEncoder('libx264')).toBe('libx264')
      expect(resolveEncoder('totally-unknown')).toBe('h264_videotoolbox') // darwin default
      expect(resolveEncoder(undefined)).toBe('h264_videotoolbox')
      expect(resolveEncoder(123)).toBe('h264_videotoolbox')
    })

    it('resolveResolution only accepts known resolutions', async () => {
      const { resolveResolution } = await import('./recording.service')
      expect(resolveResolution('1080p')).toBe('1080p')
      expect(resolveResolution('8k')).toBe('1080p')
      expect(resolveResolution(undefined)).toBe('1080p')
    })

    it('resolveFps clamps invalid values into a sane range', async () => {
      const { resolveFps } = await import('./recording.service')
      expect(resolveFps('60')).toBe(60)
      expect(resolveFps(30)).toBe(30)
      expect(resolveFps(999)).toBe(120)
      expect(resolveFps(-5)).toBe(1)
      expect(resolveFps('abc')).toBe(30)
      expect(resolveFps(undefined)).toBe(30)
    })
  })
})
