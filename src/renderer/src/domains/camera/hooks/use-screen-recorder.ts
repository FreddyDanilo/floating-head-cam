import { useState, useCallback, useRef, useEffect } from 'react'

const RESOLUTION_BITRATES: Record<string, number> = {
  '720p': 5000000,
  '1080p': 8000000,
  '1440p': 14000000,
  '2160p': 24000000
}

export function isLinuxPlatform(): boolean {
  return /Linux/.test(navigator.userAgent) && !/Android|Chromium.*cros/i.test(navigator.userAgent)
}

export async function getLinuxSystemAudioStream(): Promise<MediaStream | null> {
  if (!isLinuxPlatform()) return null
  if (!navigator.mediaDevices?.enumerateDevices) return null

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const monitor = devices.find(
      (d) => d.kind === 'audioinput' && /monitor|loopback/i.test(d.label)
    )
    if (!monitor) return null
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: monitor.deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
  } catch (e) {
    console.warn('Linux system audio capture unavailable:', e)
    return null
  }
}

export async function getMacOSVirtualAudioStream(): Promise<MediaStream | null> {
  if (navigator.userAgent.indexOf('Mac') === -1) return null
  try {
    const allDevices = await navigator.mediaDevices.enumerateDevices()
    const virtualDevice = allDevices.find(
      (d) => d.kind === 'audioinput' && /blackhole|loopback|soundflower|virtual/i.test(d.label)
    )
    if (!virtualDevice) return null
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: virtualDevice.deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
  } catch (err) {
    console.warn('System audio via virtual device unavailable:', err)
    return null
  }
}

interface StartRecordingPayload {
  resolution: string
  fps: string
  encoder: string
  systemAudioVolume: number
  microphoneAudioVolume: number
  selectedMicrophoneId: string
}

type StartRecordingFn = (payload: StartRecordingPayload) => Promise<void>

