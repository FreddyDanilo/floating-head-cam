import React from 'react'
import { Keyboard, Clapperboard, RotateCcw } from 'lucide-react'
import { useShortcuts } from './hooks/use-shortcuts'
import { t } from '../../../../shared/i18n'

export function SettingsPage(): React.JSX.Element {
  const { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, setAppLanguage } = useShortcuts()

  const sections = [
    {
      title: t('settings.positioning', language),
      actions: [
        { key: 'topLeft', label: t('settings.topLeft', language) },
        { key: 'topRight', label: t('settings.topRight', language) },
        { key: 'leftMiddle', label: t('settings.leftMiddle', language) },
        { key: 'center', label: t('settings.center', language) },
        { key: 'rightMiddle', label: t('settings.rightMiddle', language) },
        { key: 'bottomLeft', label: t('settings.bottomLeft', language) },
        { key: 'bottomRight', label: t('settings.bottomRight', language) },
      ]
    },
    {
      title: t('settings.cameraControl', language),
      actions: [
        { key: 'mirror', label: t('settings.mirror', language) },
        { key: 'alwaysOnTop', label: t('settings.alwaysOnTop', language) },
      ]
    },
    {
      title: t('settings.cameraShape', language),
      actions: [
        { key: 'shapeCircle', label: t('settings.shapeCircle', language) },
        { key: 'shapeSquare', label: t('settings.shapeSquare', language) },
        { key: 'shapeVertical', label: t('settings.shapeVertical', language) },
        { key: 'shapeHorizontal', label: t('settings.shapeHorizontal', language) },
      ]
    },
    {
      title: t('settings.sizing', language),
      actions: [
        { key: 'sizeSmall', label: t('settings.sizeSmall', language) },
        { key: 'sizeMedium', label: t('settings.sizeMedium', language) },
        { key: 'sizeLarge', label: t('settings.sizeLarge', language) },
      ]
    }
  ]

  return (
    <div className="settings-container">
      <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clapperboard size={28} className="settings-icon" />
          <h1>{t('settings.title', language)}</h1>
        </div>
      </div>
      <p className="settings-description">
        {t('settings.description', language)}
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
                    {listeningKey === action.key 
                      ? t('settings.pressKeys', language) 
                      : (formatMacShortcut(shortcuts[action.key]) === 'Unbound' ? t('settings.unbound', language) : formatMacShortcut(shortcuts[action.key]))}
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
          {t('settings.reset', language)}
        </button>
      </div>
    </div>
  )
}
