import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGetMediaAccessStatus, mockAskForMediaAccess, mockGetSources, mockOpenExternal } =
  vi.hoisted(() => ({
    mockGetMediaAccessStatus: vi.fn(),
    mockAskForMediaAccess: vi.fn(),
    mockGetSources: vi.fn(),
    mockOpenExternal: vi.fn()
  }))

vi.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: mockGetMediaAccessStatus,
    askForMediaAccess: mockAskForMediaAccess
  },
  desktopCapturer: { getSources: mockGetSources },
  shell: { openExternal: mockOpenExternal }
}))

import {
  getMediaPermissionStatus,
  isTrustedOrigin,
  openSystemSettings,
  readScreenPermissionStatus,
  requestMediaAccess,
  requestScreenPermission
} from './permissions.service'

const originalPlatform = process.platform

function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

describe('permissions.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  describe('isTrustedOrigin', () => {
    it('accepts the bundled renderer origins', () => {
      expect(isTrustedOrigin('file:///Applications/App/index.html')).toBe(true)
      expect(isTrustedOrigin('http://localhost:5173/')).toBe(true)
      expect(isTrustedOrigin('http://127.0.0.1:8080')).toBe(true)
      expect(isTrustedOrigin('devtools://devtools/bundled')).toBe(true)
    })

    it('rejects remote origins', () => {
      expect(isTrustedOrigin('https://evil.example.com')).toBe(false)
      expect(isTrustedOrigin('http://10.0.0.5')).toBe(false)
    })

    it('allows an empty origin (URL not committed yet)', () => {
      expect(isTrustedOrigin('')).toBe(true)
    })
  })

  describe('getMediaPermissionStatus', () => {
    it('reads the real OS status on macOS and Windows', () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('denied')
      expect(getMediaPermissionStatus('camera')).toBe('denied')
      expect(mockGetMediaAccessStatus).toHaveBeenCalledWith('camera')

      setPlatform('win32')
      mockGetMediaAccessStatus.mockReturnValue('granted')
      expect(getMediaPermissionStatus('microphone')).toBe('granted')
    })

    it('reports granted on Linux without touching system APIs', () => {
      setPlatform('linux')
      expect(getMediaPermissionStatus('camera')).toBe('granted')
      expect(mockGetMediaAccessStatus).not.toHaveBeenCalled()
    })
  })

  describe('requestMediaAccess', () => {
    it('prompts on macOS only when the status is not determined', async () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('not-determined')
      mockAskForMediaAccess.mockResolvedValue(true)
      await expect(requestMediaAccess('camera')).resolves.toBe('granted')
      expect(mockAskForMediaAccess).toHaveBeenCalledWith('camera')
    })

    it('does not prompt on macOS when already granted', async () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('granted')
      await expect(requestMediaAccess('microphone')).resolves.toBe('granted')
      expect(mockAskForMediaAccess).not.toHaveBeenCalled()
    })

    it('surfaces restricted without prompting', async () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('restricted')
      await expect(requestMediaAccess('camera')).resolves.toBe('restricted')
      expect(mockAskForMediaAccess).not.toHaveBeenCalled()
    })

    it('on Windows denies only when the OS reports denied', async () => {
      setPlatform('win32')
      mockGetMediaAccessStatus.mockReturnValue('denied')
      await expect(requestMediaAccess('camera')).resolves.toBe('denied')

      mockGetMediaAccessStatus.mockReturnValue('not-determined')
      await expect(requestMediaAccess('camera')).resolves.toBe('granted')
    })

    it('on Linux always allows so the per-capture prompt governs', async () => {
      setPlatform('linux')
      await expect(requestMediaAccess('camera')).resolves.toBe('granted')
      expect(mockAskForMediaAccess).not.toHaveBeenCalled()
    })
  })

  describe('screen permission', () => {
    it('is always granted outside macOS', () => {
      setPlatform('win32')
      expect(readScreenPermissionStatus()).toBe('granted')
      setPlatform('linux')
      expect(readScreenPermissionStatus()).toBe('granted')
    })

    it('never nudges the macOS dialog when only reading', () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('not-determined')
      expect(readScreenPermissionStatus()).toBe('not-determined')
      expect(mockGetSources).not.toHaveBeenCalled()
    })

    it('nudges the macOS dialog when requesting and then re-reads', async () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValueOnce('not-determined').mockReturnValueOnce('granted')
      mockGetSources.mockResolvedValue([{ id: 'screen:1' }])
      await expect(requestScreenPermission()).resolves.toBe('granted')
      expect(mockGetSources).toHaveBeenCalledWith({ types: ['screen'] })
    })

    it('does not nudge when already granted', async () => {
      setPlatform('darwin')
      mockGetMediaAccessStatus.mockReturnValue('granted')
      await expect(requestScreenPermission()).resolves.toBe('granted')
      expect(mockGetSources).not.toHaveBeenCalled()
    })
  })

  describe('openSystemSettings', () => {
    it('opens the macOS privacy panes', async () => {
      setPlatform('darwin')
      mockOpenExternal.mockResolvedValue(undefined)
      await expect(openSystemSettings('camera')).resolves.toBe(true)
      expect(mockOpenExternal).toHaveBeenCalledWith(expect.stringContaining('Privacy_Camera'))
    })

    it('opens the Windows privacy panes it knows about', async () => {
      setPlatform('win32')
      mockOpenExternal.mockResolvedValue(undefined)
      await expect(openSystemSettings('microphone')).resolves.toBe(true)
      expect(mockOpenExternal).toHaveBeenCalledWith('ms-settings:privacy-microphone')
      await expect(openSystemSettings('screen')).resolves.toBe(false)
    })

    it('returns false on Linux where no deep link exists', async () => {
      setPlatform('linux')
      await expect(openSystemSettings('screen')).resolves.toBe(false)
      expect(mockOpenExternal).not.toHaveBeenCalled()
    })
  })
})
