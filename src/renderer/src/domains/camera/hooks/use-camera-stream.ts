import { useEffect, useRef, useState } from 'react'

export function useCameraStream(
  selectedDeviceId: string,
  powerOn: boolean
): {
  videoRef: React.RefObject<HTMLVideoElement | null>
  permissionError: boolean
} {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [permissionError, setPermissionError] = useState(false)

  useEffect(() => {
    const videoElement = videoRef.current

    if (!selectedDeviceId || !powerOn) {
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoElement.srcObject = null
      }
      return
    }

    let isActive = true
    let streamInstance: MediaStream | null = null

    const startStream = async (): Promise<void> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16 / 9 }
          },
          audio: false
        })

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamInstance = stream
        if (videoElement) {
          videoElement.srcObject = stream
        }
        setPermissionError(false)
      } catch (err) {
        const errName = (err as { name?: string })?.name
        if (errName === 'NotAllowedError' || errName === 'NotFoundError') {
          setPermissionError(true)
        }
        console.error('Error starting video stream:', err)
      }
    }

    startStream()

    return () => {
      isActive = false
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop())
      }
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoElement.srcObject = null
      }
    }
  }, [selectedDeviceId, powerOn])

  return { videoRef, permissionError }
}
