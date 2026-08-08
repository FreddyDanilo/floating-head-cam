import { useEffect, useState } from 'react'

export function useCameraDevices(): {
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<string>>
} {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  useEffect(() => {
    let isMounted = true

    const getDevices = async (): Promise<void> => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        tempStream.getTracks().forEach((track) => track.stop())

        const all = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = all.filter((d) => d.kind === 'videoinput')

        if (!isMounted) return

        setDevices(videoDevices)

        setSelectedDeviceId((prev) => {
          const stillExists = videoDevices.some((d) => d.deviceId === prev)
          if (stillExists && prev !== '') return prev
          return videoDevices[0]?.deviceId || ''
        })
      } catch (err) {
        console.error('Error getting media devices:', err)
      }
    }

    getDevices()

    navigator.mediaDevices.addEventListener('devicechange', getDevices)

    return () => {
      isMounted = false
      navigator.mediaDevices.removeEventListener('devicechange', getDevices)
    }
  }, [])

  return { devices, selectedDeviceId, setSelectedDeviceId }
}