export function useScreenRecorder(): {
  isRecording: boolean
  screenPermissionDenied: boolean
  micPermissionDenied: boolean
  startRecording: StartRecordingFn
  stopRecording: () => void
} {
  const [isRecording, setIsRecording] = useState(false)
  const [screenPermissionDenied, setScreenPermissionDenied] = useState(false)
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<AudioNode[]>([])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(
    async ({
      resolution,
      fps,
      encoder,
      systemAudioVolume,
      microphoneAudioVolume,
      selectedMicrophoneId
    }: StartRecordingPayload): Promise<void> => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.warn('startRecording ignored: a recording is already in progress')
        return
      }

      let desktopStream: MediaStream | null = null
      let micStream: MediaStream | null = null
      let systemAudioStream: MediaStream | null = null

      try {
        const ipc = window.electron?.ipcRenderer
        if (!ipc) throw new Error('No IPC found')

        const permission = await ipc.invoke('check-screen-permission')
        if (permission !== 'granted') {
          setScreenPermissionDenied(true)
          throw new Error('Screen permission denied')
        }
        setScreenPermissionDenied(false)

        const micPermission = await ipc.invoke('check-media-permission', 'microphone')
        if (micPermission !== 'granted') {
          setMicPermissionDenied(true)
          throw new Error('Microphone permission denied')
        }
        setMicPermissionDenied(false)

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

        desktopStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: parsedFps },
            displaySurface: 'monitor'
          } as MediaTrackConstraints,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })

        const videoTrack = desktopStream.getVideoTracks()[0]
        if (videoTrack) {
          try {
            await videoTrack.applyConstraints({
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: parsedFps }
            })
          } catch (constraintErr) {
            console.warn('applyConstraints failed (will rely on FFmpeg scale):', constraintErr)
          }
        }

        const micConstraintsBase: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }

        const useExactDevice = selectedMicrophoneId && selectedMicrophoneId !== 'default'

        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: useExactDevice
              ? { ...micConstraintsBase, deviceId: { exact: selectedMicrophoneId } }
              : micConstraintsBase
          })
        } catch (micErr) {
          if (useExactDevice) {
            try {
              micStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: micConstraintsBase
              })
            } catch (retryErr) {
              console.warn('Microphone unavailable after retry, recording without mic:', retryErr)
              micStream = null
            }
          } else {
            console.warn('Microphone unavailable, recording without mic:', micErr)
            micStream = null
          }
        }

        const desktopAudioTracks = desktopStream.getAudioTracks()

        if (desktopAudioTracks.length === 0) {
          if (isLinuxPlatform()) {
            systemAudioStream = await getLinuxSystemAudioStream()
          } else if (navigator.userAgent.indexOf('Mac') !== -1) {
            systemAudioStream = await getMacOSVirtualAudioStream()
          }
        }

        const audioCtx = new AudioContext()
        if (audioCtx.state === 'suspended') {
          try {
            await Promise.race([
              audioCtx.resume(),
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('AudioContext resume timeout')), 3000)
              )
            ])
          } catch (resumeErr) {
            console.warn('AudioContext resume failed or timed out:', resumeErr)
          }
        }
        audioContextRef.current = audioCtx
        const dest = audioCtx.createMediaStreamDestination()

        const keepAliveOsc = audioCtx.createOscillator()
        const keepAliveGain = audioCtx.createGain()
        keepAliveGain.gain.value = 0
        keepAliveOsc.connect(keepAliveGain)
        keepAliveGain.connect(dest)
        keepAliveOsc.start()

        audioNodesRef.current = [dest, keepAliveOsc, keepAliveGain]

        function safeGain(value: unknown, fallback: number): number {
          const n = Number(value)
          return isFinite(n) && n >= 0 && n <= 100 ? n / 100 : fallback / 100
        }

        const systemTracks =
          desktopAudioTracks.length > 0
            ? desktopAudioTracks
            : (systemAudioStream?.getAudioTracks() ?? [])

        if (systemTracks.length > 0) {
          const systemSource = audioCtx.createMediaStreamSource(new MediaStream([systemTracks[0]]))
          const systemGain = audioCtx.createGain()
          systemGain.gain.value = safeGain(systemAudioVolume, 50)
          systemSource.connect(systemGain)
          systemGain.connect(dest)
          audioNodesRef.current.push(systemSource, systemGain)
        } else {
          console.warn(
            'No system audio available. On macOS install BlackHole or grant Screen Recording to the Electron binary.'
          )
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(
            new MediaStream([micStream.getAudioTracks()[0]])
          )
          const micGain = audioCtx.createGain()
          micGain.gain.value = safeGain(microphoneAudioVolume, 100)
          micSource.connect(micGain)
          micGain.connect(dest)
          audioNodesRef.current.push(micSource, micGain)
        } else {
          console.warn('No microphone audio track found')
        }

        const mixedStream = new MediaStream([
          ...desktopStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ])

        let mimeType = 'video/webm; codecs=vp9,opus'
        if (encoder === 'libx264' || encoder === 'h264_videotoolbox') {
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
          videoBitsPerSecond: RESOLUTION_BITRATES[resolution] ?? 8000000
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
          desktopStream?.getTracks().forEach((track) => track.stop())
          micStream?.getTracks().forEach((track) => track.stop())
          systemAudioStream?.getTracks().forEach((track) => track.stop())
          mixedStream.getTracks().forEach((track) => track.stop())
          if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
          }
          audioNodesRef.current = []
          await chunkPromiseChain
          ipc.send('recording-stopped')
          try {
            await ipc.invoke('recording-stop')
          } catch (err) {
            console.error('Failed to finalize recording file:', err)
          }
          mediaRecorderRef.current = null
        }

        const started = await ipc.invoke('recording-start', {
          encoder,
          resolution,
          fps,
          systemAudioVolume,
          microphoneAudioVolume
        })
        if (!started) {
          throw new Error('Recording could not start (destination folder unavailable?)')
        }
        mediaRecorder.start(2000)
        mediaRecorderRef.current = mediaRecorder

        ipc.send('recording-started')
      } catch (e) {
        console.error('Failed to start recording', e)
        desktopStream?.getTracks().forEach((track) => track.stop())
        micStream?.getTracks().forEach((track) => track.stop())
        systemAudioStream?.getTracks().forEach((track) => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        audioNodesRef.current = []
      }
    },
    []
  )

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleStartRecording = (
      _e: unknown,
      {
        resolution,
        fps,
        encoder,
        systemAudioVolume,
        microphoneAudioVolume,
        selectedMicrophoneId
      }: StartRecordingPayload
    ): void => {
      startRecording({
        resolution,
        fps,
        encoder,
        systemAudioVolume,
        microphoneAudioVolume,
        selectedMicrophoneId
      })
    }

    const handleStopRecording = (): void => {
      stopRecording()
    }

    const handleSyncSetting = (
      _e: unknown,
      { key, value }: { key: string; value: unknown }
    ): void => {
      if (key === 'isRecording') {
        setIsRecording(value === true)
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

  return { isRecording, screenPermissionDenied, micPermissionDenied, startRecording, stopRecording }
}
