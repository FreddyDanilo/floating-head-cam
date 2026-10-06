import { ipcMain, app, BrowserWindow } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'
import { PassThrough } from 'stream'
import { currentState } from '../settings/settings.service'

let ffmpegPath = ffmpegStatic
if (ffmpegPath && ffmpegPath.includes('app.asar')) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
}
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

type FfmpegErrorCode = 'disk-full' | 'codec-unavailable' | 'permission-denied' | 'unknown'

function classifyFfmpegError(stderr: string): FfmpegErrorCode {
  const s = (stderr ?? '').toLowerCase()
  if (s.includes('no space left') || s.includes('not enough space') || s.includes('enospc')) {
    return 'disk-full'
  }
  if (
    s.includes('unknown encoder') ||
    s.includes('encoder not found') ||
    s.includes('codec not found') ||
    s.includes('no such encoder')
  ) {
    return 'codec-unavailable'
  }
  if (s.includes('permission denied') || s.includes('access denied') || s.includes('eperm')) {
    return 'permission-denied'
  }
  return 'unknown'
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

const ALLOWED_ENCODERS = [
  'libx264',
  'h264_videotoolbox',
  'h264_nvenc',
  'h264_qsv',
  'h264_amf'
] as const

export type EncoderId = (typeof ALLOWED_ENCODERS)[number]

/**
 * Returns the safest hardware/software encoder for the current platform.
 * Kept as a pure function so it can be unit-tested without touching Electron.
 */
export function defaultEncoderForPlatform(platform: string = process.platform): EncoderId {
  return platform === 'darwin' ? 'h264_videotoolbox' : 'libx264'
}

/**
 * Validates an encoder coming from the renderer. Unknown/missing values fall
 * back to a safe platform default instead of crashing ffmpeg.
 */
export function resolveEncoder(encoder: unknown, platform: string = process.platform): EncoderId {
  if (typeof encoder === 'string' && (ALLOWED_ENCODERS as readonly string[]).includes(encoder)) {
    return encoder as EncoderId
  }
  return defaultEncoderForPlatform(platform)
}

export type ResolutionId = keyof typeof RESOLUTION_DIMENSIONS

export function resolveResolution(resolution: unknown): ResolutionId {
  if (typeof resolution === 'string' && resolution in RESOLUTION_DIMENSIONS) {
    return resolution as ResolutionId
  }
  return '1080p'
}

/**
 * Clamps an arbitrary fps value into a sane constant-frame-rate range.
 */
export function resolveFps(fps: unknown): number {
  const n = Number(fps)
  if (!Number.isFinite(n)) return 30
  return Math.min(120, Math.max(1, Math.round(n)))
}

let recordingStream: PassThrough | null = null
let ffmpegProcess: ffmpeg.FfmpegCommand | null = null
let currentResolve: ((value: RecordingResult) => void) | null = null
let currentReject: ((reason?: Error) => void) | null = null
let recordingOwnerContentsId: number | null = null
let isAborted = false
let isQuitting = false
let onRecordingAborted: (() => void) | null = null
let quitTimer: NodeJS.Timeout | null = null
let stopGuardTimer: NodeJS.Timeout | null = null

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

function cleanup(): void {
  recordingStream = null
  ffmpegProcess = null
  currentResolve = null
  currentReject = null
  recordingOwnerContentsId = null
  isAborted = false
  isQuitting = false
  if (quitTimer) {
    clearTimeout(quitTimer)
    quitTimer = null
  }
  if (stopGuardTimer) {
    clearTimeout(stopGuardTimer)
    stopGuardTimer = null
  }
}

/**
 * Generates a collision-free file name for the recording. Uses a millisecond
 * timestamp plus a numeric suffix so two recordings started in the same second
 * never overwrite each other.
 */
function buildUniqueFileName(folder: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const base = `Recording-${stamp}`
  let candidate = `${base}.mov`
  let counter = 1
  while (
    fs.existsSync(path.join(folder, candidate)) ||
    fs.existsSync(path.join(folder, `${candidate}.tmp`))
  ) {
    candidate = `${base}-${counter}.mov`
    counter++
  }
  return candidate
}

/**
 * Moves the finished temp file into place. Falls back to copy+delete when a
 * plain rename fails (e.g. target already open on Windows).
 */
function finalizeTempFile(tempPath: string, filePath: string): string {
  try {
    fs.renameSync(tempPath, filePath)
    return filePath
  } catch (renameErr) {
    console.error('Failed to rename temp recording file, falling back to copy:', renameErr)
  }
  try {
    fs.copyFileSync(tempPath, filePath)
    fs.rmSync(tempPath, { force: true })
    return filePath
  } catch (copyErr) {
    console.error('Failed to copy temp recording file; keeping temp file:', copyErr)
    return tempPath
  }
}

export function setupRecordingIPC(): void {
  app.on('before-quit', (event) => {
    if (!recordingStream || recordingStream.writableEnded) {
      isQuitting = true
      return
    }
    event.preventDefault()
    isQuitting = true
    isAborted = true
    recordingStream.end()

    // Safety net: never leave the app in a zombie state if ffmpeg refuses to
    // finish after the stream has ended.
    if (quitTimer) clearTimeout(quitTimer)
    quitTimer = setTimeout(() => {
      try {
        ffmpegProcess?.kill('SIGKILL')
      } catch (err) {
        console.warn('Failed to kill ffmpeg during quit:', err)
      }
      cleanup()
      try {
        app.exit(0)
      } catch {
        /* app.exit unavailable in tests */
      }
    }, 5000)
    if (typeof quitTimer.unref === 'function') quitTimer.unref()
  })

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
      payload: {
        encoder?: unknown
        resolution?: unknown
        fps?: unknown
        systemAudioVolume?: unknown
        microphoneAudioVolume?: unknown
      } = {}
    ) => {
      if (recordingStream || ffmpegProcess) {
        console.warn('recording-start ignored: a recording is already in progress')
        return false
      }

      const resolvedEncoder = resolveEncoder(payload?.encoder)
      const resolvedResolution = resolveResolution(payload?.resolution)
      const resolvedFps = resolveFps(payload?.fps)
      const dims = RESOLUTION_DIMENSIONS[resolvedResolution]
      const targetBitrate = RESOLUTION_BITRATES[resolvedResolution]

      recordingStream = new PassThrough({ highWaterMark: 8 * 1024 * 1024 })
      // Never let a stream error crash the main process.
      recordingStream.on('error', (err) => {
        console.error('Recording stream error:', err)
      })
      recordingOwnerContentsId = event.sender.id
      isAborted = false
      isQuitting = false

      let videosFolder: string
      try {
        videosFolder = getRecordingTargetFolder()
      } catch (err) {
        console.error('Failed to resolve a writable recording folder:', err)
        cleanup()
        return false
      }
      const fileName = buildUniqueFileName(videosFolder)
      const filePath = path.join(videosFolder, fileName)
      const tempPath = filePath + '.tmp'

      const vf = `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=bilinear:out_color_matrix=bt709:out_range=tv,pad=ceil(iw/2)*2:ceil(ih/2)*2`

      // Constant frame rate is essential for accurate, seekable output. The
      // webm produced by MediaRecorder is often variable-frame-rate; forcing
      // CFR (with a matching keyframe interval) keeps audio and video in sync.
      const gop = resolvedFps * 2
      const outputOptions = [
        '-map 0:v:0',
        '-map 0:a:0?',
        '-r',
        String(resolvedFps),
        '-fps_mode',
        'cfr',
        '-g',
        String(gop),
        '-ar 48000',
        '-ac 2',
        '-f mov',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-color_primaries bt709',
        '-color_trc bt709',
        '-colorspace bt709',
        '-color_range tv',
        `-vf ${vf}`,
        `-b:v ${targetBitrate}k`,
        `-maxrate:v ${Math.round(targetBitrate * 1.5)}k`,
        `-bufsize:v ${Math.round(targetBitrate * 2)}k`
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
        .output(tempPath)
        .on('end', () => {
          const wasAborted = isAborted
          const wasQuitting = isQuitting
          const finalPath = finalizeTempFile(tempPath, filePath)
          if (currentResolve) currentResolve({ success: true, filePath: finalPath })
          cleanup()
          if (wasAborted) onRecordingAborted?.()
          if (wasQuitting) {
            try {
              app.quit()
            } catch {
              /* app.quit unavailable in tests */
            }
          }
        })
        .on('error', (err, _stdout, stderr) => {
          console.error('FFmpeg encoding error:', err, stderr)
          const code = classifyFfmpegError(stderr ?? '')
          const wasAborted = isAborted
          const wasQuitting = isQuitting
          try {
            fs.rmSync(tempPath, { force: true })
          } catch (rmErr) {
            console.warn('Failed to remove temp recording file:', rmErr)
          }
          if (currentReject) currentReject(err)
          cleanup()
          if (wasAborted) {
            onRecordingAborted?.()
          } else {
            BrowserWindow.getAllWindows().forEach((w) => {
              w.webContents.send('stop-recording')
              w.webContents.send('recording-error', {
                code,
                message: err.message,
                stderr: stderr ?? ''
              })
            })
          }
          if (wasQuitting) {
            try {
              app.quit()
            } catch {
              /* app.quit unavailable in tests */
            }
          }
        })

      ffmpegProcess.run()
      return true
    }
  )

  ipcMain.on('recording-chunk', (_event, chunk: unknown) => {
    if (!recordingStream || recordingStream.writableEnded) return
    try {
      let buffer: Buffer | null = null
      if (chunk instanceof ArrayBuffer) {
        buffer = Buffer.from(chunk)
      } else if (ArrayBuffer.isView(chunk)) {
        const view = chunk as ArrayBufferView
        buffer = Buffer.from(view.buffer, view.byteOffset, view.byteLength)
      } else if (Buffer.isBuffer(chunk)) {
        buffer = chunk
      }
      if (!buffer || buffer.length === 0) return
      recordingStream.write(buffer)
    } catch (err) {
      console.error('Failed to write recording chunk:', err)
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

      // Guard against an ffmpeg process that never emits `end`/`error`.
      if (stopGuardTimer) clearTimeout(stopGuardTimer)
      stopGuardTimer = setTimeout(() => {
        if (currentResolve) {
          console.error('FFmpeg did not finish encoding; forcing stop')
          try {
            ffmpegProcess?.kill('SIGKILL')
          } catch (err) {
            console.warn('Failed to kill ffmpeg after timeout:', err)
          }
          if (currentReject) currentReject(new Error('FFmpeg encoding timed out'))
          cleanup()
        }
      }, 30000)
      if (typeof stopGuardTimer.unref === 'function') stopGuardTimer.unref()
    })
  })
}
