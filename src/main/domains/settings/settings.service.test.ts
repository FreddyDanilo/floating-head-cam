import { describe, it, expect, beforeEach, vi } from 'vitest'
import { join } from 'path'
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData'),
    getLocale: vi.fn(() => 'en-US')
  }
}))
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn()
  }
}))
import fs from 'fs'
describe('settings.service', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })
  describe('loadSettings', () => {
    it('does nothing when settings file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const { loadSettings, shortcuts, currentState, defaultShortcuts, defaultState } =
        await import('./settings.service')
      loadSettings()
      expect(shortcuts.topLeft).toBe(defaultShortcuts.topLeft)
      expect(currentState.shape).toBe(defaultState.shape)
    })
    it('loads shortcuts from file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ shortcuts: { topLeft: 'Ctrl+1' }, state: {} })
      )
      const { loadSettings, shortcuts } = await import('./settings.service')
      loadSettings()
      expect(shortcuts.topLeft).toBe('Ctrl+1')
    })
    it('loads state from file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ shortcuts: {}, state: { shape: 'square', sizeIndex: 2 } })
      )
      const { loadSettings, currentState } = await import('./settings.service')
      loadSettings()
      expect(currentState.shape).toBe('square')
      expect(currentState.sizeIndex).toBe(2)
    })
    it('silently ignores malformed JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('NOT_JSON{{{')
      const { loadSettings, shortcuts, defaultShortcuts } = await import('./settings.service')
      expect(() => loadSettings()).not.toThrow()
      expect(shortcuts.topLeft).toBe(defaultShortcuts.topLeft)
    })
  })
  describe('saveSettings', () => {
    it('writes settings JSON to the correct path', async () => {
      const { saveSettings } = await import('./settings.service')
      saveSettings()
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join('/mock/userData', 'settings.json'),
        expect.stringContaining('"shortcuts"')
      )
    })
    it('JSON contains both shortcuts and state', async () => {
      const { saveSettings } = await import('./settings.service')
      saveSettings()
      const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
      const parsed = JSON.parse(written)
      expect(parsed).toHaveProperty('shortcuts')
      expect(parsed).toHaveProperty('state')
    })
  })
  describe('resetToDefaults', () => {
    it('restores default shortcuts', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ shortcuts: { topLeft: 'Ctrl+1' }, state: {} })
      )
      const { loadSettings, resetToDefaults, shortcuts, defaultShortcuts } =
        await import('./settings.service')
      loadSettings()
      resetToDefaults()
      expect(shortcuts.topLeft).toBe(defaultShortcuts.topLeft)
    })
    it('preserves devices and selectedDeviceId from current state', async () => {
      const { currentState, resetToDefaults } = await import('./settings.service')
      currentState.devices = [{ deviceId: 'cam1', label: 'Cam' }]
      currentState.selectedDeviceId = 'cam1'
      resetToDefaults()
      expect(currentState.devices).toEqual([{ deviceId: 'cam1', label: 'Cam' }])
      expect(currentState.selectedDeviceId).toBe('cam1')
    })
    it('resets shape back to default', async () => {
      const { currentState, resetToDefaults, defaultState } = await import('./settings.service')
      currentState.shape = 'square'
      resetToDefaults()
      expect(currentState.shape).toBe(defaultState.shape)
    })
  })
})
