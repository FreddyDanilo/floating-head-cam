import type { ReactElement } from 'react'
import { CameraOff } from 'lucide-react'
import { usePermissions } from '../hooks/use-permissions'
import { t } from '../../../../../shared/i18n'

function detectPlatform(): string {
  if (navigator.userAgent.indexOf('Mac') !== -1) return 'mac'
  if (navigator.userAgent.indexOf('Win') !== -1) return 'win'
  if (navigator.userAgent.indexOf('Linux') !== -1) return 'linux'
  return 'unknown'
}

const styles = {
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '24px',
    background: 'rgba(10, 10, 12, 0.88)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 'inherit',
    border: '1px solid rgba(255, 69, 58, 0.3)',
    color: '#ffffff'
  },
  iconWrap: {
    background: 'rgba(255, 69, 58, 0.2)',
    padding: '16px',
    borderRadius: '50%',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px'
  },
  message: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 16px',
    maxWidth: '260px',
    lineHeight: 1.5
  },
  instructions: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: '0 0 24px',
    maxWidth: '250px',
    lineHeight: 1.5
  },
  retryButton: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  deniedStatus: {
    position: 'absolute' as const,
    bottom: '16px',
    fontSize: '10px',
    color: 'rgba(255, 105, 97, 0.6)'
  }
}

export function PermissionErrorOverlay({
  language = 'en',
  onRetry
}: {
  language?: string
  onRetry?: () => void | Promise<void>
}): ReactElement {
  const lang = (language === 'pt' ? 'pt' : 'en') as 'en' | 'pt'
  const { cameraPermission, checkPermissions } = usePermissions()
  const platform = detectPlatform()

  const handleRetry = async (): Promise<void> => {
    await checkPermissions()
    if (onRetry) {
      await onRetry()
      return
    }
    window.location.reload()
  }

  const getInstructions = (): string => {
    if (platform === 'mac') return t('camera.error.mac', lang)
    if (platform === 'win') return t('camera.error.win', lang)
    return t('camera.error.default', lang)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.iconWrap}>
        <CameraOff size={44} color="#ff6961" />
      </div>
      <h2 style={styles.title}>{t('camera.error.title', lang)}</h2>
      <p style={styles.message}>{t('camera.error.message', lang)}</p>
      <p style={styles.instructions}>{getInstructions()}</p>

      <div style={{ display: 'flex', gap: '12px' }}>
        {(platform === 'mac' || platform === 'win') && (
          <button
            onClick={() => window.electron?.ipcRenderer.invoke('open-system-settings', 'camera')}
            style={styles.retryButton}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            {t('camera.error.openSettings', lang)}
          </button>
        )}
        <button
          onClick={handleRetry}
          style={styles.retryButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
        >
          {t('camera.error.tryAgain', lang)}
        </button>
      </div>

      {cameraPermission === 'denied' && (
        <div style={styles.deniedStatus}>{t('camera.status.denied', lang)}</div>
      )}
    </div>
  )
}
