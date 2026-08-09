import { Clapperboard, Keyboard, RotateCcw } from 'lucide-react'
import React from 'react'
import { t } from '../../../../shared/i18n'
import { useShortcuts } from './hooks/use-shortcuts'

export function SettingsPage(): React.JSX.Element {
  const { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, visualState, updateVisualState } =
    useShortcuts()

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
        { key: 'bottomRight', label: t('settings.bottomRight', language) }
      ]
    },
    {
      title: t('settings.cameraControl', language),
      actions: [
        { key: 'mirror', label: t('settings.mirror', language) },
        { key: 'alwaysOnTop', label: t('settings.alwaysOnTop', language) }
      ]
    },
    {
      title: t('settings.sizing', language),
      actions: [
        { key: 'sizeSmall', label: t('settings.sizeSmall', language) },
        { key: 'sizeMedium', label: t('settings.sizeMedium', language) },
        { key: 'sizeLarge', label: t('settings.sizeLarge', language) }
      ]
    }
  ]

  return (
    <div className="settings-container">
      <div
        className="settings-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clapperboard size={28} className="settings-icon" />
          <h1>{t('settings.title', language)}</h1>
        </div>
      </div>
      <p className="settings-description">{t('settings.description', language)}</p>
      <div className="settings-sections">
        
        <div className="settings-section">
          <h2>{t('settings.visuals', language)}</h2>
          <div className="settings-list">
            <div className="settings-row">
              <span className="settings-label">{t('settings.cameraShape', language)}</span>
              <select 
                value={visualState.shape} 
                onChange={(e) => updateVisualState('shape', e.target.value)}
                className="settings-shortcut"
                style={{ appearance: 'auto', padding: '4px 8px', width: '200px' }}
              >
                <option value="circle">{t('settings.shapeCircle', language)}</option>
                <option value="square">{t('settings.shapeSquare', language)}</option>
                <option value="vertical-rect">{t('settings.shapeVertical', language)}</option>
                <option value="horizontal-rect">{t('settings.shapeHorizontal', language)}</option>
              </select>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t('settings.rounding', language)}</span>
              <select 
                value={visualState.rounding} 
                onChange={(e) => updateVisualState('rounding', Number(e.target.value))}
                className="settings-shortcut"
                style={{ appearance: 'auto', padding: '4px 8px', width: '200px' }}
              >
                <option value={0}>{t('settings.roundingSharp', language)}</option>
                <option value={12}>{t('settings.roundingSubtle', language)}</option>
                <option value={24}>{t('settings.roundingRound', language)}</option>
                <option value={9999}>{t('settings.roundingMax', language)}</option>
              </select>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t('settings.border', language)}</span>
              <select 
                value={visualState.borderGradient} 
                onChange={(e) => updateVisualState('borderGradient', e.target.value)}
                className="settings-shortcut"
                style={{ appearance: 'auto', padding: '4px 8px', width: '200px' }}
              >
                <option value="none">{t('settings.border.none', language)}</option>
                <option value="gradient_01">{t('settings.border.gradient_01', language)}</option>
                <option value="gradient_02">{t('settings.border.gradient_02', language)}</option>
                <option value="gradient_03">{t('settings.border.gradient_03', language)}</option>
                <option value="gradient_04">{t('settings.border.gradient_04', language)}</option>
                <option value="gradient_05">{t('settings.border.gradient_05', language)}</option>
                <option value="gradient_06">{t('settings.border.gradient_06', language)}</option>
                <option value="gradient_07">{t('settings.border.gradient_07', language)}</option>
                <option value="gradient_08">{t('settings.border.gradient_08', language)}</option>
              </select>
            </div>
          </div>
        </div>
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
                      : formatMacShortcut(shortcuts[action.key]) === 'Unbound'
                        ? t('settings.unbound', language)
                        : formatMacShortcut(shortcuts[action.key])}
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
