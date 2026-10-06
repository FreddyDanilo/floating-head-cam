import { describe, it, expect } from 'vitest'
import { classifyCameraError, isCameraBlockingError, isCameraRetryableError } from './camera-errors'

function errorWithName(name: string): Error {
  const err = new Error(name)
  err.name = name
  return err
}

describe('camera-errors', () => {
  it('classifies permission denials', () => {
    expect(classifyCameraError(errorWithName('NotAllowedError'))).toBe('permission')
    expect(classifyCameraError(errorWithName('PermissionDeniedError'))).toBe('permission')
  })

  it('classifies missing devices', () => {
    expect(classifyCameraError(errorWithName('NotFoundError'))).toBe('not-found')
    expect(classifyCameraError(errorWithName('DevicesNotFoundError'))).toBe('not-found')
  })

  it('classifies busy / unreadable devices', () => {
    expect(classifyCameraError(errorWithName('NotReadableError'))).toBe('busy')
    expect(classifyCameraError(errorWithName('TrackStartError'))).toBe('busy')
  })

  it('classifies constraint and security failures', () => {
    expect(classifyCameraError(errorWithName('OverconstrainedError'))).toBe('constraint')
    expect(classifyCameraError(errorWithName('SecurityError'))).toBe('security')
  })

  it('falls back to unknown for unrecognised errors', () => {
    expect(classifyCameraError(new Error('boom'))).toBe('unknown')
    expect(classifyCameraError(undefined)).toBe('unknown')
    expect(classifyCameraError(null)).toBe('unknown')
    expect(classifyCameraError('string-error')).toBe('unknown')
  })

  it('treats every recognised failure as blocking for the UI', () => {
    expect(isCameraBlockingError(errorWithName('NotAllowedError'))).toBe(true)
    expect(isCameraBlockingError(errorWithName('NotReadableError'))).toBe(true)
    expect(isCameraBlockingError(new Error('boom'))).toBe(false)
  })

  it('only retries for not-found and busy devices', () => {
    expect(isCameraRetryableError(errorWithName('NotFoundError'))).toBe(true)
    expect(isCameraRetryableError(errorWithName('NotReadableError'))).toBe(true)
    expect(isCameraRetryableError(errorWithName('NotAllowedError'))).toBe(false)
    expect(isCameraRetryableError(errorWithName('SecurityError'))).toBe(false)
  })
})
