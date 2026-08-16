import { ipcMain, app } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import { PassThrough } from 'stream'
import { currentState } from '../settings/settings.service'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

let recordingStream: PassThrough | null = null
let ffmpegProcess: ffmpeg.FfmpegCommand | null = null
let currentResolve: ((value: any) => void) | null = null
let currentReject: ((reason?: any) => void) | null = null

export function setupRecordingIPC() {
  ipcMain.on('recording-start', () => {
    recordingStream = new PassThrough()

    const videosFolder = app.getPath('videos')
    const fileName = `Recording-${new Date().toISOString().replace(/:/g, '-')}.mkv`
    const filePath = path.join(videosFolder, fileName)

    ffmpegProcess = ffmpeg(recordingStream)
      .inputFormat('webm')
      .videoCodec(currentState.recordingEncoder || 'libx264')
      .audioCodec('aac')
      .outputOptions(['-b:v 12M', '-maxrate 16M', '-bufsize 24M', '-pix_fmt yuv420p'])
      .output(filePath)
      .on('end', () => {
        if (currentResolve) currentResolve({ success: true, filePath })
        cleanup()
      })
      .on('error', (err) => {
        if (currentReject) currentReject(err)
        cleanup()
      })

    ffmpegProcess.run()
  })

  ipcMain.on('recording-chunk', (_, chunk: ArrayBuffer) => {
    if (recordingStream) {
      recordingStream.write(Buffer.from(chunk))
    }
  })

  ipcMain.handle('recording-stop', async () => {
    if (!recordingStream || !ffmpegProcess) {
      return { success: false, error: 'No recording in progress' }
    }

    return new Promise((resolve, reject) => {
      currentResolve = resolve
      currentReject = reject
      recordingStream!.end()
    })
  })
}

function cleanup() {
  recordingStream = null
  ffmpegProcess = null
  currentResolve = null
  currentReject = null
}
