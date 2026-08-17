import { useState, useCallback, useRef, useEffect } from 'react'

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<any[]>([])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(
    async (
      resolution: string,
      fps: string,
      encoder: string,
      systemAudioVolume: number,
      microphoneAudioVolume: number,
      selectedMicrophoneId: string
    ) => {
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
        if (resolution === '1080p') {
          width = 1920
          height = 1080
        } else if (resolution === '1440p') {
          width = 2560
          height = 1440
        } else if (resolution === '2160p') {
          width = 3840
          height = 2160
        }

        const desktopStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: parsedFps }
          },
          audio: true
        })

        const micStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            ...(selectedMicrophoneId && selectedMicrophoneId !== 'default'
              ? { deviceId: { exact: selectedMicrophoneId } }
              : {}),
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })

        const audioCtx = new AudioContext()
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }
        audioContextRef.current = audioCtx
        const dest = audioCtx.createMediaStreamDestination()

        const dummyGain = audioCtx.createGain()
        dummyGain.gain.value = 0
        dummyGain.connect(audioCtx.destination)

        audioNodesRef.current = []
        audioNodesRef.current.push(dest, dummyGain)

        if (desktopStream.getAudioTracks().length > 0) {
          const systemSource = audioCtx.createMediaStreamSource(
            new MediaStream([desktopStream.getAudioTracks()[0]])
          )
          const systemGain = audioCtx.createGain()
          systemGain.gain.value = Number(systemAudioVolume ?? 50) / 100
          systemSource.connect(systemGain).connect(dest)
          systemGain.connect(dummyGain)
          audioNodesRef.current.push(systemSource, systemGain)
        } else {
          console.warn('No system audio track found in desktopStream')
        }

        if (micStream.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(
            new MediaStream([micStream.getAudioTracks()[0]])
          )
          const micGain = audioCtx.createGain()
          micGain.gain.value = Number(microphoneAudioVolume ?? 100) / 100
          micSource.connect(micGain).connect(dest)
          micGain.connect(dummyGain)
          audioNodesRef.current.push(micSource, micGain)
        } else {
          console.warn('No microphone audio track found in micStream')
        }

        const mixedStream = new MediaStream([
          ...desktopStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ])

        let mimeType = 'video/webm; codecs=vp9,opus'
        if (encoder === 'libx264' || encoder === 'h264_videotoolbox') {
          // In Chromium, h264 is requested via avc1 codec
          mimeType = 'video/webm; codecs=avc1,opus'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm; codecs=h264,opus'
          }
        } else if (encoder === 'libvpx') {
          mimeType = 'video/webm; codecs=vp8,opus'
        }

        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn(`MimeType ${mimeType} not supported, falling back to default webm`)
          mimeType = 'video/webm'
        }

        const mediaRecorder = new MediaRecorder(mixedStream, {
          mimeType,
          videoBitsPerSecond: 8000000
        })

        let chunkPromiseChain = Promise.resolve()

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunkPromiseChain = chunkPromiseChain.then(async () => {
              const buffer = await e.data.arrayBuffer()
              ipc.send('recording-chunk', buffer)
            })
          }
        }

        mediaRecorder.onstop = async () => {
          desktopStream.getTracks().forEach((track) => track.stop())
          micStream.getTracks().forEach((track) => track.stop())
          mixedStream.getTracks().forEach((track) => track.stop())
          if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
          }
          await chunkPromiseChain
          ipc.send('recording-stopped')
          await ipc.invoke('recording-stop')
        }

        ipc.send('recording-start', { encoder })
        mediaRecorder.start(1000)
        mediaRecorderRef.current = mediaRecorder

        ipc.send('recording-started')
      } catch (e) {
        console.error('Failed to start recording', e)
      }
    },
    []
  )

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleStartRecording = (
      _e: any,
      {
        resolution,
        fps,
        encoder,
        systemAudioVolume,
        microphoneAudioVolume,
        selectedMicrophoneId
      }: {
        resolution: string
        fps: string
        encoder: string
        systemAudioVolume: number
        microphoneAudioVolume: number
        selectedMicrophoneId: string
      }
    ) => {
      startRecording(
        resolution,
        fps,
        encoder,
        systemAudioVolume,
        microphoneAudioVolume,
        selectedMicrophoneId
      )
    }

    const handleStopRecording = () => {
      stopRecording()
    }

    const handleSyncSetting = (_e: any, { key, value }: { key: string; value: any }) => {
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
