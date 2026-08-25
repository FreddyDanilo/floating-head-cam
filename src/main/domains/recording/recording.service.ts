import { ipcMain, app, BrowserWindow } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'
import { PassThrough } from 'stream'
import { currentState } from '../settings/settings.service'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

export function getRecordingTargetFolder(): string {
  const fallback = app.getPath('videos')
  try {
    const configured =
      typeof currentState.recordingFolder === 'string' ? currentState.recordingFolder : ''
    if (configured) {
      fs.mkdirSync(configured, { recursive: true })
      fs.accessSync(configured, fs.constants.W_OK)
      return configured
    }
  } catch (err) {
    console.warn(
      `Recording folder "${String(currentState.recordingFolder)}" is unavailable, falling back to "${fallback}":`,
      err instanceof Error ? err.message : err
    )
  }
  fs.mkdirSync(fallback, { recursive: true })
  return fallback
}

export interface RecordingResult {
  success: boolean
  filePath?: string
  error?: string
}

let recordingStream: PassThrough | null = null
let ffmpegProcess: ffmpeg.FfmpegCommand | null = null
let currentResolve: ((value: RecordingResult) => void) | null = null
let currentReject: ((reason?: Error) => void) | null = null
let recordingOwnerContentsId: number | null = null
let isAborted = false
let onRecordingAborted: (() => void) | null = null

export function setOnRecordingAborted(fn: (() => void) | null): void {
  onRecordingAborted = fn
}

function abortIfOrphaned(contentsId: number): void {
  if (contentsId !== recordingOwnerContentsId) return
  if (!recordingStream || !ffmpegProcess) return
  console.warn('Renderer disconnected during recording; finalizing the file')
  isAborted = true
  recordingStream.end()
}

const RESOLUTION_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '2160p': { width: 3840, height: 2160 }
}

const RESOLUTION_BITRATES: Record<string, number> = {
  '720p': 5000,
  '1080p': 8000,
  '1440p': 14000,
  '2160p': 24000
}

export function setupRecordingIPC(): void {
  app.on('web-contents-created', (_event, contents) => {
    const maybeAbort = (): void => abortIfOrphaned(contents.id)
    contents.on('destroyed', maybeAbort)
    contents.on('render-process-gone', maybeAbort)
    contents.on('did-navigate', maybeAbort)
  })

  ipcMain.handle(
    'recording-start',
    (
      event,
      {
        encoder,
        resolution,
        fps,
        systemAudioVolume,
        microphoneAudioVolume
      }: {
        encoder?: string
        resolution?: string
        fps?: string
        systemAudioVolume?: number
        microphoneAudioVolume?: number
      } = {}
    ) => {
      if (recordingStream || ffmpegProcess) {
        console.warn('recording-start ignored: a recording is already in progress')
        return false
      }
      recordingStream = new PassThrough()
      recordingOwnerContentsId = event.sender.id
      isAborted = false

      let videosFolder: string
      try {
        videosFolder = getRecordingTargetFolder()
      } catch (err) {
        console.error('Failed to resolve a writable recording folder:', err)
        cleanup()
        return false
      }
      const fileName = `Recording-${new Date().toISOString().replace(/:/g, '-')}.mov`
      const filePath = path.join(videosFolder, fileName)

      const resolvedEncoder = encoder || 'libx264'
      const targetFps = parseInt(fps || '60', 10) || 60
      const dims = RESOLUTION_DIMENSIONS[resolution || '1080p'] ?? RESOLUTION_DIMENSIONS['1080p']
      const targetBitrate = RESOLUTION_BITRATES[resolution || '1080p'] ?? 8000

      const vf = `scale=${dims.width}:${dims.height}:flags=lanczos,fps=fps=${targetFps}`

      const safeVol = (v: unknown, fallback: number): number => {
        const n = Number(v)
        return isFinite(n) && n >= 0 && n <= 100 ? n : fallback
      }
      const sysVol = safeVol(systemAudioVolume, 50) / 100
      const micVol = safeVol(microphoneAudioVolume, 100) / 100
      const masterVol = Math.max(sysVol, micVol)

      const outputOptions = [
        '-pix_fmt yuv420p',
        `-vf ${vf}`,
        `-b:v ${targetBitrate}k`,
        '-maxrate:v ' + Math.round(targetBitrate * 1.5) + 'k',
        '-bufsize:v ' + Math.round(targetBitrate * 2) + 'k',
        '-ar 48000',
        `-af volume=${masterVol.toFixed(3)},dynaudnorm=p=0.9:m=100:s=12`,
        '-movflags +faststart'
      ]

      if (resolvedEncoder === 'libx264') {
        outputOptions.push('-preset ultrafast', '-tune zerolatency')
      } else if (resolvedEncoder === 'h264_videotoolbox') {
        outputOptions.push('-allow_sw 1', '-realtime 1')
      } else if (resolvedEncoder === 'h264_nvenc') {
        outputOptions.push('-preset p1', '-tune ll')
      } else if (resolvedEncoder === 'h264_qsv') {
        outputOptions.push('-preset veryfast')
      } else if (resolvedEncoder === 'h264_amf') {
        outputOptions.push('-quality speed')
      }

      ffmpegProcess = ffmpeg(recordingStream)
        .inputFormat('webm')
        .videoCodec(resolvedEncoder)
        .outputOptions(outputOptions)
        .audioCodec('aac')
        .audioBitrate('192k')
        .output(filePath)
        .on('end', () => {
          const wasAborted = isAborted
          if (currentResolve) currentResolve({ success: true, filePath })
          cleanup()
          if (wasAborted) onRecordingAborted?.()
        })
        .on('error', (err, _stdout, stderr) => {
          console.error('FFmpeg encoding error:', err, stderr)
          const wasAborted = isAborted
          if (currentReject) currentReject(err)
          cleanup()
          if (wasAborted) {
            onRecordingAborted?.()
          } else {
            BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('stop-recording'))
          }
        })

      ffmpegProcess.run()
      return true
    }
  )


  ipcMain.on('recording-chunk', (_, chunk: ArrayBuffer) => {
    if (recordingStream && !recordingStream.writableEnded) {
      recordingStream.write(Buffer.from(chunk))
    }
  })

  ipcMain.handle('recording-stop', async () => {
    if (!recordingStream || !ffmpegProcess) {
      return { success: false, error: 'No recording in progress' }
    }

    return new Promise<RecordingResult>((resolve, reject) => {
      currentResolve = resolve
      currentReject = reject
      recordingStream!.end()
    })
  })
}

function cleanup(): void {
  recordingStream = null
  ffmpegProcess = null
  currentResolve = null
  currentReject = null
  recordingOwnerContentsId = null
  isAborted = false
}
