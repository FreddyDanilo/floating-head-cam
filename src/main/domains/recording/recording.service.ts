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

export function setupRecordingIPC(): void {
  app.on('web-contents-created', (_event, contents) => {
    const maybeAbort = (): void => abortIfOrphaned(contents.id)
    contents.on('destroyed', maybeAbort)
    contents.on('render-process-gone', maybeAbort)
    contents.on('did-navigate', maybeAbort)
  })

  ipcMain.handle('recording-start', (event, { encoder }: { encoder?: string } = {}) => {
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
    const fileName = `Recording-${new Date().toISOString().replace(/:/g, '-')}.mp4`
    const filePath = path.join(videosFolder, fileName)

    ffmpegProcess = ffmpeg(recordingStream)
      .inputFormat('webm')
      .videoCodec(encoder || 'libx264')
      .outputOptions(['-pix_fmt yuv420p'])
      .audioCodec('aac')
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
          // Tell a still-alive renderer to stop instead of ghost-recording
          BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('stop-recording'))
        }
      })

    ffmpegProcess.run()
    return true
  })

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
