import { useEffect, useState } from 'react'
export function formatMacShortcut(shortcut: string): string {
  if (!shortcut) return 'Unbound'
  return shortcut
    .replace(/CmdOrCtrl/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/CommandOrControl/g, '⌘')
    .replace(/Alt/g, '⌥')
    .replace(/Shift/g, '⇧')
    .replace(/Control/g, '⌃')
    .replace(/Ctrl/g, '⌃')
    .replace(/\+/g, ' ')
}
function codeToKey(code: string): string {
  if (code.startsWith('Key')) return code.replace('Key', '')
  if (code.startsWith('Digit')) return code.replace('Digit', '')
  if (code === 'Space') return 'Space'
  if (code.includes('Arrow')) return code.replace('Arrow', '')
  return code
}
export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({})
  const [listeningKey, setListeningKey] = useState<string | null>(null)
  const [language, setLanguage] = useState<'en' | 'pt'>('en')

  const [visualState, setVisualState] = useState<{
    shape: string
    rounding: number
    borderGradient: string
    borderWidth: number
  }>({
    shape: 'circle',
    rounding: 24,
    borderGradient: 'none',
    borderWidth: 4
  })

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    ipc.invoke('get-shortcuts').then((data) => {
      setShortcuts(data)
    })
    ipc.invoke('get-initial-state').then((data) => {
      if (data.language) setLanguage(data.language)
      setVisualState({
        shape: data.shape || 'circle',
        rounding: data.rounding ?? 24,
        borderGradient: data.borderGradient || 'none',
        borderWidth: data.borderWidth ?? 4
      })
    })
    const handleReset = (_e: any, payload: any) => {
      setShortcuts(payload.shortcuts)
      if (payload.state?.language) setLanguage(payload.state.language)
      if (payload.state) {
        setVisualState({
          shape: payload.state.shape || 'circle',
          rounding: payload.state.rounding ?? 24,
          borderGradient: payload.state.borderGradient || 'none',
          borderWidth: payload.state.borderWidth ?? 4
        })
      }
    }
    const handleSyncLanguage = (_e: any, lang: 'en' | 'pt') => setLanguage(lang)
    
    // Add handler for setting sync if updated elsewhere
    const handleSyncSetting = (_e: any, { key, value }: { key: string, value: any }) => {
      setVisualState(prev => ({ ...prev, [key]: value }))
    }

    ipc.on('settings-reset', handleReset)
    ipc.on('sync-language', handleSyncLanguage)
    ipc.on('sync-setting', handleSyncSetting)
    return () => {
      ipc.removeAllListeners('settings-reset')
      ipc.removeAllListeners('sync-language')
      ipc.removeAllListeners('sync-setting')
    }
  }, [])

  useEffect(() => {
    if (!listeningKey) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const modifiers = ['MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight']
      if (modifiers.includes(e.code)) return
      const keys: string[] = []
      if (e.metaKey || e.ctrlKey) keys.push('CmdOrCtrl')
      if (e.altKey) keys.push('Alt')
      if (e.shiftKey) keys.push('Shift')
      keys.push(codeToKey(e.code))
      const shortcutString = keys.join('+')
      window.electron?.ipcRenderer.send('update-shortcut', listeningKey, shortcutString)
      setShortcuts((prev) => ({ ...prev, [listeningKey!]: shortcutString }))
      setListeningKey(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [listeningKey])

  const resetSettings = () => {
    window.electron?.ipcRenderer.send('reset-settings')
  }

  const setAppLanguage = (lang: 'en' | 'pt') => {
    setLanguage(lang)
    window.electron?.ipcRenderer.send('sync-tray', { language: lang })
  }

  const updateVisualState = (key: keyof typeof visualState, value: string | number) => {
    setVisualState((prev) => ({ ...prev, [key]: value }))
    window.electron?.ipcRenderer.send('update-setting', { key, value })
  }

  return { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, setAppLanguage, visualState, updateVisualState }
}
