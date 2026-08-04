import React, { useEffect, useRef, useState, useCallback } from 'react'

const SIZES = [300, 450, 600]

export function Camera(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  
  const [isMirrored, setIsMirrored] = useState(true)
  const [shape, setShape] = useState<'circle' | 'square' | 'vertical-rect' | 'horizontal-rect'>('circle')
  const [sizeIndex, setSizeIndex] = useState<number>(0)
  const [rounding, setRounding] = useState<number>(24)
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true)
  const [powerOn, setPowerOn] = useState<boolean>(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer.invoke('get-initial-state').then(state => {
        setIsMirrored(state.isMirrored)
        setShape(state.shape)
        setSizeIndex(state.sizeIndex)
        setRounding(state.rounding)
        setAlwaysOnTop(state.alwaysOnTop)
        setPowerOn(state.isCameraOn)
        setInitialized(true)
        
        applySize(state.sizeIndex, state.shape)
      })
    }
  }, [])

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error('Error getting media devices:', err)
      }
    }
    getDevices()
  }, [])

  useEffect(() => {
    if (!selectedDeviceId || !powerOn) return
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } },
          audio: false
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Error starting video stream:', err)
      }
    }
    startStream()
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [selectedDeviceId, powerOn])

  const applySize = useCallback((index: number, currentShape: string) => {
    const size = SIZES[index]
    if (!size || !window.electron) return

    let width = size
    let height = size

    if (currentShape === 'vertical-rect') {
      width = Math.round(size * (3/4))
      height = size
    } else if (currentShape === 'horizontal-rect') {
      width = size
      height = Math.round(size * (9/16))
    }

    window.electron.ipcRenderer.send('resize-window', { width, height })
  }, [])

  useEffect(() => {
    if (window.electron && initialized) {
      window.electron.ipcRenderer.send('sync-tray', {
        devices: devices.map(d => ({ deviceId: d.deviceId, label: d.label })),
        selectedDeviceId,
        isMirrored,
        shape,
        sizeIndex,
        rounding,
        alwaysOnTop
      })
    }
  }, [devices, selectedDeviceId, isMirrored, shape, sizeIndex, rounding, alwaysOnTop, initialized])

  useEffect(() => {
    if (!window.electron) return

    const handleTrayAction = (_event: any, action: { type: string, payload: any }) => {
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

    const handlePower = (_event: any, state: boolean) => {
      setPowerOn(state)
    }

    // @ts-ignore
    window.electron.ipcRenderer.on('tray-action', handleTrayAction)
    // @ts-ignore
    window.electron.ipcRenderer.on('settings-reset', handleReset)
    // @ts-ignore
    window.electron.ipcRenderer.on('power-state', handlePower)
    return () => {
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('tray-action')
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('settings-reset')
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('power-state')
    }
  }, [applySize, sizeIndex, shape])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  return (
    <div 
      className="app-container"
      style={{
        borderRadius: shape === 'circle' ? '50%' : `${rounding}px`,
        WebkitMaskImage: shape === 'circle' ? '-webkit-radial-gradient(white, black)' : 'none'
      }}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="camera-view" 
        style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
      />
    </div>
  )
}
