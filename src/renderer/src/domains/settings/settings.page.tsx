import { Clapperboard, Keyboard, RotateCcw, ArrowUpLeft, ArrowUpRight, ArrowLeft, Target, ArrowRight, ArrowDownLeft, ArrowDownRight, PowerOff, FlipHorizontal, Pin, TriangleAlert } from 'lucide-react'
import React, { useState } from 'react'
import { GRADIENTS, GradientKey } from '../../../../shared/colors'
import { t } from '../../../../shared/i18n'
import { useShortcuts } from './hooks/use-shortcuts'

const SHAPE_KEYS = [
  {
    key: 'circle',
    i18nKey: 'settings.shape.circle',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <circle cx="20" cy="20" r="18" />
      </svg>
    )
  },
  {
    key: 'square',
    i18nKey: 'settings.shape.square',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="3" y="3" width="34" height="34" rx="6" />
      </svg>
    )
  },
  {
    key: 'vertical-rect',
    i18nKey: 'settings.shape.portrait',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="9" y="2" width="22" height="36" rx="5" />
      </svg>
    )
  },
  {
    key: 'horizontal-rect',
    i18nKey: 'settings.shape.landscape',
    svg: (
      <svg viewBox="0 0 40 40" width={36} height={36}>
        <rect x="2" y="11" width="36" height="18" rx="5" />
      </svg>
    )
  }
]

const GRADIENT_ENTRIES = Object.entries(GRADIENTS).filter(([k]) => k !== 'none') as [GradientKey, string][]

const PRESET_ANGLES = [0, 45, 90, 135]

function roundingToSlider(rounding: number): number {
  return rounding >= 9999 ? 100 : Math.min(rounding, 99)
}

function sliderToRounding(val: number): number {
  return val >= 100 ? 9999 : val
}

function isLinearGradient(val: string): boolean {
  return val.startsWith('linear-gradient')
}

function parseCustomGradient(grad: string): { color1: string; color2: string; angle: number } {
  const match = grad.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/)
  if (match) {
    return { angle: Number(match[1]), color1: match[2].trim(), color2: match[3].trim() }
  }
  return { angle: 45, color1: '#ff6b6b', color2: '#7c3aed' }
}

