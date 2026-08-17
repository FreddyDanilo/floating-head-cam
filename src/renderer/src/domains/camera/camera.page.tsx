import React, { useCallback, useEffect, useState } from 'react'
import { getGradient } from '../../../../shared/colors'
import { useCameraDevices } from './hooks/use-camera-devices'
import { useCameraStream } from './hooks/use-camera-stream'
import { useTrayEvents } from './hooks/use-tray-events'
import { PermissionErrorOverlay } from './components/permission-error-overlay'
import { useScreenRecorder } from './hooks/use-screen-recorder'

const SIZES = [300, 450, 600]

export function CameraPage(): React.JSX.Element {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    permissionError: devicesError
  } = useCameraDevices()
  const [isMirrored, setIsMirrored] = useState(true)
  const [shape, setShape] = useState<'circle' | 'square' | 'vertical-rect' | 'horizontal-rect'>(
    'circle'
  )
  const [sizeIndex, setSizeIndex] = useState<number>(0)
  const [rounding, setRounding] = useState<number>(24)
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true)
  const [powerOn, setPowerOn] = useState<boolean>(false)
  const [initialized, setInitialized] = useState(false)

  const [borderGradient, setBorderGradient] = useState<string>('none')
  const [borderWidth, setBorderWidth] = useState<number>(4)
  const [isBorderAnimated, setIsBorderAnimated] = useState<boolean>(false)

  const [prevGradient, setPrevGradient] = useState<string>('none')
  const [currentGradient, setCurrentGradient] = useState<string>('none')
  const [fade, setFade] = useState(false)

  useScreenRecorder()

  const { videoRef, permissionError: streamError } = useCameraStream(selectedDeviceId, powerOn)
  const hasPermissionError = devicesError || streamError

  const applySize = useCallback((index: number, currentShape: string) => {
    if (!window.electron) return
    if (index === 3) {
      const screenWidth = window.screen.availWidth || window.screen.width
      const screenHeight = window.screen.availHeight || window.screen.height
      const width = Math.round(screenWidth * 0.2)
      const height = screenHeight
      window.electron.ipcRenderer.send('resize-window', { width, height, position: 'right' })
      return
    }
    const size = SIZES[index]
    if (!size) return
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

        if (state.borderGradient) {
          setBorderGradient(state.borderGradient)
          setPrevGradient(state.borderGradient)
          setCurrentGradient(state.borderGradient)
        }
        if (state.isBorderAnimated !== undefined) {
          setIsBorderAnimated(state.isBorderAnimated)
        }
        if (state.borderWidth !== undefined) setBorderWidth(state.borderWidth)

        setInitialized(true)
        applySize(state.sizeIndex, state.shape)
      })
    }
  }, [])

  useEffect(() => {
    if (borderGradient !== currentGradient) {
      setPrevGradient(currentGradient)
      setCurrentGradient(borderGradient)
      setFade(true)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFade(false)
        })
      })
    }
  }, [borderGradient, currentGradient])

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
    setIsBorderAnimated,
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
        isBorderAnimated,
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
    isBorderAnimated,
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
      if (e.key === '4') {
        setSizeIndex(3)
        applySize(3, shape)
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
        position: 'relative',
        padding: borderGradient === 'none' ? '0px' : `${borderWidth}px`,
        borderRadius: computedRadius,
        WebkitMaskImage: shape === 'circle' ? '-webkit-radial-gradient(white, black)' : 'none',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease',
        zIndex: 1
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getGradient(prevGradient, isBorderAnimated),
          borderRadius: 'inherit',
          opacity: fade || currentGradient !== 'none' ? 1 : 0,
          transition: fade ? 'none' : 'opacity 0.4s ease',
          animation: isBorderAnimated ? 'spinBorder 20s linear infinite' : 'none',
          zIndex: -2
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getGradient(currentGradient, isBorderAnimated),
          borderRadius: 'inherit',
          opacity: fade ? 0 : 1,
          transition: fade ? 'none' : 'opacity 0.4s ease',
          animation: isBorderAnimated ? 'spinBorder 20s linear infinite' : 'none',
          zIndex: -1
        }}
      />
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
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
          display: hasPermissionError ? 'none' : 'block'
        }}
      />
      {hasPermissionError && <PermissionErrorOverlay />}
    </div>
  )
}
