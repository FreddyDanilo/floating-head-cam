import { desktopCapturer, shell, systemPreferences } from 'electron'

export type PermissionState = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown'
export type MediaType = 'camera' | 'microphone'
export type SystemSettingsTarget = MediaType | 'screen'

/**
 * Origins allowed to consume camera / microphone / screen access. The app only
 * ever loads its own bundled renderer (`file://` in production, a local dev
 * server while developing), so anything else is rejected as defence in depth.
 */
export function isTrustedOrigin(originOrUrl: string): boolean {
  if (!originOrUrl) return true // webContents may not have committed a URL yet
  if (originOrUrl.startsWith('file://')) return true
  if (originOrUrl.startsWith('devtools://')) return true
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(originOrUrl)
}

/**
 * Reads the OS-level access status for a camera/microphone.
 *
 * - macOS and Windows expose a real system status through
 *   `systemPreferences.getMediaAccessStatus`.
 * - Linux has no persistent OS-level camera/mic permission: access is granted
 *   per capture through Chromium's permission handler, so we report `granted`
 *   and let the actual `getUserMedia` call decide.
 */
export function getMediaPermissionStatus(mediaType: MediaType): PermissionState {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    try {
      return systemPreferences.getMediaAccessStatus(mediaType)
    } catch (err) {
      console.warn('[permissions] getMediaAccessStatus failed:', err)
      return 'unknown'
    }
  }
  return 'granted'
}

/**
 * Requests access to a camera/microphone at the OS level.
 *
 * Only macOS can show a native consent prompt (`askForMediaAccess`). On Windows
 * the user must flip the privacy switch manually, so an already-denied status
 * is returned unchanged and the UI guides them to Settings. On Linux the
 * per-capture Chromium prompt governs access.
 */
export async function requestMediaAccess(mediaType: MediaType): Promise<PermissionState> {
  const status = getMediaPermissionStatus(mediaType)

  if (process.platform === 'darwin') {
    if (status === 'granted' || status === 'restricted' || status === 'denied') return status
    try {
      const granted = await systemPreferences.askForMediaAccess(mediaType)
      return granted ? 'granted' : 'denied'
    } catch (err) {
      console.warn('[permissions] askForMediaAccess failed:', err)
      return 'denied'
    }
  }

  if (process.platform === 'win32') {
    // Windows cannot prompt programmatically; 'denied' is authoritative,
    // everything else is left to getUserMedia.
    return status === 'denied' ? 'denied' : 'granted'
  }

  return 'granted'
}

/**
 * Reads the screen-capture permission without ever prompting.
 *
 * macOS gates screen capture behind a TCC permission; Windows and Linux have
 * no persistent screen permission - the user selects a source per capture.
 */
export function readScreenPermissionStatus(): PermissionState {
  if (process.platform !== 'darwin') return 'granted'
  try {
    return systemPreferences.getMediaAccessStatus('screen')
  } catch (err) {
    console.warn('[permissions] readScreenPermissionStatus failed:', err)
    return 'unknown'
  }
}

/**
 * Reads the screen-capture permission, nudging the macOS consent dialog once
 * when it has not been answered yet. Only call this from an explicit user
 * action (starting a recording / pressing "Try Again").
 *
 * Windows and Linux have no persistent screen permission - the user selects a
 * source for every capture.
 */
export async function requestScreenPermission(): Promise<PermissionState> {
  if (process.platform !== 'darwin') return 'granted'
  try {
    let status = systemPreferences.getMediaAccessStatus('screen')
    if (status === 'not-determined' || status === 'unknown') {
      // Enumerating sources is what triggers the macOS consent dialog.
      await desktopCapturer.getSources({ types: ['screen'] }).catch(() => [])
      status = systemPreferences.getMediaAccessStatus('screen')
    }
    return status
  } catch (err) {
    console.warn('[permissions] requestScreenPermission failed:', err)
    return 'unknown'
  }
}

/**
 * Opens the relevant OS privacy pane for the given permission. Returns whether
 * a pane could actually be opened (Linux has no standardized deep link).
 */
export async function openSystemSettings(target: SystemSettingsTarget): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      const panes: Record<SystemSettingsTarget, string> = {
        camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
        microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
        screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      }
      await shell.openExternal(panes[target])
      return true
    }

    if (process.platform === 'win32') {
      const panes: Partial<Record<SystemSettingsTarget, string>> = {
        camera: 'ms-settings:privacy-webcam',
        microphone: 'ms-settings:privacy-microphone'
      }
      const uri = panes[target]
      if (!uri) return false
      await shell.openExternal(uri)
      return true
    }

    // Linux: no standardized privacy pane deep link available.
    return false
  } catch (err) {
    console.error('[permissions] failed to open system settings:', err)
    return false
  }
}
