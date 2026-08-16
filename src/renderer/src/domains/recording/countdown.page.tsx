import React, { useEffect, useState } from 'react'
import '../../assets/main.css'

export function CountdownPage(): React.JSX.Element {
  const [countdown, setCountdown] = useState<number>(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        overflow: 'hidden'
      }}
    >
      <style>
        {`
          @keyframes pulseFade {
            0% { transform: scale(0.5); opacity: 0; }
            20% { transform: scale(1.1); opacity: 1; }
            40% { transform: scale(1); opacity: 1; }
            80% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0; }
          }
        `}
      </style>
      {countdown > 0 && (
        <span
          key={countdown}
          style={{
            color: '#ffffff',
            fontSize: '162px',
            fontWeight: 'bold',
            animation: 'pulseFade 1s ease-in-out forwards'
          }}
        >
          {countdown}
        </span>
      )}
    </div>
  )
}
