import { useState, useEffect } from 'react'

export type PermissionStatus = 'granted' | 'denied' | 'restricted' | 'unknown' | 'not-determined'

export function usePermissions(): {
  cameraPermission: PermissionStatus
  microphonePermission: PermissionStatus
  screenPermission: PermissionStatus
  checkPermissions: () => Promise<void>
} {
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('unknown')
  const [microphonePermission, setMicrophonePermission] = useState<PermissionStatus>('unknown')
  const [screenPermission, setScreenPermission] = useState<PermissionStatus>('unknown')

  const checkPermissions = async (): Promise<void> => {
    try {
      const camStatus = await window.electron.ipcRenderer.invoke('check-media-permission', 'camera')
      setCameraPermission(camStatus)

      const micStatus = await window.electron.ipcRenderer.invoke(
        'check-media-permission',
        'microphone'
      )
      setMicrophonePermission(micStatus)

      const screenStatus = await window.electron.ipcRenderer.invoke('check-screen-permission')
      setScreenPermission(screenStatus)
    } catch (err) {
      console.error('Failed to check permissions via IPC', err)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const camStatus = await window.electron.ipcRenderer.invoke(
          'check-media-permission',
          'camera'
        )
        if (!cancelled) setCameraPermission(camStatus)

        const micStatus = await window.electron.ipcRenderer.invoke(
          'check-media-permission',
          'microphone'
        )
        if (!cancelled) setMicrophonePermission(micStatus)

        const screenStatus = await window.electron.ipcRenderer.invoke('check-screen-permission')
        if (!cancelled) setScreenPermission(screenStatus)
      } catch (err) {
        console.error('Failed to check permissions via IPC', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { cameraPermission, microphonePermission, screenPermission, checkPermissions }
}
