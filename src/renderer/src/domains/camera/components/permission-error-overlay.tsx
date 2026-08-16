import { useEffect, useState } from 'react'
import { CameraOff } from 'lucide-react'
import { usePermissions } from '../hooks/use-permissions'
import { t } from '../../../../../shared/i18n'

export function PermissionErrorOverlay({ language = 'en' }: { language?: string }) {
  const lang = (language === 'pt' ? 'pt' : 'en') as 'en' | 'pt'
  const { cameraPermission, checkPermissions } = usePermissions()
  const [platform, setPlatform] = useState<string>('unknown')

  useEffect(() => {
    if (navigator.userAgent.indexOf('Mac') !== -1) {
      setPlatform('mac')
    } else if (navigator.userAgent.indexOf('Win') !== -1) {
      setPlatform('win')
    } else if (navigator.userAgent.indexOf('Linux') !== -1) {
      setPlatform('linux')
    }
  }, [])

  const handleRetry = async (): Promise<void> => {
    await checkPermissions()
    window.location.reload()
  }

  const getInstructions = (): string => {
    if (platform === 'mac') return t('camera.error.mac', lang)
    if (platform === 'win') return t('camera.error.win', lang)
    return t('camera.error.default', lang)
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-6 text-center backdrop-blur-md rounded-2xl border border-red-500/30">
      <div className="bg-red-500/20 p-4 rounded-full mb-4">
        <CameraOff size={48} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">
        {t('camera.error.title', lang)}
      </h2>
      <p className="text-sm text-gray-300 mb-4 max-w-xs">
        {t('camera.error.message', lang)}
      </p>
      <p className="text-xs text-gray-400 mb-6 max-w-[250px]">
        {getInstructions()}
      </p>
      
      <button 
        onClick={handleRetry}
        className="px-5 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium border border-white/10"
      >
        {t('camera.error.tryAgain', lang)}
      </button>

      {cameraPermission === 'denied' && (
        <div className="absolute bottom-4 text-[10px] text-red-400/50">
          {t('camera.status.denied', lang)}
        </div>
      )}
    </div>
  )
}
