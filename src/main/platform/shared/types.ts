/**
 * Media permission statuses shared across platform implementations.
 *
 * On Windows there is NO public API to query the OS camera privacy state for
 * desktop apps — Chromium/Electron surfaces the real outcome through
 * getUserMedia() errors, which the renderer treats as the source of truth.
 * Returning 'unknown' instead of a fake 'granted' keeps the UI honest.
 */
export type MediaPermissionStatus =
  'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown'

export type MediaType = 'camera' | 'microphone'

export interface PlatformPermissions {
  /** Queries (and on macOS may prompt for) media access status. */
  getMediaPermissionStatus(mediaType: MediaType): Promise<MediaPermissionStatus>
  /**
   * Opens the OS camera privacy settings page.
   * Must only ever be called from an explicit user action.
   * Returns true when a settings surface was launched.
   */
  openSystemCameraSettings(): boolean
}
