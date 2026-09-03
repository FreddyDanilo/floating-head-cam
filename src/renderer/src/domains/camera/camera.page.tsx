import React, { useCallback, useEffect, useState, useRef } from 'react'
import { getGradient } from '../../../../shared/colors'
import { useCameraDevices } from './hooks/use-camera-devices'
import { useCameraStream } from './hooks/use-camera-stream'
import { useTrayEvents } from './hooks/use-tray-events'
import { PermissionErrorOverlay } from './components/permission-error-overlay'
import { ScreenPermissionErrorOverlay } from './components/screen-permission-error-overlay'
import { MicPermissionErrorOverlay } from './components/mic-permission-error-overlay'
import { RecordingErrorOverlay } from './components/recording-error-overlay'

const SIZES = [300, 450, 600]

const isLinux =
  typeof navigator !== 'undefined' &&
  (navigator.platform.toLowerCase().includes('linux') ||
    navigator.userAgent.toLowerCase().includes('linux'))

const isWindows =
  typeof navigator !== 'undefined' &&
  (navigator.platform.toLowerCase().includes('win') ||
    navigator.userAgent.toLowerCase().includes('windows'))

function getScreenWidth(): number {
  if (isWindows) return window.screen?.availWidth ?? window.innerWidth
  return window.screen?.width ?? window.innerWidth
}

