/**
 * Shared classification for `getUserMedia` failures so every camera code path
 * reacts to the same error names in the same way across platforms.
 */
export type CameraErrorKind =
  'permission' | 'not-found' | 'busy' | 'constraint' | 'security' | 'unknown'

export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = (err as { name?: string })?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'permission'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not-found'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'busy'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'constraint'
    case 'SecurityError':
      return 'security'
    default:
      return 'unknown'
  }
}

/**
 * True when the camera cannot be used right now, meaning the UI should show a
 * guidance overlay instead of silently rendering nothing.
 */
export function isCameraBlockingError(err: unknown): boolean {
  return classifyCameraError(err) !== 'unknown'
}

/**
 * True when retrying the capture shortly after may succeed (device still
 * registering, or temporarily busy / in use by another app).
 */
export function isCameraRetryableError(err: unknown): boolean {
  const kind = classifyCameraError(err)
  return kind === 'not-found' || kind === 'busy'
}
