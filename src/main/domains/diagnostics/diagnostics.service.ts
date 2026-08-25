import { BrowserWindow } from 'electron'

export interface DiagnosticsReport {
  platform: string
  arch: string
  electronVersion: string
  rendererPID?: number
  windowBounds?: { x: number; y: number; width: number; height: number }
  displays: Array<{
    id: string
    bounds: { x: number; y: number; width: number; height: number }
    workArea: { x: number; y: number; width: number; height: number }
    scaleFactor: number
  }>
  timestamp: string
}

export async function captureRendererProbe(): Promise<void> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win || win.isDestroyed()) return
  try {
    const image = await win.capturePage()
    const buffer = image.toPNG()
    console.log(`[diagnostics] renderer probe captured: ${buffer.length} bytes`)
  } catch (err) {
    console.error('[diagnostics] renderer probe failed:', err)
  }
}

export async function captureSettingsProbe(): Promise<void> {
  const settingsWin = BrowserWindow.getAllWindows().find((w) =>
    w.webContents.getURL().includes('#/settings')
  )
  if (!settingsWin || settingsWin.isDestroyed()) return
  try {
    const image = await settingsWin.capturePage()
    const buffer = image.toPNG()
    console.log(`[diagnostics] settings probe captured: ${buffer.length} bytes`)
  } catch (err) {
    console.error('[diagnostics] settings probe failed:', err)
  }
}

export function handleDiagnosticsReport(report: DiagnosticsReport): void {
  console.log('[diagnostics] received report:', JSON.stringify(report, null, 2))
}
