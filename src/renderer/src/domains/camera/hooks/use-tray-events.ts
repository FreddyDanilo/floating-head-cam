import { useEffect } from 'react'

type TrayEventHandlers = {
  setSelectedDeviceId: (id: string) => void
  setShape: (s: any) => void
  setIsMirrored: (v: boolean) => void
  setSizeIndex: (i: number) => void
  setRounding: (r: number) => void
  setAlwaysOnTop: (v: boolean) => void
  setPowerOn: (v: boolean) => void
  applySize: (index: number, shape: string) => void
  sizeIndex: number
  shape: string
}

export function useTrayEvents({
  setSelectedDeviceId,
  setShape,
  setIsMirrored,
  setSizeIndex,
  setRounding,
  setAlwaysOnTop,
  setPowerOn,
  applySize,
  sizeIndex,
  shape
}: TrayEventHandlers) {
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleTrayAction = (_event: any, action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'set-device':      setSelectedDeviceId(action.payload); break
        case 'set-shape':       setShape(action.payload); applySize(sizeIndex, action.payload); break
        case 'set-mirror':      setIsMirrored(action.payload); break
        case 'set-size-index':  setSizeIndex(action.payload); applySize(action.payload, shape); break
        case 'set-rounding':    setRounding(action.payload); break
        case 'set-always-on-top': setAlwaysOnTop(action.payload); break
      }
    }

    const handleReset = (_event: any, payload: { state: any }) => {
      setIsMirrored(payload.state.isMirrored)
      setShape(payload.state.shape)
      setSizeIndex(payload.state.sizeIndex)
      setRounding(payload.state.rounding)
      setAlwaysOnTop(payload.state.alwaysOnTop)
      applySize(payload.state.sizeIndex, payload.state.shape)
    }

    const handlePower = (_event: any, state: boolean) => setPowerOn(state)

    // @ts-ignore
    ipc.on('tray-action', handleTrayAction)
    // @ts-ignore
    ipc.on('settings-reset', handleReset)
    // @ts-ignore
    ipc.on('power-state', handlePower)

    return () => {
      // @ts-ignore
      ipc.removeAllListeners('tray-action')
      // @ts-ignore
      ipc.removeAllListeners('settings-reset')
      // @ts-ignore
      ipc.removeAllListeners('power-state')
    }
  }, [applySize, sizeIndex, shape])
}
