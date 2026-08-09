import React, { useCallback, useEffect, useState } from 'react'
import { Shape } from '../../../../renderer/src/types/shepe'
import { getGradient, GradientKey } from '../../../../shared/colors'
import { filterKey, getFilferCamera } from '../../../../shared/filter-camera'
import { useCameraDevices } from './hooks/use-camera-devices'
import { useCameraStream } from './hooks/use-camera-stream'
import { useTrayEvents } from './hooks/use-tray-events'

const SIZES = [300, 450, 600]

export function CameraPage(): React.JSX.Element {
  const { devices, selectedDeviceId, setSelectedDeviceId } = useCameraDevices()
  const [isMirrored, setIsMirrored] = useState(true)
  const [shape, setShape] = useState<Shape>('circle')
  const [sizeIndex, setSizeIndex] = useState<number>(0)
  const [rounding, setRounding] = useState<number>(24)
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true)
  const [powerOn, setPowerOn] = useState<boolean>(false)
  const [initialized, setInitialized] = useState(false)

  const [borderGradient, setBorderGradient] = useState<GradientKey>('none')
  const [borderWidth, setBorderWidth] = useState<number>(4)

  const [filterCamera, setFilterCamera] = useState<filterKey>('none')

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

        if (state.borderGradient) setBorderGradient(state.borderGradient)
        if (state.borderWidth !== undefined) setBorderWidth(state.borderWidth)
        if (state.filterCamera) setFilterCamera(state.filterCamera)

        setInitialized(true)
        applySize(state.sizeIndex, state.shape)
      })
    }
  }, [applySize])

  useTrayEvents({
    setSelectedDeviceId,
    setShape,
    setIsMirrored,
    setSizeIndex,
    setRounding,
    setAlwaysOnTop,
    setPowerOn,
    setBorderGradient,
    setBorderWidth,
    setFilterCamera,
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
        padding: borderGradient === 'none' ? '0px' : `${borderWidth}px`,
        borderRadius: computedRadius,
        WebkitMaskImage: shape === 'circle' ? '-webkit-radial-gradient(white, black)' : 'none',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition:
          'background 0.4s ease, border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease'
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
          filter: getFilferCamera(filterCamera),
          borderRadius: shape === 'circle' ? '50%' : `${Math.max(0, rounding - borderWidth)}px`,
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)'
        }}
      />
    </div>
  )
}
