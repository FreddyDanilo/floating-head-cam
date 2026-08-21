import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupRecordingIPC } from './recording.service'
import { ipcMain } from 'electron'

vi.mock('electron', () => ({
  app: {
    getLocale: vi.fn().mockReturnValue('en-US')
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  },
  dialog: {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: 'test-recording.mp4' })
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([{}])
  }
}))

vi.mock('fluent-ffmpeg', () => {
  const ffmpegMock = Object.assign(
    vi.fn(() => ({
      output: vi.fn().mockReturnThis(),
      videoCodec: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation(function (this: unknown, event: string, callback: () => void) {
        if (event === 'end') {
          setTimeout(callback, 10)
        }
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
    createWriteStream: vi.fn().mockReturnValue({
      write: vi.fn(),
      end: vi.fn()
    }),
    existsSync: vi.fn().mockReturnValue(true),
    unlinkSync: vi.fn()
  }
}))

describe('recording.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets up IPC handlers', () => {
    setupRecordingIPC()
    expect(ipcMain.on).toHaveBeenCalledWith('recording-start', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('recording-chunk', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('recording-stop', expect.any(Function))
  })
})
