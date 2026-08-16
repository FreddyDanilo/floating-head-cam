import { useEffect } from 'react'

type TrayEventHandlers = {
  setSelectedDeviceId: (id: string) => void
  setShape: (s: any) => void
  setIsMirrored: (v: boolean) => void
  setSizeIndex: (i: number) => void
  setRounding: (r: number) => void
  setAlwaysOnTop: (v: boolean) => void
  setPowerOn: (v: boolean) => void
  setBorderGradient: (g: string) => void
  setBorderWidth: (w: number) => void
  setIsBorderAnimated: (v: boolean) => void
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
  setBorderGradient,
  setBorderWidth,
  setIsBorderAnimated,
  applySize,
  sizeIndex,
  shape
}: TrayEventHandlers): void {
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleTrayAction = (_event: any, action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'set-device':
          setSelectedDeviceId(action.payload)
          break
        case 'set-shape':
          setShape(action.payload)
          applySize(sizeIndex, action.payload)
          break
        case 'set-mirror':
          setIsMirrored(action.payload)
          break
        case 'set-size-index':
          setSizeIndex(action.payload)
          applySize(action.payload, shape)
          break
        case 'set-rounding':
          setRounding(action.payload)
          break
        case 'set-always-on-top':
          setAlwaysOnTop(action.payload)
          break
        case 'set-border-gradient':
          setBorderGradient(action.payload)
          break
        case 'set-border-width':
          setBorderWidth(action.payload)
          break
        case 'set-border-animated':
          setIsBorderAnimated(action.payload)
          break
      }
    }

    const handleReset = (_event: any, payload: { state: any }) => {
      setIsMirrored(payload.state.isMirrored)
      setShape(payload.state.shape)
      setSizeIndex(payload.state.sizeIndex)
      setRounding(payload.state.rounding)
      setAlwaysOnTop(payload.state.alwaysOnTop)

      if (payload.state.borderGradient) {
        setBorderGradient(payload.state.borderGradient)
      }
      if (payload.state.borderWidth !== undefined) {
        setBorderWidth(payload.state.borderWidth)
      }
      if (payload.state.isBorderAnimated !== undefined) {
        setIsBorderAnimated(payload.state.isBorderAnimated)
      }

      applySize(payload.state.sizeIndex, payload.state.shape)
    }

    const handlePower = (_event: any, state: boolean) => setPowerOn(state)

    ipc.on('tray-action', handleTrayAction)
    ipc.on('settings-reset', handleReset)
    ipc.on('power-state', handlePower)

    return () => {
      ipc.removeAllListeners('tray-action')
      ipc.removeAllListeners('settings-reset')
      ipc.removeAllListeners('power-state')
    }
  }, [
    applySize,
    sizeIndex,
    shape,
    setSelectedDeviceId,
    setShape,
    setIsMirrored,
    setSizeIndex,
    setRounding,
    setAlwaysOnTop,
    setPowerOn,
    setBorderGradient,
    setBorderWidth
  ])
}
