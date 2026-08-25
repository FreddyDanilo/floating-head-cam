import { useEffect, useRef, useState } from 'react'

export function useAudioMeter(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0)
  const reqRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0)
      return
    }

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const update = (): void => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const mapped = Math.min(100, Math.max(0, (average / 255) * 100 * 2))
      setLevel(Math.round(mapped))
      reqRef.current = requestAnimationFrame(update)
    }

    update()

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
      audioCtx.close().catch(console.error)
    }
  }, [stream])

  return level
}
