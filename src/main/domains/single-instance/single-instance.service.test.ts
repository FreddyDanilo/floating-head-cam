import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from 'electron'
import { ensureSingleInstance } from './single-instance.service'

vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: vi.fn(),
    quit: vi.fn(),
    on: vi.fn()
  }
}))

describe('ensureSingleInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true and does not quit when the lock is acquired', () => {
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(true)

    expect(ensureSingleInstance(vi.fn())).toBe(true)
    expect(app.quit).not.toHaveBeenCalled()
  })

  it('returns false and quits when another instance already holds the lock', () => {
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(false)

    expect(ensureSingleInstance(vi.fn())).toBe(false)
    expect(app.quit).toHaveBeenCalledOnce()
  })

  it('does not register a second-instance handler when the lock is not acquired', () => {
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(false)

    ensureSingleInstance(vi.fn())

    expect(app.on).not.toHaveBeenCalled()
  })

  it('invokes the callback when a second instance is launched', () => {
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(true)
    const onSecondInstance = vi.fn()

    ensureSingleInstance(onSecondInstance)

    expect(app.on).toHaveBeenCalledWith('second-instance', expect.any(Function))
    const handler = vi.mocked(app.on).mock.calls[0][1] as () => void
    handler()
    expect(onSecondInstance).toHaveBeenCalledOnce()
  })
})
