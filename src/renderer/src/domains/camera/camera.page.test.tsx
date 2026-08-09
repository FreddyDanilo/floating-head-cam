import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
const mockInvoke = vi.fn()
const mockSend = vi.fn()
const mockOn = vi.fn()
const mockRemoveAllListeners = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).electron = {
    ipcRenderer: { invoke: mockInvoke, send: mockSend, on: mockOn, removeAllListeners: mockRemoveAllListeners }
  }
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({}),
      enumerateDevices: vi.fn().mockResolvedValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  })
})
import { CameraPage } from './camera.page'
describe('CameraPage', () => {
  it('renders app-container element', () => {
    mockInvoke.mockReturnValue(new Promise(() => {}))
    const { container } = render(<CameraPage />)
    expect(container.querySelector('.app-container')).toBeTruthy()
  })
  it('renders video element after receiving initial state', async () => {
    mockInvoke.mockResolvedValue({
      isMirrored: false, shape: 'circle', sizeIndex: 0,
      rounding: 24, alwaysOnTop: true, isCameraOn: true
    })
    const { container } = render(<CameraPage />)
    await waitFor(() => {
      expect(container.querySelector('video')).toBeTruthy()
    })
  })
  it('applies 50% border-radius when shape is circle', async () => {
    mockInvoke.mockResolvedValue({
      isMirrored: false, shape: 'circle', sizeIndex: 0,
      rounding: 24, alwaysOnTop: true, isCameraOn: false
    })
    const { container } = render(<CameraPage />)
    await waitFor(() => {
      const el = container.querySelector('.app-container') as HTMLElement
      expect(el?.style.borderRadius).toBe('50%')
    })
  })
  it('applies rounding border-radius when shape is square', async () => {
    mockInvoke.mockResolvedValue({
      isMirrored: false, shape: 'square', sizeIndex: 0,
      rounding: 16, alwaysOnTop: true, isCameraOn: false
    })
    const { container } = render(<CameraPage />)
    await waitFor(() => {
      const el = container.querySelector('.app-container') as HTMLElement
      expect(el?.style.borderRadius).toBe('16px')
    })
  })
  it('applies scaleX(-1) transform when mirrored', async () => {
    mockInvoke.mockResolvedValue({
      isMirrored: true, shape: 'circle', sizeIndex: 0,
      rounding: 24, alwaysOnTop: true, isCameraOn: false
    })
    const { container } = render(<CameraPage />)
    await waitFor(() => {
      const video = container.querySelector('video') as HTMLVideoElement
      expect(video?.style.transform).toBe('scaleX(-1)')
    })
  })
  it('applies scaleX(1) when not mirrored', async () => {
    mockInvoke.mockResolvedValue({
      isMirrored: false, shape: 'circle', sizeIndex: 0,
      rounding: 24, alwaysOnTop: true, isCameraOn: false
    })
    const { container } = render(<CameraPage />)
    await waitFor(() => {
      const video = container.querySelector('video') as HTMLVideoElement
      expect(video?.style.transform).toBe('scaleX(1)')
    })
  })
})
