import { useState, useEffect, useCallback } from 'react'

export type PermissionStatus = 'granted' | 'denied' | 'restricted' | 'unknown' | 'not-determined'

function normalizeStatus(value: unknown): PermissionStatus {
  if (
    value === 'granted' ||
    value === 'denied' ||
    value === 'restricted' ||
    value === 'not-determined' ||
    value === 'unknown'
  ) {
    return value
  }
  return 'unknown'
}

/**
 * Tracks the OS permission state for camera, microphone and screen capture.
 *
 * `checkPermissions()` performs an *active* check (macOS may show a native
 * consent prompt) and is meant to be called from a user gesture - e.g. the
 * "Try Again" button. The initial load only *reads* the current status so
 * simply rendering an overlay never triggers a permission dialog.
 */
export function usePermissions(): {
  cameraPermission: PermissionStatus
  microphonePermission: PermissionStatus
  screenPermission: PermissionStatus
  checkPermissions: () => Promise<void>
} {
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('unknown')
  const [microphonePermission, setMicrophonePermission] = useState<PermissionStatus>('unknown')
  const [screenPermission, setScreenPermission] = useState<PermissionStatus>('unknown')

  const checkPermissions = useCallback(async (): Promise<void> => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    try {
      const [camStatus, micStatus, screenStatus] = await Promise.all([
        ipc.invoke('check-media-permission', 'camera'),
        ipc.invoke('check-media-permission', 'microphone'),
        ipc.invoke('check-screen-permission')
      ])
      setCameraPermission(normalizeStatus(camStatus))
      setMicrophonePermission(normalizeStatus(micStatus))
      setScreenPermission(normalizeStatus(screenStatus))
    } catch (err) {
      console.error('Failed to check permissions via IPC', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    void (async () => {
      try {
        const [camStatus, micStatus, screenStatus] = await Promise.all([
          ipc.invoke('get-media-permission-status', 'camera'),
          ipc.invoke('get-media-permission-status', 'microphone'),
          ipc.invoke('get-screen-permission-status')
        ])
        if (cancelled) return
        setCameraPermission(normalizeStatus(camStatus))
        setMicrophonePermission(normalizeStatus(micStatus))
        setScreenPermission(normalizeStatus(screenStatus))
      } catch (err) {
        console.error('Failed to read permission status via IPC', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { cameraPermission, microphonePermission, screenPermission, checkPermissions }
}
