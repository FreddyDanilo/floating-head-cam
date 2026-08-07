import { useEffect, useState } from 'react'
export function useCameraDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
        const all = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = all.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId)
      } catch (err) {
        console.error('Error getting media devices:', err)
      }
    }
    getDevices()
  }, [])
  return { devices, selectedDeviceId, setSelectedDeviceId }
}
