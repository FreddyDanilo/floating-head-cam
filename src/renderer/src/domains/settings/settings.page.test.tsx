import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
const mockInvoke = vi.fn()
const mockSend = vi.fn()
const mockOn = vi.fn()
const mockRemoveAllListeners = vi.fn()
vi.mock('lucide-react', () => ({
  Keyboard: () => <span data-testid="keyboard-icon" />,
  Clapperboard: () => <span data-testid="clapperboard-icon" />,
  RotateCcw: () => <span data-testid="rotate-icon" />
}))
beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).electron = {
    ipcRenderer: { invoke: mockInvoke, send: mockSend, on: mockOn, removeAllListeners: mockRemoveAllListeners }
  }
  mockInvoke.mockResolvedValue({
    topLeft: 'Alt+Q', topRight: 'Alt+E', leftMiddle: 'Alt+A',
    center: 'Alt+S', rightMiddle: 'Alt+D', bottomLeft: 'Alt+Z',
    bottomRight: 'Alt+C', mirror: 'Alt+M', alwaysOnTop: 'Alt+T',
    shapeCircle: '', shapeSquare: '', shapeVertical: '', shapeHorizontal: '',
    sizeSmall: '1', sizeMedium: '2', sizeLarge: '3'
  })
})
import { SettingsPage } from './settings.page'
describe('SettingsPage', () => {
  it('renders the app title', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Floating Head Cam')).toBeTruthy()
  })
  it('renders all section headings', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Positioning')).toBeTruthy()
    expect(screen.getByText('Camera Control')).toBeTruthy()
    expect(screen.getByText('Camera Shape')).toBeTruthy()
    expect(screen.getByText('Sizing')).toBeTruthy()
  })
  it('renders all shortcut labels', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Top Left')).toBeTruthy()
    expect(screen.getByText('Toggle Mirror')).toBeTruthy()
    expect(screen.getByText('Size: Small')).toBeTruthy()
  })
  it('shows formatted shortcuts after IPC load', async () => {
    const { container } = render(<SettingsPage />)
    await waitFor(() => {
      expect(container.textContent).toContain('⌥ Q')
    })
  })
  it('renders Reset to Factory Defaults button', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Reset to Factory Defaults')).toBeTruthy()
  })
  it('clicking reset button sends reset-settings IPC', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Reset to Factory Defaults'))
    expect(mockSend).toHaveBeenCalledWith('reset-settings')
  })
  it('clicking a shortcut box enters listening mode showing Press Keys...', async () => {
    const { container } = render(<SettingsPage />)
    const shortcutBoxes = container.querySelectorAll('div.settings-shortcut')
    expect(shortcutBoxes.length).toBeGreaterThan(0)
    fireEvent.click(shortcutBoxes[0])
    await waitFor(() => {
      expect(screen.getByText('Press Keys...')).toBeTruthy()
    })
  })
  it('shows Unbound for empty shortcut values', async () => {
    mockInvoke.mockResolvedValue({
      shapeCircle: '', shapeSquare: '', shapeVertical: '', shapeHorizontal: ''
    })
    const { container } = render(<SettingsPage />)
    await waitFor(() => {
      expect(container.textContent).toContain('Unbound')
    })
  })
})
