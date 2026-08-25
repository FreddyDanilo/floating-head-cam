import React, { useCallback, useEffect, useState, useRef } from 'react'
import { getGradient } from '../../../../shared/colors'
import { useCameraDevices } from './hooks/use-camera-devices'
import { useCameraStream } from './hooks/use-camera-stream'
import { useTrayEvents } from './hooks/use-tray-events'
import { PermissionErrorOverlay } from './components/permission-error-overlay'
import { ScreenPermissionErrorOverlay } from './components/screen-permission-error-overlay'
import { MicPermissionErrorOverlay } from './components/mic-permission-error-overlay'

const SIZES = [300, 450, 600]

export function CameraPage(): React.JSX.Element {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    permissionError: devicesError,
    refreshDevices
  } = useCameraDevices()
  const [streamRetryNonce, setStreamRetryNonce] = useState(0)
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
  const [language, setLanguage] = useState<'en' | 'pt'>('en')

  const [prevGradient, setPrevGradient] = useState<string>('none')
  const [currentGradient, setCurrentGradient] = useState<string>('none')
  const [fade, setFade] = useState(false)

  const [screenPermissionDenied, setScreenPermissionDenied] = useState(false)
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)

  const { videoRef, permissionError: streamError } = useCameraStream(
    selectedDeviceId,
    powerOn,
    streamRetryNonce
  )
  const hasPermissionError = devicesError || streamError

  const handleDetectionRetry = useCallback((): void => {
    refreshDevices()
    setStreamRetryNonce((n) => n + 1)
  }, [refreshDevices])

  const [cameraWidth, setCameraWidth] = useState<number>(300)
  const [cameraHeight, setCameraHeight] = useState<number>(300)
  const [cameraX, setCameraX] = useState<number>(0)
  const [cameraY, setCameraY] = useState<number>(0)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const isAnimating = useRef(false)
  const mousePos = useRef({ x: 0, y: 0 })
  const lastHoverState = useRef(false)
  const cameraRect = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    cameraRect.current = { x: cameraX, y: cameraY, w: cameraWidth, h: cameraHeight }
  }, [cameraX, cameraY, cameraWidth, cameraHeight])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleGlobalMouseMove)

    const interval = setInterval(() => {
      if (isAnimating.current || isDragging.current) return
      
      const rect = cameraRect.current
      const pos = mousePos.current
      
      // If window isn't initialized yet
      if (rect.w === 0) return

      const isOverCamera = 
        pos.x >= rect.x && 
        pos.x <= rect.x + rect.w && 
        pos.y >= rect.y && 
        pos.y <= rect.y + rect.h
      
      if (isOverCamera !== lastHoverState.current) {
        lastHoverState.current = isOverCamera
        if (window.electron) {
          if (isOverCamera) {
            window.electron.ipcRenderer.send('set-ignore-mouse-events', false)
          } else {
            window.electron.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
          }
        }
      }
    }, 50)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      clearInterval(interval)
    }
  }, [])

  const applySize = useCallback((index: number, currentShape: string) => {
    isAnimating.current = true
    setTimeout(() => {
      isAnimating.current = false
    }, 450)
    if (index === 4) {
      setCameraWidth(window.innerWidth)
      setCameraHeight(window.innerHeight)
      setCameraX(0)
      setCameraY(0)
      return
    }
    if (index === 3) {
      const w = Math.round(window.innerWidth * 0.25)
      setCameraWidth(w)
      setCameraHeight(window.innerHeight)
      setCameraX(window.innerWidth - w)
      setCameraY(0)
      return
    }
    const size = SIZES[index]
    if (!size) return
    let w = size
    let h = size
    if (currentShape === 'vertical-rect') {
      w = Math.round(size * (3 / 4))
      h = size
    } else if (currentShape === 'horizontal-rect') {
      w = size
      h = Math.round(size * (9 / 16))
    }
    setCameraWidth(w)
    setCameraHeight(h)
    
    // Boundary check
    setCameraX(prev => Math.min(Math.max(0, prev), window.innerWidth - w))
    setCameraY(prev => Math.min(Math.max(0, prev), window.innerHeight - h))
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

        if (state.x !== undefined) setCameraX(state.x)
        if (state.y !== undefined) setCameraY(state.y)

        if (state.borderGradient) {
          setBorderGradient(state.borderGradient)
          setPrevGradient(state.borderGradient)
          setCurrentGradient(state.borderGradient)
        }
        if (state.isBorderAnimated !== undefined) {
          setIsBorderAnimated(state.isBorderAnimated)
        }
        if (state.borderWidth !== undefined) setBorderWidth(state.borderWidth)
        if (state.language) setLanguage(state.language)

        setInitialized(true)
        applySize(state.sizeIndex, state.shape)
      })
    }
  }, [applySize])

  if (borderGradient !== currentGradient) {
    setPrevGradient(currentGradient)
    setCurrentGradient(borderGradient)
    setFade(true)
  }

  useEffect(() => {
    if (!fade) return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFade(false)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [fade])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragOffset.current = {
      x: e.clientX - cameraX,
      y: e.clientY - cameraY
    }
  }, [cameraX, cameraY])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      setCameraX(Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - cameraWidth))
      setCameraY(Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - cameraHeight))
    }
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        if (window.electron) {
          window.electron.ipcRenderer.send('sync-tray', { x: cameraX, y: cameraY })
        }
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [cameraX, cameraY, cameraWidth, cameraHeight])

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
    setLanguage,
    applySize,
    sizeIndex,
    shape
  })

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    const handlePermissionDenied = (_e: unknown, payload: { screen: boolean; mic: boolean }) => {
      setScreenPermissionDenied(payload.screen)
      setMicPermissionDenied(payload.mic)
    }
    const handleCameraPosition = (_e: unknown, pos: string) => {
      let newX = cameraX
      let newY = cameraY
      switch (pos) {
        case 'top-left':
          newX = 0; newY = 0; break;
        case 'top-right':
          newX = window.innerWidth - cameraWidth; newY = 0; break;
        case 'bottom-left':
          newX = 0; newY = window.innerHeight - cameraHeight; break;
        case 'bottom-right':
          newX = window.innerWidth - cameraWidth; newY = window.innerHeight - cameraHeight; break;
        case 'left-middle':
          newX = 0; newY = (window.innerHeight - cameraHeight) / 2; break;
        case 'right-middle':
          newX = window.innerWidth - cameraWidth; newY = (window.innerHeight - cameraHeight) / 2; break;
        case 'center':
          newX = (window.innerWidth - cameraWidth) / 2; newY = (window.innerHeight - cameraHeight) / 2; break;
      }
      setCameraX(newX)
      setCameraY(newY)
      if (window.electron) {
        window.electron.ipcRenderer.send('sync-tray', { x: newX, y: newY })
      }
    }
    ipc.on('recording-permission-denied', handlePermissionDenied)
    ipc.on('set-camera-position', handleCameraPosition)
    return () => {
      ipc.removeAllListeners('recording-permission-denied')
      ipc.removeAllListeners('set-camera-position')
    }
  }, [cameraX, cameraY, cameraWidth, cameraHeight])

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
      if (e.key === '5') {
        setSizeIndex(4)
        applySize(4, shape)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [applySize, shape])

  if (!initialized) return <div className="app-container" />

  const computedRadius = sizeIndex === 4 ? '0' : shape === 'circle' ? '50%' : `${rounding}px`

  return (
    <div style={{ width: '100vw', height: '100vh', pointerEvents: 'none', position: 'relative' }}>
      <div
        className="app-container"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: `${cameraX}px`,
          top: `${cameraY}px`,
          width: `${cameraWidth}px`,
          height: `${cameraHeight}px`,
          pointerEvents: 'auto',
          padding: sizeIndex === 4 || borderGradient === 'none' ? '0px' : `${borderWidth}px`,
          borderRadius: computedRadius,
          WebkitMaskImage: sizeIndex === 4 ? 'none' : shape === 'circle' ? '-webkit-radial-gradient(white, black)' : 'none',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isDragging.current ? 'none' : 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), top 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease',
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
            borderRadius: sizeIndex === 4 ? '0' : shape === 'circle' ? '50%' : `${Math.max(0, rounding - borderWidth)}px`,
            transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
            display: hasPermissionError ? 'none' : 'block'
          }}
        />
        {hasPermissionError && (
          <PermissionErrorOverlay language={language} onRetry={handleDetectionRetry} />
        )}
        {screenPermissionDenied && !hasPermissionError && (
          <ScreenPermissionErrorOverlay language={language} />
        )}
        {micPermissionDenied && !hasPermissionError && !screenPermissionDenied && (
          <MicPermissionErrorOverlay language={language} />
        )}
      </div>
    </div>
  )
}
