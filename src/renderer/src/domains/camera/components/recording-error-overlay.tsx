import type { ReactElement } from 'react'
import { VideoOff } from 'lucide-react'
import { t } from '../../../../../shared/i18n'

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
    background: 'rgba(255, 59, 48, 0.18)',
    padding: '18px',
    borderRadius: '50%',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 59, 48, 0.35)'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px'
  },
  message: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 24px',
    maxWidth: '280px',
    lineHeight: 1.5
  },
  dismissButton: {
    padding: '10px 22px',
    background: 'rgba(255, 59, 48, 0.2)',
    border: '1px solid rgba(255, 59, 48, 0.4)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  }
}

export function RecordingErrorOverlay({
  code,
  language = 'en',
  message,
  stderr,
  onDismiss
}: {
  code: string
  language?: string
  message?: string
  stderr?: string
  onDismiss: () => void
}): ReactElement {
  const lang = (language === 'pt' ? 'pt' : 'en') as 'en' | 'pt'
  const messageKey = `recording.error.${code}`

  return (
    <div style={styles.overlay}>
      <div style={styles.iconWrap}>
        <VideoOff size={44} color="#ff3b30" />
      </div>
      <h2 style={styles.title}>{t('recording.error.title', lang)}</h2>
      <p style={styles.message}>{t(messageKey, lang)}</p>
      {(message || stderr) && (
        <pre
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.4)',
            maxWidth: '300px',
            overflowX: 'auto',
            textAlign: 'left',
            marginBottom: '16px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {message}
          {stderr ? `\n---\n${stderr}` : ''}
        </pre>
      )}
      <button
        onClick={onDismiss}
        style={styles.dismissButton}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.35)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)')}
      >
        {t('recording.error.dismiss', lang)}
      </button>
    </div>
  )
}