function getScreenHeight(): number {
  if (isWindows) return window.screen?.availHeight ?? window.innerHeight
  return window.screen?.height ?? window.innerHeight
}

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
  const [sidebarWidthPercentage, setSidebarWidthPercentage] = useState<number>(35)
  const [sidebarPosition, setSidebarPosition] = useState<string>('right')
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
  const [recordingError, setRecordingError] = useState<{ code: string } | null>(null)

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
  const currentDragPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const isAnimating = useRef(false)
  const cameraRect = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    cameraRect.current = { x: cameraX, y: cameraY, w: cameraWidth, h: cameraHeight }
  }, [cameraX, cameraY, cameraWidth, cameraHeight])

  useEffect(() => {
    // Polling of mouse events removed in favor of onMouseEnter/onMouseLeave for better performance
  }, [])

  const applySize = useCallback(
    (index: number, currentShape: string) => {
      isAnimating.current = true
      setTimeout(() => {
        isAnimating.current = false
      }, 450)

      const sw = getScreenWidth()
      const sh = getScreenHeight()

      if (index === 4) {
        const w = isLinux ? sw : window.innerWidth
        const h = isLinux ? sh : window.innerHeight
        setCameraWidth(w)
        setCameraHeight(h)
        setCameraX(0)
        setCameraY(0)
        if (isLinux && window.electron) {
          window.electron.ipcRenderer.send('resize-camera-window', w, h)
          window.electron.ipcRenderer.send('move-camera-window', 0, 0)
        }
        return
      }
      if (index === 3) {
        const pct = sidebarWidthPercentage / 100
        const w = isLinux ? Math.round(sw * pct) : Math.round(window.innerWidth * pct)
        const h = isLinux ? sh : window.innerHeight
        const x = sidebarPosition === 'left' ? 0 : isLinux ? sw - w : window.innerWidth - w
        setCameraWidth(w)
        setCameraHeight(h)
        setCameraX(x)
        setCameraY(0)
        if (isLinux && window.electron) {
          window.electron.ipcRenderer.send('resize-camera-window', w, h)
          window.electron.ipcRenderer.send('move-camera-window', x, 0)
        }
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

      const hasBorder = index !== 4 && borderGradient !== 'none'
      const totalW = hasBorder ? w + borderWidth * 2 : w
      const totalH = hasBorder ? h + borderWidth * 2 : h

      setCameraWidth(w)
      setCameraHeight(h)

      if (isLinux) {
        if (window.electron) {
          window.electron.ipcRenderer.send('resize-camera-window', totalW, totalH)
        }
      } else {
        setCameraX((prev) => Math.min(Math.max(0, prev), window.innerWidth - w))
        setCameraY((prev) => Math.min(Math.max(0, prev), window.innerHeight - h))
      }
    },
    [borderGradient, borderWidth, sidebarWidthPercentage, sidebarPosition]
  )

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
        if (state.sidebarWidthPercentage !== undefined)
          setSidebarWidthPercentage(state.sidebarWidthPercentage as number)
        if (state.sidebarPosition !== undefined) setSidebarPosition(state.sidebarPosition as string)

        setInitialized(true)
      })
    }
  }, [])

  useEffect(() => {
    if (initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applySize(sizeIndex, shape)
    }
  }, [initialized, sizeIndex, shape, applySize, sidebarWidthPercentage, sidebarPosition])

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      if (containerRef.current) {
        containerRef.current.style.transition = 'none'
      }
      currentDragPos.current = { x: cameraX, y: cameraY }
      if (isLinux) {
        dragOffset.current = { x: e.clientX, y: e.clientY }
      } else {
        dragOffset.current = {
          x: e.clientX - cameraX,
          y: e.clientY - cameraY
        }
      }
    },
    [cameraX, cameraY]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return

      if (isLinux) {
        const newX = e.screenX - dragOffset.current.x
        const newY = e.screenY - dragOffset.current.y
        currentDragPos.current = { x: newX, y: newY }
        if (window.electron) {
          window.electron.ipcRenderer.send('move-camera-window', newX, newY)
        }
      } else {
        const newX = Math.min(
          Math.max(0, e.clientX - dragOffset.current.x),
          window.innerWidth - cameraWidth
        )
        const newY = Math.min(
          Math.max(0, e.clientY - dragOffset.current.y),
          window.innerHeight - cameraHeight
        )
        currentDragPos.current = { x: newX, y: newY }
        if (containerRef.current) {
          containerRef.current.style.left = `${newX}px`
          containerRef.current.style.top = `${newY}px`
        }
      }
    }
    const handleMouseUp = (): void => {
      if (isDragging.current) {
        isDragging.current = false
        if (!isLinux && containerRef.current) {
          containerRef.current.style.transition =
            'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), top 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease'
        }
        setCameraX(currentDragPos.current.x)
        setCameraY(currentDragPos.current.y)
        if (window.electron) {
          window.electron.ipcRenderer.send('sync-tray', {
            x: currentDragPos.current.x,
            y: currentDragPos.current.y
          })
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
    setSidebarWidthPercentage,
    setSidebarPosition,
    applySize,
    sizeIndex,
    shape
  })

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    const handlePermissionDenied = (
      _e: unknown,
      payload: { screen: boolean; mic: boolean }
    ): void => {
      setScreenPermissionDenied(payload.screen)
      setMicPermissionDenied(payload.mic)
    }
    const handleCameraPosition = (_e: unknown, pos: string): void => {
      const sw = getScreenWidth()
      const sh = getScreenHeight()
      let newX = cameraX
      let newY = cameraY
      switch (pos) {
        case 'top-left':
          newX = 0
          newY = 0
          break
        case 'top-right':
          newX = sw - cameraWidth
          newY = 0
          break
        case 'bottom-left':
          newX = 0
          newY = sh - cameraHeight
          break
        case 'bottom-right':
          newX = sw - cameraWidth
          newY = sh - cameraHeight
          break
        case 'left-middle':
          newX = 0
          newY = (sh - cameraHeight) / 2
          break
        case 'right-middle':
          newX = sw - cameraWidth
          newY = (sh - cameraHeight) / 2
          break
        case 'center':
          newX = (sw - cameraWidth) / 2
          newY = (sh - cameraHeight) / 2
          break
      }
      setCameraX(newX)
      setCameraY(newY)
      if (isLinux && window.electron) {
        window.electron.ipcRenderer.send('move-camera-window', newX, newY)
      }
      if (window.electron) {
        window.electron.ipcRenderer.send('sync-tray', { x: newX, y: newY })
      }
    }
    const handleScreenChanged = (): void => {
      applySize(sizeIndex, shape)
    }
    ipc.on('recording-permission-denied', handlePermissionDenied)
    ipc.on('set-camera-position', handleCameraPosition)
    ipc.on('screen-changed', handleScreenChanged)
    return () => {
      ipc.removeAllListeners('recording-permission-denied')
      ipc.removeAllListeners('set-camera-position')
      ipc.removeAllListeners('screen-changed')
    }
  }, [cameraX, cameraY, cameraWidth, cameraHeight, applySize, sizeIndex, shape])

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    const handleRecordingError = (_e: unknown, payload: { code: string }): void => {
      setRecordingError({ code: payload.code })
    }
    const handleRecordingStarted = (): void => {
      setRecordingError(null)
    }
    ipc.on('recording-error', handleRecordingError)
    ipc.on('recording-started', handleRecordingStarted)
    return () => {
      ipc.removeAllListeners('recording-error')
      ipc.removeAllListeners('recording-started')
    }
  }, [])

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

  if (isLinux) {
    return (
      <div
        ref={containerRef}
        className="app-container"
        onMouseDown={handleMouseDown}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          padding: sizeIndex === 4 || borderGradient === 'none' ? '0px' : `${borderWidth}px`,
          borderRadius: computedRadius,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: powerOn ? 1 : 0,
          transition: 'opacity 0.3s ease',
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
            borderRadius:
              sizeIndex === 4
                ? '0'
                : shape === 'circle'
                  ? '50%'
                  : `${Math.max(0, rounding - borderWidth)}px`,
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
        {recordingError && !hasPermissionError && !screenPermissionDenied && !micPermissionDenied && (
          <RecordingErrorOverlay
            code={recordingError.code}
            language={language}
            onDismiss={() => setRecordingError(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', pointerEvents: 'none', position: 'relative' }}>
      <div
        ref={containerRef}
        className="app-container"
        onMouseDown={handleMouseDown}
        onMouseEnter={() => {
          if (!isLinux && window.electron && !isDragging.current) {
            window.electron.ipcRenderer.send('set-ignore-mouse-events', false)
          }
        }}
        onMouseLeave={() => {
          if (!isLinux && window.electron && !isDragging.current) {
            window.electron.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
          }
        }}
        style={{
          position: 'absolute',
          left: `${cameraX}px`,
          top: `${cameraY}px`,
          width: `${cameraWidth}px`,
          height: `${cameraHeight}px`,
          pointerEvents: 'auto',
          padding: sizeIndex === 4 || borderGradient === 'none' ? '0px' : `${borderWidth}px`,
          borderRadius: computedRadius,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: powerOn ? 1 : 0,
          transition:
            'opacity 0.3s ease, left 0.4s cubic-bezier(0.16, 1, 0.3, 1), top 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease',
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
            borderRadius:
              sizeIndex === 4
                ? '0'
                : shape === 'circle'
                  ? '50%'
                  : `${Math.max(0, rounding - borderWidth)}px`,
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
        {recordingError && !hasPermissionError && !screenPermissionDenied && !micPermissionDenied && (
          <RecordingErrorOverlay
            code={recordingError.code}
            language={language}
            onDismiss={() => setRecordingError(null)}
          />
        )}
      </div>
    </div>
  )
}
