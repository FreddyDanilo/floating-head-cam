import { useState, useCallback, useRef, useEffect } from 'react'

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async (resolution: string, fps: string, systemAudioVolume: number, microphoneAudioVolume: number) => {
    try {
      const ipc = window.electron?.ipcRenderer
      if (!ipc) throw new Error('No IPC found')

      const permission = await ipc.invoke('check-screen-permission')
      if (permission !== 'granted') throw new Error('Screen permission denied')

      const micPermission = await ipc.invoke('check-media-permission', 'microphone')
      if (micPermission !== 'granted') throw new Error('Microphone permission denied')

      const parsedFps = parseInt(fps, 10) || 30
      let width = 1280
      let height = 720
      if (resolution === '1080p') { width = 1920; height = 1080 }
      else if (resolution === '1440p') { width = 2560; height = 1440 }
      else if (resolution === '2160p') { width = 3840; height = 2160 }

      // 1. Get Desktop Stream (Screen + System Audio) natively via getDisplayMedia
      const desktopStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: parsedFps } },
        audio: true
      })

      // 2. Get Microphone Stream
      const micStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      })

      // 3. Setup Audio Mixing
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const dest = audioCtx.createMediaStreamDestination()

      // System Audio routing
      if (desktopStream.getAudioTracks().length > 0) {
        const systemSource = audioCtx.createMediaStreamSource(new MediaStream([desktopStream.getAudioTracks()[0]]))
        const systemGain = audioCtx.createGain()
        systemGain.gain.value = systemAudioVolume / 100
        systemSource.connect(systemGain).connect(dest)
      }

      // Mic Audio routing
      if (micStream.getAudioTracks().length > 0) {
        const micSource = audioCtx.createMediaStreamSource(new MediaStream([micStream.getAudioTracks()[0]]))
        const micGain = audioCtx.createGain()
        micGain.gain.value = microphoneAudioVolume / 100
        micSource.connect(micGain).connect(dest)
      }

      // 4. Combine Video and Mixed Audio
      const mixedStream = new MediaStream([
        ...desktopStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ])

      const mediaRecorder = new MediaRecorder(mixedStream, { 
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 16000000 // 16 Mbps
      })
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer()
          ipc.send('recording-chunk', buffer)
        }
      }

      mediaRecorder.onstop = async () => {
        desktopStream.getTracks().forEach(track => track.stop())
        micStream.getTracks().forEach(track => track.stop())
        mixedStream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
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

    const handleStartRecording = (_e: any, { resolution, fps, systemAudioVolume, microphoneAudioVolume }: { resolution: string, fps: string, systemAudioVolume: number, microphoneAudioVolume: number }) => {
      startRecording(resolution, fps, systemAudioVolume, microphoneAudioVolume)
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
