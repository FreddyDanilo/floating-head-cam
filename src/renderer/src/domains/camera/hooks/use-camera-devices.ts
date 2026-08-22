import { useCallback, useEffect, useRef, useState } from 'react'

// A freshly hot-plugged webcam can take a moment to register with Chromium,
// which may also cache an empty device list until something triggers a rescan.
const HOTPLUG_RETRIES = 4
const HOTPLUG_RETRY_DELAY_MS = 600
const ERROR_POLL_INTERVAL_MS = 2500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useCameraDevices(): {
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<string>>
  permissionError: boolean
  refreshDevices: () => void
} {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [permissionError, setPermissionError] = useState<boolean>(false)
  const inFlightRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyDevices = useCallback((videoDevices: MediaDeviceInfo[]): void => {
    setDevices(videoDevices)
    setSelectedDeviceId((prev) => {
      const stillExists = videoDevices.some((d) => d.deviceId === prev)
      if (stillExists && prev !== '') return prev
      return videoDevices[0]?.deviceId || ''
    })
    setPermissionError(videoDevices.length === 0)
  }, [])

  const getDevices = useCallback(
    async (withHotplugRetries: boolean): Promise<void> => {
      if (inFlightRef.current || !mountedRef.current) return
      inFlightRef.current = true
      try {
        let lastError: unknown = null
        const attempts = withHotplugRetries ? HOTPLUG_RETRIES : 1
        for (let attempt = 0; attempt < attempts; attempt++) {
          try {
            // Opening a temp stream grants label access and confirms the
            // camera is actually usable (not just listed).
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
            tempStream.getTracks().forEach((track) => track.stop())
            lastError = null
            break
          } catch (err) {
            lastError = err
            const errName = (err as { name?: string })?.name
            const isMissing = errName === 'NotFoundError' || errName === 'DevicesNotFoundError'
            if (!isMissing || !mountedRef.current) break
            await sleep(HOTPLUG_RETRY_DELAY_MS)
          }
        }
        if (lastError) throw lastError

        const all = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = all.filter((d) => d.kind === 'videoinput')
        if (!mountedRef.current) return
        applyDevices(videoDevices)
      } catch (err) {
        if (!mountedRef.current) return
        setPermissionError(true)
        console.error('Error getting media devices:', err)
      } finally {
        inFlightRef.current = false
      }
    },
    [applyDevices]
  )

  const refreshDevices = useCallback((): void => {
    void getDevices(true)
  }, [getDevices])

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void getDevices(false)
    }, 0)

    const handleDeviceChange = (): void => {
      void getDevices(true)
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      clearTimeout(initialTimer)
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [getDevices])

  // devicechange is unreliable on some platforms; poll while the camera is
  // missing so plugging one in later self-heals without an app restart.
  useEffect(() => {
    if (!permissionError) return
    const pollTimer = setInterval(() => {
      void getDevices(true)
    }, ERROR_POLL_INTERVAL_MS)

    return () => clearInterval(pollTimer)
  }, [permissionError, getDevices])

  return { devices, selectedDeviceId, setSelectedDeviceId, permissionError, refreshDevices }
}
