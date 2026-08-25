import type { MediaPermissionStatus, PlatformPermissions } from './types'

/**
 * Generic fallback for platforms without a dedicated implementation
 * (Linux and others). There is no reliable way to query desktop camera
 * privacy state, so we report 'unknown' and let getUserMedia() errors be the
 * source of truth — same contract as the Windows implementation.
 */
export const permissions: PlatformPermissions = {
  // mediaType intentionally ignored: no query API available on this platform.
  async getMediaPermissionStatus(): Promise<MediaPermissionStatus> {
    return 'unknown'
  },

  openSystemCameraSettings(): boolean {
    console.warn('[platform/shared] openSystemCameraSettings is not supported on this platform')
    return false
  }
}
