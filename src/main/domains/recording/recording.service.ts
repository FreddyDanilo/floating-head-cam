import { ipcMain, dialog, BrowserWindow } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'
import path from 'path'
import os from 'os'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

let activeTempFile: string | null = null
let writeStream: fs.WriteStream | null = null

export function setupRecordingIPC() {
  ipcMain.on('recording-start', () => {
    activeTempFile = path.join(os.tmpdir(), `floating-head-recording-${Date.now()}.webm`)
    writeStream = fs.createWriteStream(activeTempFile)
  })

  ipcMain.on('recording-chunk', (_, chunk: ArrayBuffer) => {
    if (writeStream) {
      writeStream.write(Buffer.from(chunk))
    }
  })

  ipcMain.handle('recording-stop', async (event) => {
    if (writeStream) {
      writeStream.end()
      writeStream = null
    }

    if (!activeTempFile || !fs.existsSync(activeTempFile)) {
      return { success: false, error: 'No recording found' }
    }

    const window = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(window || BrowserWindow.getAllWindows()[0], {
      title: 'Save Screen Recording',
      defaultPath: `Recording-${new Date().toISOString().replace(/:/g, '-')}.mp4`,
      filters: [{ name: 'Movies', extensions: ['mp4'] }]
    })

    if (canceled || !filePath) {
      try {
        fs.unlinkSync(activeTempFile)
      } catch(e) {}
      activeTempFile = null
      return { success: false, canceled: true }
    }

    return new Promise((resolve, reject) => {
      ffmpeg(activeTempFile!)
        .output(filePath)
        .videoCodec('libx264')
        .outputOptions(['-preset veryfast', '-crf 23', '-pix_fmt yuv420p'])
        .on('end', () => {
          if (activeTempFile) {
            try {
              fs.unlinkSync(activeTempFile)
            } catch(e) {}
            activeTempFile = null
          }
          resolve({ success: true, filePath })
        })
        .on('error', (err) => {
          reject(err)
        })
        .run()
    })
  })
}
