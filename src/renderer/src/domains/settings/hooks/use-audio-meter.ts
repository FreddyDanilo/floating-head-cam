import { useEffect, useRef, useState } from 'react'

// Updating React state on every animation frame forces the whole settings
// page to re-render at 60fps. Throttle to ~20fps and only commit when the
// displayed integer level actually changes.
const METER_UPDATE_INTERVAL_MS = 50

export function useAudioMeter(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0)
  const lastCommitRef = useRef(0)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevel(0)
      return
    }

    let audioCtx: AudioContext | null = null
    try {
      audioCtx = new AudioContext()
    } catch (err) {
      console.warn('Failed to create AudioContext for meter:', err)
      setLevel(0)
      return
    }

    let analyser: AnalyserNode
    let source: MediaStreamAudioSourceNode
    try {
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
    } catch (err) {
      console.warn('Failed to wire audio meter graph:', err)
      audioCtx.close().catch(() => {})
      setLevel(0)
      return
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let rafId: number | null = null

    const update = (): void => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const mapped = Math.min(100, Math.max(0, (average / 255) * 100 * 2))
      const rounded = Math.round(mapped)

      const now = performance.now()
      if (
        rounded !== lastCommitRef.current &&
        now - lastCommitRef.current >= METER_UPDATE_INTERVAL_MS
      ) {
        lastCommitRef.current = now
        setLevel(rounded)
      }

      rafId = requestAnimationFrame(update)
    }

    rafId = requestAnimationFrame(update)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      source.disconnect()
      analyser.disconnect()
      audioCtx!.close().catch(() => {})
    }
  }, [stream])

  return level
}
