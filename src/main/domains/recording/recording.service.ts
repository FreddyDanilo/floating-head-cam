import { ipcMain, app } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import { PassThrough } from 'stream'


if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

let recordingStream: PassThrough | null = null
let ffmpegProcess: ffmpeg.FfmpegCommand | null = null
let currentResolve: ((value: any) => void) | null = null
let currentReject: ((reason?: any) => void) | null = null

export function setupRecordingIPC() {
  ipcMain.on('recording-start', (_, { encoder }: { encoder?: string } = {}) => {
    recordingStream = new PassThrough()

    const videosFolder = app.getPath('videos')
    const fileName = `Recording-${new Date().toISOString().replace(/:/g, '-')}.mp4`
    const filePath = path.join(videosFolder, fileName)

    ffmpegProcess = ffmpeg(recordingStream)
      .inputFormat('webm')
      .videoCodec(encoder || 'libx264')
      .outputOptions(['-pix_fmt yuv420p'])
      .audioCodec('aac')
      .output(filePath)
      .on('end', () => {
        if (currentResolve) currentResolve({ success: true, filePath })
        cleanup()
      })
      .on('error', (err, _stdout, stderr) => {
        console.error('FFmpeg encoding error:', err, stderr)
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
