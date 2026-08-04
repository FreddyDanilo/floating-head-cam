import React from 'react'
import { Clapperboard } from 'lucide-react'

export function About(): React.JSX.Element {
  return (
    <div className="settings-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: 0 }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '30px',
        borderRadius: '50%',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <Clapperboard size={54} color="#0A84FF" />
      </div>
      
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 5px 0', letterSpacing: '-0.5px' }}>
        Floating Head Cam
      </h1>
      
      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 25px 0' }}>
        Version 1.0.0
      </p>

      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '15px 25px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <p style={{ fontSize: '14px', margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          Created by <strong style={{ color: '#fff' }}>Freddy Danilo</strong>
        </p>
      </div>
    </div>
  )
}
