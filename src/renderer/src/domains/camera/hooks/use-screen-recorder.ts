import { useState, useCallback, useRef, useEffect } from 'react'

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
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

      for (let i = 3; i > 0; i--) {
        setCountdown(i)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setCountdown(null)

      const parsedFps = parseInt(fps, 10) || 30
      const height = resolution === '1080p' ? 1080 : 720
      const width = resolution === '1080p' ? 1920 : 1280

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

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' })
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer()
          ipc.send('recording-chunk', buffer)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        await ipc.invoke('recording-stop')
      }

      ipc.send('recording-start')
      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

    } catch (e) {
      console.error('Failed to start recording', e)
      setCountdown(null)
    }
  }, [])

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleToggleRecording = (_e: any, { resolution, fps }: { resolution: string, fps: string }) => {
      setIsRecording((prev) => {
        if (prev) {
          stopRecording()
        } else {
          startRecording(resolution, fps)
        }
        return !prev 
      })
    }

    ipc.on('toggle-recording', handleToggleRecording)
    return () => {
      ipc.removeAllListeners('toggle-recording')
    }
  }, [startRecording, stopRecording])

  return { isRecording, countdown, startRecording, stopRecording }
}
