import React, { useCallback, useEffect, useState } from 'react'
import { getGradient, GradientKey } from '../../../../shared/colors'
import { useCameraDevices } from './hooks/use-camera-devices'
import { useCameraStream } from './hooks/use-camera-stream'
import { useTrayEvents } from './hooks/use-tray-events'

const SIZES = [300, 450, 600]
export function CameraPage(): React.JSX.Element {
  const { devices, selectedDeviceId, setSelectedDeviceId } = useCameraDevices()
  const [isMirrored, setIsMirrored] = useState(true)
  const [shape, setShape] = useState<'circle' | 'square' | 'vertical-rect' | 'horizontal-rect'>(
    'circle'
  )
  const [sizeIndex, setSizeIndex] = useState<number>(0)
  const [rounding, setRounding] = useState<number>(24)
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true)
  const [powerOn, setPowerOn] = useState<boolean>(false)
  const [initialized, setInitialized] = useState(false)

  const [borderGradient, setBorderGradient] = useState<GradientKey>('instagram')
  const [borderWidth, setBorderWidth] = useState<number>(4)

  const { videoRef } = useCameraStream(selectedDeviceId, powerOn)
  const applySize = useCallback((index: number, currentShape: string) => {
    const size = SIZES[index]
    if (!size || !window.electron) return
    let width = size
    let height = size
    if (currentShape === 'vertical-rect') {
      width = Math.round(size * (3 / 4))
      height = size
    } else if (currentShape === 'horizontal-rect') {
      width = size
      height = Math.round(size * (9 / 16))
    }
    window.electron.ipcRenderer.send('resize-window', { width, height })
  }, [])
  useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer.invoke('get-initial-state').then((state) => {
        setIsMirrored(state.isMirrored)
        setShape(state.shape)
        setSizeIndex(state.sizeIndex)
        setRounding(state.rounding)
        setAlwaysOnTop(state.alwaysOnTop)
        setPowerOn(state.isCameraOn)

        console.log(state.borderWidth)

        if (state.borderGradient) setBorderGradient(state.borderGradient)
        if (state.borderWidth !== undefined) setBorderWidth(state.borderWidth)

        setInitialized(true)
        applySize(state.sizeIndex, state.shape)
      })
    }
  }, [])

  useTrayEvents({
    setSelectedDeviceId,
    setShape,
    setIsMirrored,
    setSizeIndex,
    setRounding,
    setAlwaysOnTop,
    setPowerOn,
    setBorderGradient,
    applySize,
    sizeIndex,
    shape
  })
  useEffect(() => {
    if (window.electron && initialized) {
      window.electron.ipcRenderer.send('sync-tray', {
        devices: devices.map((d) => ({ deviceId: d.deviceId, label: d.label })),
        selectedDeviceId,
        isMirrored,
        shape,
        borderGradient,
        borderWidth,
        sizeIndex,
        rounding,
        alwaysOnTop
      })
    }
  }, [
    devices,
    selectedDeviceId,
    isMirrored,
    shape,
    borderGradient,
    borderWidth,
    sizeIndex,
    rounding,
    alwaysOnTop,
    initialized
  ])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === '1') {
        setSizeIndex(0)
        applySize(0, shape)
      }
      if (e.key === '2') {
        setSizeIndex(1)
        applySize(1, shape)
      }
      if (e.key === '3') {
        setSizeIndex(2)
        applySize(2, shape)
      }
      // Troca rápida de gradientes via teclado
      if (e.key.toLowerCase() === 'g') setBorderGradient('instagram')
      if (e.key.toLowerCase() === 'h') setBorderGradient('neon')
      if (e.key.toLowerCase() === 'j') setBorderGradient('cyberpunk')
      if (e.key.toLowerCase() === 'k') setBorderGradient('none')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [applySize, shape])
  if (!initialized) return <div className="app-container" />

  const computedRadius = shape === 'circle' ? '50%' : `${rounding}px`
  return (
    <div
      className="app-container"
      style={{
        background: getGradient(borderGradient),
        padding: `${borderWidth}px`,
        borderRadius: computedRadius,
        WebkitMaskImage: shape === 'circle' ? '-webkit-radial-gradient(white, black)' : 'none',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-view"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: shape === 'circle' ? '50%' : `${Math.max(0, rounding - borderWidth)}px`,
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)'
        }}
      />
    </div>
  )
}
