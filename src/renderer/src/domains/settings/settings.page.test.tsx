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
  it('renders all section headings (tabs)', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Positioning')).toBeTruthy()
    expect(screen.getByText('Camera Control')).toBeTruthy()
    expect(screen.getByText('Camera Shape')).toBeTruthy()
    expect(screen.getByText('Sizing')).toBeTruthy()
  })
  it('renders all shortcut labels', async () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Positioning'))
    expect(await screen.findByText('Top Left')).toBeTruthy()
    fireEvent.click(screen.getByText('Camera Control'))
    expect(await screen.findByText('Toggle Mirror')).toBeTruthy()
    fireEvent.click(screen.getByText('Sizing'))
    expect(await screen.findByText('Small')).toBeTruthy()
  })
  it('shows formatted shortcuts after IPC load', async () => {
    const { container } = render(<SettingsPage />)
    fireEvent.click(screen.getByText('Positioning'))
    await waitFor(() => {
      expect(container.textContent).toContain('⌥ Q')
    })
  })
  it('renders Restore button', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Restore')).toBeTruthy()
  })
  it('clicking reset button sends reset-settings IPC', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Restore'))
    expect(mockSend).toHaveBeenCalledWith('reset-settings', 'visuals')
  })
  it('clicking a shortcut box enters listening mode showing Press Keys...', async () => {
    const { container } = render(<SettingsPage />)
    fireEvent.click(screen.getByText('Positioning'))
    const shortcutBoxes = container.querySelectorAll('div.settings-shortcut')
    expect(shortcutBoxes.length).toBeGreaterThan(0)
    fireEvent.click(shortcutBoxes[0])
    await waitFor(() => {
      expect(screen.getByText('Press Keys...')).toBeTruthy()
    })
  })
  it('shows Unbound for empty shortcut values', async () => {
    mockInvoke.mockResolvedValue({
      topLeft: '', shapeSquare: '', shapeVertical: '', shapeHorizontal: ''
    })
    const { container } = render(<SettingsPage />)
    fireEvent.click(screen.getByText('Positioning'))
    await waitFor(() => {
      expect(container.textContent).toContain('Unbound')
    })
  })
})
