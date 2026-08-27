import { useEffect } from 'react'

export type CameraShape = 'circle' | 'square' | 'vertical-rect' | 'horizontal-rect'

type TrayAction =
  | { type: 'set-device'; payload: string }
  | { type: 'set-shape'; payload: CameraShape }
  | { type: 'set-mirror'; payload: boolean }
  | { type: 'set-size-index'; payload: number }
  | { type: 'set-rounding'; payload: number }
  | { type: 'set-always-on-top'; payload: boolean }
  | { type: 'set-border-gradient'; payload: string }
  | { type: 'set-border-width'; payload: number }
  | { type: 'set-border-animated'; payload: boolean }
  | { type: 'set-language'; payload: 'en' | 'pt' }
  | { type: 'set-sidebar-width'; payload: number }
  | { type: 'set-sidebar-position'; payload: string }

interface ResetStatePayload {
  state: {
    isMirrored: boolean
    shape: CameraShape
    sizeIndex: number
    rounding: number
    alwaysOnTop: boolean
    language?: 'en' | 'pt'
    borderGradient?: string
    borderWidth?: number
    isBorderAnimated?: boolean
  }
}

export type TrayEventHandlers = {
  setSelectedDeviceId: (id: string) => void
  setShape: (s: CameraShape) => void
  setIsMirrored: (v: boolean) => void
  setSizeIndex: (i: number) => void
  setRounding: (r: number) => void
  setAlwaysOnTop: (v: boolean) => void
  setPowerOn: (v: boolean) => void
  setBorderGradient: (g: string) => void
  setBorderWidth: (w: number) => void
  setIsBorderAnimated: (v: boolean) => void
  setLanguage: (lang: 'en' | 'pt') => void
  setSidebarWidthPercentage: (w: number) => void
  setSidebarPosition: (p: string) => void
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
  setLanguage,
  setSidebarWidthPercentage,
  setSidebarPosition,
  applySize,
  sizeIndex,
  shape
}: TrayEventHandlers): void {
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return

    const handleTrayAction = (_event: unknown, action: TrayAction): void => {
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
        case 'set-language':
          setLanguage(action.payload)
          break
        case 'set-sidebar-width':
          setSidebarWidthPercentage(action.payload)
          break
        case 'set-sidebar-position':
          setSidebarPosition(action.payload)
          break
      }
    }

    const handleReset = (_event: unknown, payload: ResetStatePayload): void => {
      setIsMirrored(payload.state.isMirrored)
      setShape(payload.state.shape)
      setSizeIndex(payload.state.sizeIndex)
      setRounding(payload.state.rounding)
      setAlwaysOnTop(payload.state.alwaysOnTop)

      if (payload.state.language) {
        setLanguage(payload.state.language)
      }

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

    const handlePower = (_event: unknown, state: boolean): void => setPowerOn(state)

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
    setBorderWidth,
    setIsBorderAnimated,
    setLanguage,
    setSidebarWidthPercentage,
    setSidebarPosition
  ])
}