export function SettingsPage(): React.JSX.Element {
  const { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, visualState, updateVisualState } =
    useShortcuts()

  const [activeTab, setActiveTab] = useState<'visuals' | 'positioning' | 'cameraControl' | 'sizing' | 'recording'>('visuals')

  const [showGradientEditor, setShowGradientEditor] = useState(false)
  const [gradColor1, setGradColor1] = useState('#ff6b6b')
  const [gradColor2, setGradColor2] = useState('#7c3aed')
  const [gradAngle, setGradAngle] = useState(45)

  const customGradientValue = `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})`

  const isCustom = isLinearGradient(visualState.borderGradient)

  const handleOpenGradientEditor = () => {
    if (isCustom) {
      const parsed = parseCustomGradient(visualState.borderGradient)
      setGradColor1(parsed.color1)
      setGradColor2(parsed.color2)
      setGradAngle(parsed.angle)
    }
    setShowGradientEditor((v) => !v)
  }

  const handleApplyGradient = () => {
    updateVisualState('borderGradient', customGradientValue)
    setShowGradientEditor(false)
  }

  const roundingTicks = [
    { val: 0,   i18nKey: 'settings.rounding.sharp' },
    { val: 12,  i18nKey: 'settings.rounding.subtle' },
    { val: 24,  i18nKey: 'settings.rounding.round' },
    { val: 100, i18nKey: 'settings.rounding.max' }
  ]

  const sections = [
    {
      key: 'positioning',
      title: t('settings.positioning', language),
      actions: [
        { key: 'topLeft', label: t('settings.topLeft', language), icon: <ArrowUpLeft size={16} /> },
        { key: 'topRight', label: t('settings.topRight', language), icon: <ArrowUpRight size={16} /> },
        { key: 'leftMiddle', label: t('settings.leftMiddle', language), icon: <ArrowLeft size={16} /> },
        { key: 'center', label: t('settings.center', language), icon: <Target size={16} /> },
        { key: 'rightMiddle', label: t('settings.rightMiddle', language), icon: <ArrowRight size={16} /> },
        { key: 'bottomLeft', label: t('settings.bottomLeft', language), icon: <ArrowDownLeft size={16} /> },
        { key: 'bottomRight', label: t('settings.bottomRight', language), icon: <ArrowDownRight size={16} /> }
      ]
    },
    {
      key: 'cameraControl',
      title: t('settings.cameraControl', language),
      actions: [
        { key: 'mirror', label: t('settings.mirror', language), icon: <FlipHorizontal size={16} /> },
        { key: 'alwaysOnTop', label: t('settings.alwaysOnTop', language), icon: <Pin size={16} /> },
        { key: 'toggleCamera', label: t('settings.toggleCamera', language), icon: <PowerOff size={16} /> }
      ]
    },
    {
      key: 'sizing',
      title: t('settings.sizing', language),
      actions: [
        { key: 'sizeSmall', label: t('settings.sizeSmall', language) },
        { key: 'sizeMedium', label: t('settings.sizeMedium', language) },
        { key: 'sizeLarge', label: t('settings.sizeLarge', language) }
      ]
    },
    {
      key: 'recording',
      title: t('settings.recording', language),
      actions: [
        { key: 'startRecording', label: t('settings.startRecording', language), icon: <Clapperboard size={16} /> }
      ]
    }
  ]

  const sliderVal = roundingToSlider(visualState.rounding)
  const isCircle = visualState.shape === 'circle'

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

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'visuals' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('visuals')}
        >
          {t('settings.visuals', language)}
        </button>
        <button
          className={`settings-tab ${activeTab === 'positioning' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('positioning')}
        >
          {t('settings.positioning', language)}
        </button>
        <button
          className={`settings-tab ${activeTab === 'cameraControl' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('cameraControl')}
        >
          {t('settings.cameraControl', language)}
        </button>
        <button
          className={`settings-tab ${activeTab === 'sizing' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('sizing')}
        >
          {t('settings.sizing', language)}
        </button>
        <button
          className={`settings-tab ${activeTab === 'recording' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('recording')}
        >
          {t('settings.recording', language)}
        </button>
      </div>

      <div className="settings-sections">
        {activeTab === 'visuals' && (
          <div className="settings-section">
            <div className="settings-list">

            <div className="settings-row settings-row--column">
              <span className="settings-label">{t('settings.cameraShape', language)}</span>
              <div className="shape-picker">
                {SHAPE_KEYS.map((s) => (
                  <button
                    key={s.key}
                    className={`shape-btn ${visualState.shape === s.key ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('shape', s.key)}
                    title={t(s.i18nKey, language)}
                  >
                    {s.svg}
                    <span className="shape-label">{t(s.i18nKey, language)}</span>
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
                  {roundingTicks.map((tick) => (
                    <button
                      key={tick.val}
                      className={`slider-tick ${!isCircle && sliderVal === tick.val ? 'slider-tick--active' : ''}`}
                      disabled={isCircle}
                      onClick={() => updateVisualState('rounding', sliderToRounding(tick.val))}
                    >
                      {t(tick.i18nKey, language)}
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
                  onClick={() => { updateVisualState('borderGradient', 'none'); setShowGradientEditor(false) }}
                  title={t('settings.gradient.none', language)}
                >
                  <span className="gradient-swatch__x">✕</span>
                </button>

                {GRADIENT_ENTRIES.map(([key, grad]) => (
                  <button
                    key={key}
                    className={`gradient-swatch ${visualState.borderGradient === key ? 'gradient-swatch--active' : ''}`}
                    style={{ background: grad }}
                    onClick={() => { updateVisualState('borderGradient', key); setShowGradientEditor(false) }}
                    title={key}
                  />
                ))}

                <button
                  className={`gradient-swatch gradient-swatch--custom ${isCustom ? 'gradient-swatch--active' : ''}`}
                  style={isCustom ? { background: visualState.borderGradient } : undefined}
                  onClick={handleOpenGradientEditor}
                  title={t('settings.gradient.custom', language)}
                >
                  {!isCustom && <span className="gradient-swatch__plus">+</span>}
                </button>
              </div>

              <div className={`border-width-row${visualState.borderGradient === 'none' ? ' settings-row--disabled' : ''}`}>
                <div className="rounding-header">
                  <span className="settings-label" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    {t('settings.borderWidth', language)}
                  </span>
                  <span className="rounding-value">{visualState.borderWidth}px</span>
                </div>
                <div className="slider-wrap">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={visualState.borderWidth}
                    className="rounding-slider"
                    disabled={visualState.borderGradient === 'none'}
                    onChange={(e) => updateVisualState('borderWidth', Number(e.target.value))}
                  />
                  <div className="slider-ticks">
                    {[
                      { val: 1, i18nKey: 'settings.borderWidth.thin' },
                      { val: 4, i18nKey: 'settings.borderWidth.default' },
                      { val: 20, i18nKey: 'settings.borderWidth.thick' }
                    ].map((tick) => (
                      <button
                        key={tick.val}
                        className={`slider-tick ${visualState.borderWidth === tick.val ? 'slider-tick--active' : ''}`}
                        disabled={visualState.borderGradient === 'none'}
                        onClick={() => updateVisualState('borderWidth', tick.val)}
                      >
                        {t(tick.i18nKey, language)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div 
                className={`settings-row${visualState.borderGradient === 'none' ? ' settings-row--disabled' : ''}`}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.2)', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  width: '100%'
                }}
              >
                <span className="settings-label" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  {t('settings.animation', language)}
                </span>
                <button
                  className={`toggle-button ${visualState.isBorderAnimated ? 'toggle-button--active' : ''}`}
                  disabled={visualState.borderGradient === 'none'}
                  onClick={() => updateVisualState('isBorderAnimated', !visualState.isBorderAnimated)}
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: visualState.isBorderAnimated ? '#0A84FF' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    cursor: visualState.borderGradient === 'none' ? 'not-allowed' : 'pointer',
                    border: 'none',
                    transition: 'background 0.2s',
                    padding: 0
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '2px',
                      left: visualState.isBorderAnimated ? '18px' : '2px',
                      transition: 'left 0.2s, background 0.2s'
                    }}
                  />
                </button>
              </div>

              {showGradientEditor && (
                <div className="gradient-editor">
                  <div className="gradient-editor__preview" style={{ background: customGradientValue }} />

                  <div className="gradient-editor__colors">
                    <label className="gradient-editor__color-label">
                      <span>{t('settings.gradient.colorA', language)}</span>
                      <div className="gradient-editor__color-wrap" style={{ background: gradColor1 }}>
                        <input
                          type="color"
                          value={gradColor1}
                          onChange={(e) => setGradColor1(e.target.value)}
                          className="gradient-editor__color-input"
                        />
                      </div>
                    </label>

                    <div className="gradient-editor__arrow">→</div>

                    <label className="gradient-editor__color-label">
                      <span>{t('settings.gradient.colorB', language)}</span>
                      <div className="gradient-editor__color-wrap" style={{ background: gradColor2 }}>
                        <input
                          type="color"
                          value={gradColor2}
                          onChange={(e) => setGradColor2(e.target.value)}
                          className="gradient-editor__color-input"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="gradient-editor__angle-row">
                    <div className="gradient-editor__angle-header">
                      <span className="gradient-editor__angle-label">{t('settings.gradient.angle', language)}</span>
                      <span className="gradient-editor__angle-value">{gradAngle}°</span>
                    </div>
                    <div className="gradient-editor__angle-presets">
                      {PRESET_ANGLES.map((a) => (
                        <button
                          key={a}
                          className={`gradient-editor__angle-btn ${gradAngle === a ? 'gradient-editor__angle-btn--active' : ''}`}
                          onClick={() => setGradAngle(a)}
                        >
                          {a}°
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={gradAngle}
                      className="rounding-slider"
                      onChange={(e) => setGradAngle(Number(e.target.value))}
                    />
                  </div>

                  <button className="gradient-editor__apply" onClick={handleApplyGradient}>
                    {t('settings.gradient.apply', language)}
                  </button>
                </div>
              )}
            </div>

            </div>
          </div>
        )}

        {activeTab === 'recording' && (
          <div className="settings-section">
            <div className="settings-list">
              <div className="settings-row settings-row--column">
                <span className="settings-label">{t('settings.recordingResolution', language)}</span>
                <div className="shape-picker" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    className={`shape-btn ${visualState.recordingResolution === '720p' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingResolution', '720p')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.720p', language)}</span>
                  </button>
                  <button
                    className={`shape-btn ${visualState.recordingResolution === '1080p' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingResolution', '1080p')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.1080p', language)}</span>
                  </button>
                  <button
                    className={`shape-btn ${visualState.recordingResolution === '1440p' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingResolution', '1440p')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.1440p', language)}</span>
                  </button>
                  <button
                    className={`shape-btn ${visualState.recordingResolution === '2160p' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingResolution', '2160p')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.2160p', language)}</span>
                  </button>
                </div>
              </div>

              <div className="settings-row settings-row--column">
                <span className="settings-label">{t('settings.recordingFps', language)}</span>
                <div className="shape-picker" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    className={`shape-btn ${visualState.recordingFps === '30' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingFps', '30')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.30fps', language)}</span>
                  </button>
                  <button
                    className={`shape-btn ${visualState.recordingFps === '60' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingFps', '60')}
                    style={{ flex: 1 }}
                  >
                    <span className="shape-label">{t('settings.recording.60fps', language)}</span>
                  </button>
                </div>
              </div>

              <div className="settings-row settings-row--column">
                <span className="settings-label">{t('settings.recordingEncoder', language)}</span>
                <div className="shape-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                  <button
                    className={`shape-btn ${visualState.recordingEncoder === 'libx264' ? 'shape-btn--active' : ''}`}
                    onClick={() => updateVisualState('recordingEncoder', 'libx264')}
                    style={{ flex: '1 1 45%' }}
                  >
                    <span className="shape-label">{t('settings.encoder.cpu', language)}</span>
                  </button>

                  {window.electron?.process.platform === 'darwin' && (
                    <button
                      className={`shape-btn ${visualState.recordingEncoder === 'h264_videotoolbox' ? 'shape-btn--active' : ''}`}
                      onClick={() => updateVisualState('recordingEncoder', 'h264_videotoolbox')}
                      style={{ flex: '1 1 45%' }}
                    >
                      <span className="shape-label">{t('settings.encoder.mac', language)}</span>
                    </button>
                  )}

                  {window.electron?.process.platform === 'win32' && (
                    <>
                      <button
                        className={`shape-btn ${visualState.recordingEncoder === 'h264_nvenc' ? 'shape-btn--active' : ''}`}
                        onClick={() => updateVisualState('recordingEncoder', 'h264_nvenc')}
                        style={{ flex: '1 1 45%' }}
                      >
                        <span className="shape-label">{t('settings.encoder.nvidia', language)}</span>
                      </button>
                      <button
                        className={`shape-btn ${visualState.recordingEncoder === 'h264_qsv' ? 'shape-btn--active' : ''}`}
                        onClick={() => updateVisualState('recordingEncoder', 'h264_qsv')}
                        style={{ flex: '1 1 45%' }}
                      >
                        <span className="shape-label">{t('settings.encoder.intel', language)}</span>
                      </button>
                      <button
                        className={`shape-btn ${visualState.recordingEncoder === 'h264_amf' ? 'shape-btn--active' : ''}`}
                        onClick={() => updateVisualState('recordingEncoder', 'h264_amf')}
                        style={{ flex: '1 1 45%' }}
                      >
                        <span className="shape-label">{t('settings.encoder.amd', language)}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {sections
          .filter((section) => section.key === activeTab)
          .map((section) => (
            <div key={section.title} className="settings-section">
              <div className="settings-list">
                {section.actions.map((action) => (
                  <React.Fragment key={action.key}>
                    <div className="settings-row">
                      <span className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {action.icon}
                        {action.label}
                      </span>
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
                    {action.key === 'toggleCamera' && (
                      <div className="settings-global-warning" style={{ fontSize: '12px', color: '#ffcc00', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', marginBottom: '8px' }}>
                        <TriangleAlert size={14} />
                        {t('settings.globalShortcutWarning', language)}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className="settings-footer">
        <button className="reset-button" onClick={() => resetSettings(activeTab)}>
          <RotateCcw size={16} />
          {t('settings.reset', language)}
        </button>
      </div>
    </div>
  )
}
