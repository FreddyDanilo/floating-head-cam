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

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    ipc.invoke('get-shortcuts').then((data) => {
      setShortcuts(data)
    })
    ipc.invoke('get-initial-state').then((data) => {
      if (data.language) setLanguage(data.language)
    })
    const handleReset = (_e: any, payload: any) => {
      setShortcuts(payload.shortcuts)
      if (payload.state?.language) setLanguage(payload.state.language)
    }
    const handleSyncLanguage = (_e: any, lang: 'en' | 'pt') => setLanguage(lang)
    ipc.on('settings-reset', handleReset)
    ipc.on('sync-language', handleSyncLanguage)
    return () => {
      ipc.removeAllListeners('settings-reset')
      ipc.removeAllListeners('sync-language')
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

  return { shortcuts, listeningKey, setListeningKey, resetSettings, formatMacShortcut, language, setAppLanguage }
}
