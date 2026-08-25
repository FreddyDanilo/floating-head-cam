import React, { useEffect } from 'react'
import { useScreenRecorder } from './hooks/use-screen-recorder'

export function RecordingWorkerPage(): React.JSX.Element {
  const { screenPermissionDenied, micPermissionDenied } = useScreenRecorder()

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    if (screenPermissionDenied || micPermissionDenied) {
      ipc.send('recording-permission-denied', {
        screen: screenPermissionDenied,
        mic: micPermissionDenied
      })
    }
  }, [screenPermissionDenied, micPermissionDenied])

  return (
    <div style={{ display: 'none' }}>
      <h1>Recording Worker</h1>
      <p>This hidden window handles screen recording to avoid animation stuttering.</p>
    </div>
  )
}
