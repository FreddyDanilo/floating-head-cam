import React, { useEffect, useState } from 'react'
import { Keyboard, Clapperboard, RotateCcw } from 'lucide-react'

function formatMacShortcut(shortcut: string) {
  if (!shortcut) return 'Unbound'
  return shortcut
    .replace(/CmdOrCtrl/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/CommandOrControl/g, '⌘')
    .replace(/Alt/g, '⌥')
    .replace(/Shift/g, '⇧')
    .replace(/Control/g, '⌃')
    .replace(/Ctrl/g, '⌃')
    .replace(/\+/g, ' ')
}

function codeToKey(code: string) {
  if (code.startsWith('Key')) return code.replace('Key', '')
  if (code.startsWith('Digit')) return code.replace('Digit', '')
  if (code === 'Space') return 'Space'
  if (code.includes('Arrow')) return code.replace('Arrow', '')
  return code
}

export function Settings(): React.JSX.Element {
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({})
  const [listeningKey, setListeningKey] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electron) return

    window.electron.ipcRenderer.invoke('get-shortcuts').then((data) => {
      setShortcuts(data)
    })

    const handleReset = (_e: any, payload: any) => setShortcuts(payload.shortcuts)
    // @ts-ignore
    window.electron.ipcRenderer.on('settings-reset', handleReset)
    return () => {
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('settings-reset')
    }
  }, [])

  useEffect(() => {
    if (!listeningKey) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (['MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) return

      let keys: string[] = []
      if (e.metaKey || e.ctrlKey) keys.push('CmdOrCtrl')
      if (e.altKey) keys.push('Alt')
      if (e.shiftKey) keys.push('Shift')

      const baseKey = codeToKey(e.code)
      keys.push(baseKey)
      
      const shortcutString = keys.join('+')

      if (window.electron) {
        window.electron.ipcRenderer.send('update-shortcut', listeningKey, shortcutString)
      }

      setShortcuts(prev => ({ ...prev, [listeningKey]: shortcutString }))
      setListeningKey(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [listeningKey])

  const handleReset = () => {
    if (window.electron) {
      window.electron.ipcRenderer.send('reset-settings')
    }
  }

  const sections = [
    {
      title: 'Positioning',
      actions: [
        { key: 'topLeft', label: 'Top Left' },
        { key: 'topRight', label: 'Top Right' },
        { key: 'leftMiddle', label: 'Left Middle' },
        { key: 'center', label: 'Center' },
        { key: 'rightMiddle', label: 'Right Middle' },
        { key: 'bottomLeft', label: 'Bottom Left' },
        { key: 'bottomRight', label: 'Bottom Right' },
      ]
    },
    {
      title: 'Camera Control',
      actions: [
        { key: 'mirror', label: 'Toggle Mirror' },
        { key: 'alwaysOnTop', label: 'Toggle Always on Top' },
      ]
    },
    {
      title: 'Camera Shape',
      actions: [
        { key: 'shapeCircle', label: 'Shape: Circle' },
        { key: 'shapeSquare', label: 'Shape: Square' },
        { key: 'shapeVertical', label: 'Shape: Vertical Rectangle' },
        { key: 'shapeHorizontal', label: 'Shape: Horizontal Rectangle' },
      ]
    },
    {
      title: 'Sizing',
      actions: [
        { key: 'sizeSmall', label: 'Size: Small' },
        { key: 'sizeMedium', label: 'Size: Medium' },
        { key: 'sizeLarge', label: 'Size: Large' },
      ]
    }
  ]

  return (
    <div className="settings-container">
      <div className="settings-header">
        <Clapperboard size={28} className="settings-icon" />
        <h1>Floating Head Cam</h1>
      </div>
      <p className="settings-description">
        Click on any shortcut box and press your desired physical key combination. Mac special characters are automatically ignored!
      </p>
      
      <div className="settings-sections">
        {sections.map(section => (
          <div key={section.title} className="settings-section">
            <h2>{section.title}</h2>
            <div className="settings-list">
              {section.actions.map((action) => (
                <div className="settings-row" key={action.key}>
                  <span className="settings-label">{action.label}</span>
                  <div 
                    className={`settings-shortcut ${listeningKey === action.key ? 'listening' : ''}`}
                    onClick={() => setListeningKey(action.key)}
                  >
                    {listeningKey === action.key ? 'Press Keys...' : formatMacShortcut(shortcuts[action.key])}
                    <Keyboard size={14} className="shortcut-icon" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-footer">
        <button className="reset-button" onClick={handleReset}>
          <RotateCcw size={16} />
          Reset to Factory Defaults
        </button>
      </div>
    </div>
  )
}
