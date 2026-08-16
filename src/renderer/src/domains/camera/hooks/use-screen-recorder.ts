import { useState, useCallback, useRef, useEffect } from 'react'

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async (resolution: string, fps: string) => {
    try {
      const ipc = window.electron?.ipcRenderer
      if (!ipc) throw new Error('No IPC found')

      const permission = await ipc.invoke('check-screen-permission')
      if (permission !== 'granted') {
        throw new Error('Screen permission denied')
      }

      const sources = await ipc.invoke('get-screen-sources')
      if (sources.length === 0) throw new Error('No screen sources found')

      const primarySource = sources[0]

      const parsedFps = parseInt(fps, 10) || 30
      let width = 1280
      let height = 720
      if (resolution === '1080p') { width = 1920; height = 1080 }
      else if (resolution === '1440p') { width = 2560; height = 1440 }
      else if (resolution === '2160p') { width = 3840; height = 2160 }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primarySource.id,
            minWidth: width,
            maxWidth: width,
            minHeight: height,
            maxHeight: height,
            minFrameRate: parsedFps,
            maxFrameRate: parsedFps
          }
        } as any
      })

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 16000000 // 16 Mbps for high quality capture
      })
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer()
          ipc.send('recording-chunk', buffer)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        ipc.send('recording-stopped')
        await ipc.invoke('recording-stop')
      }

      ipc.send('recording-start')
      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      
      ipc.send('recording-started')

    } catch (e) {
      console.error('Failed to start recording', e)
    }
  }, [])

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleStartRecording = (_e: any, { resolution, fps }: { resolution: string, fps: string }) => {
      startRecording(resolution, fps)
    }

    const handleStopRecording = () => {
      stopRecording()
    }
    
    const handleSyncSetting = (_e: any, { key, value }: { key: string, value: any }) => {
      if (key === 'isRecording') {
        setIsRecording(value)
      }
    }

    ipc.on('start-recording', handleStartRecording)
    ipc.on('stop-recording', handleStopRecording)
    ipc.on('sync-setting', handleSyncSetting)
    
    return () => {
      ipc.removeAllListeners('start-recording')
      ipc.removeAllListeners('stop-recording')
      ipc.removeAllListeners('sync-setting')
    }
  }, [startRecording, stopRecording])

  return { isRecording, startRecording, stopRecording }
}
