import { shell } from 'electron'
import type { MediaPermissionStatus, PlatformPermissions } from '../shared/types'

/**
 * Windows 10/11 does not expose a public API for desktop (Win32) apps to
 * query the camera privacy toggles:
 *   Settings > Privacy & security > Camera
 *     - "Camera access"
 *     - "Let apps access your camera"
 *     - "Let desktop apps access your camera"
 *
 * Chromium/Electron surfaces the real outcome through getUserMedia() errors
 * (NotAllowedError when a toggle blocks access). The renderer maps those
 * errors to UI states, so reporting 'unknown' here is the honest answer —
 * never fake 'granted'.
 */
export const permissions: PlatformPermissions = {
  // mediaType intentionally ignored: Windows has no query API for desktop apps.
  async getMediaPermissionStatus(): Promise<MediaPermissionStatus> {
    return 'unknown'
  },

  openSystemCameraSettings(): boolean {
    try {
      // ms-settings deep link to the Camera privacy page (user-initiated only).
      void shell.openExternal('ms-settings:privacy-webcam')
      return true
    } catch (err) {
      console.error('[platform/windows] failed to open camera settings:', err)
      return false
    }
  }
}
