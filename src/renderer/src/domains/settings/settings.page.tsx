import { Clapperboard, Keyboard, RotateCcw } from 'lucide-react'
import React, { useRef } from 'react'
import { GRADIENTS, GradientKey } from '../../../../shared/colors'
import { t } from '../../../../shared/i18n'
import { useShortcuts } from './hooks/use-shortcuts'

const SHAPES = [
  {
    key: 'circle',
    label: 'Circle',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <circle cx="20" cy="20" r="18" />
      </svg>
    )
  },
  {
    key: 'square',
    label: 'Square',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="3" y="3" width="34" height="34" rx="6" />
      </svg>
    )
  },
  {
    key: 'vertical-rect',
    label: 'Portrait',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="9" y="2" width="22" height="36" rx="5" />
      </svg>
    )
  },
  {
    key: 'horizontal-rect',
    label: 'Landscape',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="2" y="11" width="36" height="18" rx="5" />
      </svg>
    )
  }
]

const GRADIENT_ENTRIES = Object.entries(GRADIENTS).filter(([k]) => k !== 'none') as [GradientKey, string][]

/**
 * Maps a rounding value to a 0-100 slider position.
 * Values >= 9999 represent "full circle" and map to 100.
 */
function roundingToSlider(rounding: number): number {
  return rounding >= 9999 ? 100 : Math.min(rounding, 99)
}

/**
 * Maps a slider position (0-100) back to a rounding value.
 * Position 100 maps to 9999 (full circle).
 */
function sliderToRounding(val: number): number {
  return val >= 100 ? 9999 : val
}

export function SettingsPage(): React.JSX.Element {
  const { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, visualState, updateVisualState } =
    useShortcuts()

  const customColorRef = useRef<HTMLInputElement>(null)

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

  const sliderVal = roundingToSlider(visualState.rounding)
  const isCircle = visualState.shape === 'circle'

  const isCustomColor = visualState.borderGradient !== 'none' && !(visualState.borderGradient in GRADIENTS)
  const customColor = isCustomColor ? visualState.borderGradient : '#ff6b6b'

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

            <div className="settings-row settings-row--column">
              <span className="settings-label">{t('settings.cameraShape', language)}</span>
              <div className="shape-picker">
                {SHAPES.map((s) => (
                  <button
                    key={s.key}
                    className={`shape-btn ${visualState.shape === s.key ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('shape', s.key)}
                    title={s.label}
                  >
                    {s.svg}
                    <span className="shape-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`settings-row settings-row--column${isCircle ? ' settings-row--disabled' : ''}`}>
              <div className="rounding-header">
                <span className="settings-label">{t('settings.rounding', language)}</span>
                <span className="rounding-value">
                  {isCircle ? '—' : visualState.rounding >= 9999 ? '∞' : `${visualState.rounding}px`}
                </span>
              </div>
              <div className="slider-wrap">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={sliderVal}
                  className="rounding-slider"
                  disabled={isCircle}
                  onChange={(e) => updateVisualState('rounding', sliderToRounding(Number(e.target.value)))}
                />
                <div className="slider-ticks">
                  {[
                    { val: 0, label: 'Sharp' },
                    { val: 12, label: 'Subtle' },
                    { val: 24, label: 'Round' },
                    { val: 100, label: '∞' }
                  ].map((tick) => (
                    <button
                      key={tick.val}
                      className={`slider-tick ${!isCircle && sliderVal === tick.val ? 'slider-tick--active' : ''}`}
                      disabled={isCircle}
                      onClick={() => updateVisualState('rounding', sliderToRounding(tick.val))}
                    >
                      {tick.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="settings-row settings-row--column">
              <span className="settings-label">{t('settings.border', language)}</span>
              <div className="gradient-picker">
                <button
                  className={`gradient-swatch gradient-swatch--none ${visualState.borderGradient === 'none' ? 'gradient-swatch--active' : ''}`}
                  onClick={() => updateVisualState('borderGradient', 'none')}
                  title="None"
                >
                  <span className="gradient-swatch__x">✕</span>
                </button>

                {GRADIENT_ENTRIES.map(([key, grad]) => (
                  <button
                    key={key}
                    className={`gradient-swatch ${visualState.borderGradient === key ? 'gradient-swatch--active' : ''}`}
                    style={{ background: grad }}
                    onClick={() => updateVisualState('borderGradient', key)}
                    title={key}
                  />
                ))}

                <button
                  className={`gradient-swatch gradient-swatch--custom ${isCustomColor ? 'gradient-swatch--active' : ''}`}
                  style={isCustomColor ? { background: customColor } : undefined}
                  onClick={() => customColorRef.current?.click()}
                  title="Custom color"
                >
                  {!isCustomColor && <span className="gradient-swatch__plus">+</span>}
                  <input
                    ref={customColorRef}
                    type="color"
                    defaultValue={customColor}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    onChange={(e) => updateVisualState('borderGradient', e.target.value)}
                  />
                </button>
              </div>
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
