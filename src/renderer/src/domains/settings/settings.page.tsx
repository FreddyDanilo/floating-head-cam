import {
  Clapperboard,
  Keyboard,
  RotateCcw,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowLeft,
  Target,
  ArrowRight,
  ArrowDownLeft,
  ArrowDownRight,
  PowerOff,
  FlipHorizontal,
  Pin,
  TriangleAlert,
  FolderOpen
} from 'lucide-react'
import React, { useState } from 'react'
import { GRADIENTS, GradientKey } from '../../../../shared/colors'
import { t } from '../../../../shared/i18n'
import { useShortcuts, VisualState } from './hooks/use-shortcuts'
import { useAudioDevices } from '../camera/hooks/use-audio-devices'
import { useAudioMeter } from './hooks/use-audio-meter'
import {
  getMacOSVirtualAudioStream,
  getLinuxSystemAudioStream,
  isLinuxPlatform
} from '../camera/hooks/use-screen-recorder'

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

const GRADIENT_ENTRIES = Object.entries(GRADIENTS).filter(([k]) => k !== 'none') as [
  GradientKey,
  string
][]

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

const RESOLUTIONS = ['720p', '1080p', '1440p', '2160p'] as const
const FPS_OPTIONS = ['30', '60'] as const

function getEncoderOptions(): { value: string; labelKey: string }[] {
  const options = [{ value: 'libx264', labelKey: 'settings.encoder.cpu' }]
  const ua = navigator.userAgent
  if (ua.indexOf('Mac') !== -1) {
    options.push({ value: 'h264_videotoolbox', labelKey: 'settings.encoder.mac' })
  } else if (ua.indexOf('Win') !== -1) {
    options.push(
      { value: 'h264_nvenc', labelKey: 'settings.encoder.nvidia' },
      { value: 'h264_qsv', labelKey: 'settings.encoder.intel' },
      { value: 'h264_amf', labelKey: 'settings.encoder.amd' }
    )
  }
  return options
}

type RecordingSettingsProps = {
  language: 'en' | 'pt'
  visualState: VisualState
  updateVisualState: (key: keyof VisualState, value: string | number | boolean) => void
  screens: { id: string; name: string; display_id: string }[]
}

