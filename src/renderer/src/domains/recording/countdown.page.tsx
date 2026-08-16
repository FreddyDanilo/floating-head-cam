import React, { useEffect, useState } from 'react'
import '../../assets/main.css' // Import global styles

export function CountdownPage(): React.JSX.Element {
  const [countdown, setCountdown] = useState<number>(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      overflow: 'hidden'
    }}>
      {countdown > 0 && (
        <span style={{
          color: '#ffffff',
          fontSize: '120px',
          fontWeight: 'bold',
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          {countdown}
        </span>
      )}
    </div>
  )
}
