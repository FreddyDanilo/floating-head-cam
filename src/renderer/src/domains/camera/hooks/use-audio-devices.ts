import { useEffect, useState } from 'react'

export function useAudioDevices(): {
  devices: MediaDeviceInfo[]
  permissionError: boolean
} {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [permissionError, setPermissionError] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true

    const getDevices = async (): Promise<void> => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        tempStream.getTracks().forEach((track) => track.stop())

        const all = await navigator.mediaDevices.enumerateDevices()
        const audioDevices = all.filter((d) => d.kind === 'audioinput')

        if (!isMounted) return

        setDevices(audioDevices)
        setPermissionError(false)
      } catch (err) {
        const errName = (err as { name?: string })?.name
        if (errName === 'NotAllowedError' || errName === 'NotFoundError') {
          setPermissionError(true)
        }
        console.error('Error getting audio devices:', err)
      }
    }

    getDevices()

    navigator.mediaDevices.addEventListener('devicechange', getDevices)

    return () => {
      isMounted = false
      navigator.mediaDevices.removeEventListener('devicechange', getDevices)
    }
  }, [])

  return { devices, permissionError }
}