function RecordingSettings({
  language,
  visualState,
  updateVisualState,
  screens
}: RecordingSettingsProps): React.JSX.Element {
  const { devices } = useAudioDevices()
  const encoderOptions = getEncoderOptions()

  const [micStream, setMicStream] = React.useState<MediaStream | null>(null)
  const [sysStream, setSysStream] = React.useState<MediaStream | null>(null)

  React.useEffect(() => {
    let active = true
    let currentStream: MediaStream | null = null
    const getMic = async (): Promise<void> => {
      try {
        const constraints =
          visualState.selectedMicrophoneId && visualState.selectedMicrophoneId !== 'default'
            ? { deviceId: { exact: visualState.selectedMicrophoneId } }
            : true
        const stream = await navigator.mediaDevices.getUserMedia({
          audio:
            typeof constraints === 'boolean'
              ? constraints
              : { ...constraints, echoCancellation: false, noiseSuppression: false }
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
        } else {
          currentStream = stream
          setMicStream(stream)
        }
      } catch (e) {
        console.warn('Meter mic error:', e)
      }
    }
    getMic()
    return () => {
      active = false
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop())
    }
  }, [visualState.selectedMicrophoneId])

  React.useEffect(() => {
    let active = true
    let currentStream: MediaStream | null = null
    const getSys = async (): Promise<void> => {
      let stream: MediaStream | null = null
      if (isLinuxPlatform()) {
        stream = await getLinuxSystemAudioStream()
      } else if (navigator.userAgent.indexOf('Mac') !== -1) {
        stream = await getMacOSVirtualAudioStream()
      }
      if (!active && stream) {
        stream.getTracks().forEach((t) => t.stop())
      } else if (stream) {
        currentStream = stream
        setSysStream(stream)
      }
    }
    getSys()
    return () => {
      active = false
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const micLevel = useAudioMeter(micStream)
  const sysLevel = useAudioMeter(sysStream)

  const isWindows = navigator.userAgent.indexOf('Win') !== -1

  const renderMeter = (level: number, disabled?: boolean): React.JSX.Element => (
    <div
      style={{
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        marginTop: '16px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: disabled ? '0%' : `${level}%`,
          height: '100%',
          background: level > 85 ? '#ef4444' : level > 60 ? '#eab308' : '#22c55e',
          transition: 'width 0.1s ease-out, background 0.1s ease-out'
        }}
      />
    </div>
  )

  return (
    <div className="settings-section">
      <div className="settings-list">
        <div className="settings-row settings-row--column">
          <span className="settings-label">
            {t('settings.recordingScreen', language) || 'Recording Screen'}
          </span>
          <select
            className="settings-select"
            value={visualState.recordingScreenId || ''}
            onChange={(e) => updateVisualState('recordingScreenId', e.target.value)}
          >
            <option value="">{t('settings.screenDefault', language) || 'Primary Display'}</option>
            {(Array.isArray(screens) ? screens : []).map((s) => (
              <option key={s.display_id} value={s.display_id}>
                {s.name} ({s.display_id})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div className="settings-row settings-row--column">
            <span className="settings-label">{t('settings.recordingResolution', language)}</span>
            <div className="option-pills">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  className={`option-pill ${visualState.recordingResolution === r ? 'option-pill--active' : ''}`}
                  onClick={() => updateVisualState('recordingResolution', r)}
                >
                  {t(`settings.recording.${r}`, language)}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row settings-row--column">
            <span className="settings-label">{t('settings.recordingFps', language)}</span>
            <div className="option-pills" style={{ flexDirection: 'column' }}>
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  className={`option-pill ${visualState.recordingFps === f ? 'option-pill--active' : ''}`}
                  onClick={() => updateVisualState('recordingFps', f)}
                >
                  {t(`settings.recording.${f}fps`, language)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-row settings-row--column">
          <span className="settings-label">{t('settings.recordingEncoder', language)}</span>
          <div className="option-pills">
            {encoderOptions.map((enc) => (
              <button
                key={enc.value}
                className={`option-pill ${visualState.recordingEncoder === enc.value ? 'option-pill--active' : ''}`}
                onClick={() => updateVisualState('recordingEncoder', enc.value)}
              >
                {t(enc.labelKey, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row settings-row--column">
          <span className="settings-label">{t('settings.recordingAudio', language)}</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '14px',
                borderRadius: '10px',
                width: '100%',
                gap: '16px'
              }}
            >
              <div>
                <span
                  className="settings-label"
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  {t('settings.recordingMicrophone', language)}
                </span>
                <select
                  className="settings-select"
                  value={visualState.selectedMicrophoneId}
                  onChange={(e) => updateVisualState('selectedMicrophoneId', e.target.value)}
                  style={{ width: '100%', margin: 0 }}
                >
                  <option value="default">
                    {t('settings.recordingMicrophoneDefault', language)}
                  </option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || d.deviceId.substring(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="rounding-header">
                  <span
                    className="settings-label"
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                  >
                    {t('settings.recordingMicAudio', language)}
                  </span>
                  <span className="rounding-value">{visualState.microphoneAudioVolume}%</span>
                </div>
                <div className="slider-wrap" style={{ marginTop: '4px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={visualState.microphoneAudioVolume}
                    className="rounding-slider"
                    onChange={(e) =>
                      updateVisualState('microphoneAudioVolume', Number(e.target.value))
                    }
                  />
                  {renderMeter(micLevel)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '14px',
                borderRadius: '10px',
                width: '100%'
              }}
            >
              <div className="rounding-header">
                <span
                  className="settings-label"
                  style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                >
                  {t('settings.recordingSystemAudio', language)}
                </span>
                <span className="rounding-value">{visualState.systemAudioVolume}%</span>
              </div>
              <div className="slider-wrap" style={{ marginTop: '4px' }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={visualState.systemAudioVolume}
                  className="rounding-slider"
                  onChange={(e) => updateVisualState('systemAudioVolume', Number(e.target.value))}
                />
                {isWindows ? (
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: '6px',
                      textAlign: 'center'
                    }}
                  >
                    {t('settings.recordingSystemAudioWindowsWarning', language) ||
                      (language === 'pt'
                        ? 'Medidor indisponível no Windows antes de gravar.'
                        : 'Meter unavailable on Windows before recording.')}
                  </div>
                ) : (
                  renderMeter(sysLevel)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-row settings-row--column">
          <span className="settings-label">{t('settings.recordingFolder', language)}</span>
          <div className="settings-folder-row">
            <span className="settings-folder-path" title={visualState.recordingFolder}>
              {visualState.recordingFolder || t('settings.recordingFolderDefault', language)}
            </span>
            <div className="settings-folder-actions">
              <button
                className="option-pill"
                onClick={async () => {
                  const ipc = window.electron?.ipcRenderer
                  if (!ipc) return
                  const folder = await ipc.invoke('choose-recording-folder')
                  if (folder) updateVisualState('recordingFolder', folder)
                }}
              >
                <FolderOpen size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                {t('settings.recordingFolderChoose', language)}
              </button>
              {visualState.recordingFolder && (
                <button
                  className="option-pill"
                  title={t('settings.recordingFolderDefault', language)}
                  onClick={() => updateVisualState('recordingFolder', '')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseCustomGradient(grad: string): { color1: string; color2: string; angle: number } {
  const match = grad.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/)
  if (match) {
    return { angle: Number(match[1]), color1: match[2].trim(), color2: match[3].trim() }
  }
  return { angle: 45, color1: '#ff6b6b', color2: '#7c3aed' }
}

export function SettingsPage(): React.JSX.Element {
  const {
    shortcuts,
    listeningKey,
    setListeningKey,
    resetSettings,
    formatMacShortcut,
    language,
    visualState,
    updateVisualState
  } = useShortcuts()
  const [activeTab, setActiveTab] = useState<
    'visuals' | 'positioning' | 'cameraControl' | 'sizing' | 'recording'
  >('visuals')
  const [screens, setScreens] = useState<{ id: string; name: string; display_id: string }[]>([])

  React.useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer
        .invoke('get-screen-sources')
        .then((data) => setScreens(data || []))
    }
  }, [])

  const [showGradientEditor, setShowGradientEditor] = useState(false)
  const [gradColor1, setGradColor1] = useState('#ff6b6b')
  const [gradColor2, setGradColor2] = useState('#7c3aed')
  const [gradAngle, setGradAngle] = useState(45)

  const customGradientValue = `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})`

  const isCustom = isLinearGradient(visualState.borderGradient)

  React.useEffect(() => {
    if (showGradientEditor) {
      updateVisualState('borderGradient', customGradientValue)
    }
  }, [
    gradColor1,
    gradColor2,
    gradAngle,
    showGradientEditor,
    customGradientValue,
    updateVisualState
  ])

  const handleOpenGradientEditor = (): void => {
    if (isCustom) {
      const parsed = parseCustomGradient(visualState.borderGradient)
      setGradColor1(parsed.color1)
      setGradColor2(parsed.color2)
      setGradAngle(parsed.angle)
    }
    setShowGradientEditor((v) => !v)
  }

  const roundingTicks = [
    { val: 0, i18nKey: 'settings.rounding.sharp' },
    { val: 12, i18nKey: 'settings.rounding.subtle' },
    { val: 24, i18nKey: 'settings.rounding.round' },
    { val: 100, i18nKey: 'settings.rounding.max' }
  ]

  const sections = [
    {
      key: 'positioning',
      title: t('settings.positioning', language),
      actions: [
        { key: 'topLeft', label: t('settings.topLeft', language), icon: <ArrowUpLeft size={16} /> },
        {
          key: 'topRight',
          label: t('settings.topRight', language),
          icon: <ArrowUpRight size={16} />
        },
        {
          key: 'leftMiddle',
          label: t('settings.leftMiddle', language),
          icon: <ArrowLeft size={16} />
        },
        { key: 'center', label: t('settings.center', language), icon: <Target size={16} /> },
        {
          key: 'rightMiddle',
          label: t('settings.rightMiddle', language),
          icon: <ArrowRight size={16} />
        },
        {
          key: 'bottomLeft',
          label: t('settings.bottomLeft', language),
          icon: <ArrowDownLeft size={16} />
        },
        {
          key: 'bottomRight',
          label: t('settings.bottomRight', language),
          icon: <ArrowDownRight size={16} />
        }
      ]
    },
    {
      key: 'cameraControl',
      title: t('settings.cameraControl', language),
      actions: [
        {
          key: 'mirror',
          label: t('settings.mirror', language),
          icon: <FlipHorizontal size={16} />
        },
        { key: 'alwaysOnTop', label: t('settings.alwaysOnTop', language), icon: <Pin size={16} /> },
        {
          key: 'toggleCamera',
          label: t('settings.toggleCamera', language),
          icon: <PowerOff size={16} />
        }
      ]
    },
    {
      key: 'sizing',
      title: t('settings.sizing', language),
      actions: [
        { key: 'sizeSmall', label: t('settings.sizeSmall', language) },
        { key: 'sizeMedium', label: t('settings.sizeMedium', language) },
        { key: 'sizeLarge', label: t('settings.sizeLarge', language) },
        { key: 'sizeSidebar', label: t('settings.sizeSidebar', language) },
        { key: 'sizeFullscreen', label: t('settings.sizeFullscreen', language) }
      ]
    },
    {
      key: 'recording',
      title: t('settings.recording', language),
      actions: [
        {
          key: 'startRecording',
          label: t('settings.startRecording', language),
          icon: <Clapperboard size={16} />
        }
      ]
    }
  ]

  const sliderVal = roundingToSlider(visualState.rounding)
  const isCircle = visualState.shape === 'circle'

  return (
    <div className="settings-container">
      <div className="settings-top-bar">
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

              <div
                className={`settings-row settings-row--column${isCircle ? ' settings-row--disabled' : ''}`}
              >
                <div className="rounding-header">
                  <span className="settings-label">{t('settings.rounding', language)}</span>
                  <span className="rounding-value">
                    {isCircle
                      ? '—'
                      : visualState.rounding >= 9999
                        ? '∞'
                        : `${visualState.rounding}px`}
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
                    onChange={(e) =>
                      updateVisualState('rounding', sliderToRounding(Number(e.target.value)))
                    }
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
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '14px',
                      borderRadius: '10px',
                      width: '100%'
                    }}
                  >
                    <span
                      className="settings-label"
                      style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '8px'
                      }}
                    >
                      {t('settings.borderColor', language)}
                    </span>
                    <div className="gradient-picker">
                      <button
                        className={`gradient-swatch gradient-swatch--none ${visualState.borderGradient === 'none' ? 'gradient-swatch--active' : ''}`}
                        onClick={() => {
                          updateVisualState('borderGradient', 'none')
                          setShowGradientEditor(false)
                        }}
                        title={t('settings.gradient.none', language)}
                      >
                        <span className="gradient-swatch__x">✕</span>
                      </button>

                      {GRADIENT_ENTRIES.map(([key, grad]) => (
                        <button
                          key={key}
                          className={`gradient-swatch ${visualState.borderGradient === key ? 'gradient-swatch--active' : ''}`}
                          style={{ background: grad }}
                          onClick={() => {
                            updateVisualState('borderGradient', key)
                            setShowGradientEditor(false)
                          }}
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

                    {showGradientEditor && (
                      <div
                        className="gradient-editor"
                        style={{ background: 'transparent', padding: '12px 0 0 0' }}
                      >
                        <div
                          className="gradient-editor__preview"
                          style={{ background: customGradientValue }}
                        />

                        <div className="gradient-editor__colors">
                          <label className="gradient-editor__color-label">
                            <span>{t('settings.gradient.colorA', language)}</span>
                            <div
                              className="gradient-editor__color-wrap"
                              style={{ background: gradColor1 }}
                            >
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
                            <div
                              className="gradient-editor__color-wrap"
                              style={{ background: gradColor2 }}
                            >
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
                            <span className="gradient-editor__angle-label">
                              {t('settings.gradient.angle', language)}
                            </span>
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
                      </div>
                    )}
                  </div>

                  <div
                    className={`border-width-row${visualState.borderGradient === 'none' ? ' settings-row--disabled' : ''}`}
                  >
                    <div className="rounding-header">
                      <span
                        className="settings-label"
                        style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                      >
                        {t('settings.borderWidth', language)}
                      </span>
                      <span className="rounding-value">{visualState.borderWidth}px</span>
                    </div>
                    <div className="slider-wrap" style={{ marginTop: '4px' }}>
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
                    <span
                      className="settings-label"
                      style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {t('settings.animation', language)}
                    </span>
                    <button
                      className={`toggle-button ${visualState.isBorderAnimated ? 'toggle-button--active' : ''}`}
                      disabled={visualState.borderGradient === 'none'}
                      onClick={() =>
                        updateVisualState('isBorderAnimated', !visualState.isBorderAnimated)
                      }
                      style={{
                        width: '40px',
                        height: '24px',
                        borderRadius: '12px',
                        background: visualState.isBorderAnimated
                          ? '#0A84FF'
                          : 'rgba(255, 255, 255, 0.15)',
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
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recording' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RecordingSettings
              language={language}
              visualState={visualState}
              updateVisualState={updateVisualState}
              screens={screens}
            />
            {sections
              .filter((section) => section.key === 'recording')
              .map((section) => (
                <div key={section.title} className="settings-section">
                  <div className="settings-list">
                    {section.actions.map((action) => (
                      <React.Fragment key={action.key}>
                        <div className="settings-row">
                          <span
                            className="settings-label"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
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
                        {action.key === 'startRecording' && (
                          <div
                            className="settings-global-warning"
                            style={{
                              fontSize: '12px',
                              color: '#ffcc00',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '4px',
                              marginBottom: '8px'
                            }}
                          >
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
        )}

        {activeTab === 'positioning' && (
          <div className="settings-section" style={{ marginBottom: '-17px' }}>
            <div className="settings-list">
              <div className="settings-row settings-row--column">
                <span className="settings-label">
                  {t('settings.cameraScreen', language) || 'Camera Screen'}
                </span>
                <select
                  className="settings-select"
                  value={visualState.cameraScreenId || ''}
                  onChange={(e) => updateVisualState('cameraScreenId', e.target.value)}
                >
                  <option value="">
                    {t('settings.screenDefault', language) || 'Primary Display'}
                  </option>
                  {(Array.isArray(screens) ? screens : []).map((s) => (
                    <option key={s.display_id} value={s.display_id}>
                      {s.name} ({s.display_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {sections
          .filter((section) => section.key === activeTab && section.key !== 'recording')
          .map((section) => (
            <div key={section.title} className="settings-section">
              <div className="settings-list">
                {section.actions.map((action) => (
                  <React.Fragment key={action.key}>
                    <div className="settings-row">
                      <span
                        className="settings-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
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
                    {(action.key === 'toggleCamera' || action.key === 'startRecording') && (
                      <div
                        className="settings-global-warning"
                        style={{
                          fontSize: '12px',
                          color: '#ffcc00',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                          marginBottom: '8px'
                        }}
                      >
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
