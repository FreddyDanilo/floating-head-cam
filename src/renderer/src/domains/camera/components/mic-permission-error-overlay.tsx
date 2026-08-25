import type { ReactElement } from 'react'
import { Mic } from 'lucide-react'
import { usePermissions } from '../hooks/use-permissions'
import { t } from '../../../../../shared/i18n'

function detectPlatform(): string {
  if (navigator.userAgent.indexOf('Mac') !== -1) return 'mac'
  if (navigator.userAgent.indexOf('Win') !== -1) return 'win'
  return 'default'
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '24px',
    background: 'rgba(10, 10, 12, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#ffffff',
    zIndex: 9999
  },
  iconWrap: {
    background: 'rgba(255, 159, 10, 0.18)',
    padding: '18px',
    borderRadius: '50%',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 159, 10, 0.35)'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px'
  },
  message: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 12px',
    maxWidth: '280px',
    lineHeight: 1.5
  },
  instructions: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: '0 0 24px',
    maxWidth: '260px',
    lineHeight: 1.6,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '10px 14px'
  },
  retryButton: {
    padding: '10px 22px',
    background: 'rgba(255, 159, 10, 0.2)',
    border: '1px solid rgba(255, 159, 10, 0.4)',
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
    color: 'rgba(255, 159, 10, 0.5)'
  }
}

export function MicPermissionErrorOverlay({
  language = 'en',
  onRetry
}: {
  language?: string
  onRetry?: () => void | Promise<void>
}): ReactElement {
  const lang = (language === 'pt' ? 'pt' : 'en') as 'en' | 'pt'
  const { microphonePermission, checkPermissions } = usePermissions()
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
    if (platform === 'mac') return t('mic.error.mac', lang)
    if (platform === 'win') return t('mic.error.win', lang)
    return t('mic.error.default', lang)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.iconWrap}>
        <Mic size={44} color="#ff9f0a" />
      </div>
      <h2 style={styles.title}>{t('mic.error.title', lang)}</h2>
      <p style={styles.message}>{t('mic.error.message', lang)}</p>
      <p style={styles.instructions}>{getInstructions()}</p>

      <button
        onClick={handleRetry}
        style={styles.retryButton}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 159, 10, 0.35)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 159, 10, 0.2)')}
      >
        {t('mic.error.tryAgain', lang)}
      </button>

      {microphonePermission === 'denied' && (
        <div style={styles.deniedStatus}>{t('mic.status.denied', lang)}</div>
      )}
    </div>
  )
}
