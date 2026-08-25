import { shell, systemPreferences } from 'electron'
import type { MediaPermissionStatus, MediaType, PlatformPermissions } from '../shared/types'

/**
 * macOS implements real permission handling through systemPreferences.
 * `askForMediaAccess` triggers the OS consent prompt when the status is
 * 'not-determined'.
 */
export const permissions: PlatformPermissions = {
  async getMediaPermissionStatus(mediaType: MediaType): Promise<MediaPermissionStatus> {
    const status = systemPreferences.getMediaAccessStatus(mediaType)
    if (status === 'not-determined') {
      const success = await systemPreferences.askForMediaAccess(mediaType)
      return success ? 'granted' : 'denied'
    }
    return status as MediaPermissionStatus
  },

  openSystemCameraSettings(): boolean {
    try {
      // Deep link to System Settings > Privacy & Security > Camera.
      void shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
      )
      return true
    } catch (err) {
      console.error('[platform/macos] failed to open camera settings:', err)
      return false
    }
  }
}
