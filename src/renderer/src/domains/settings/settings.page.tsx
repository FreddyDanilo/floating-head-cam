import React from 'react'
import { Keyboard, Clapperboard, RotateCcw } from 'lucide-react'
import { useShortcuts } from './hooks/use-shortcuts'
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
export function SettingsPage(): React.JSX.Element {
  const { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut } = useShortcuts()
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
        {sections.map((section) => (
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
        <button className="reset-button" onClick={resetSettings}>
          <RotateCcw size={16} />
          Reset to Factory Defaults
        </button>
      </div>
    </div>
  )
}
