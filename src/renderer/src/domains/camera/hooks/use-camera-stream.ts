import { useEffect, useRef } from 'react'
export function useCameraStream(selectedDeviceId: string, powerOn: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!selectedDeviceId || !powerOn) return
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } },
          audio: false
        })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        console.error('Error starting video stream:', err)
      }
    }
    startStream()
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [selectedDeviceId, powerOn])
  return { videoRef }
}
