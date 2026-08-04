import '@testing-library/jest-dom'

Object.defineProperty(window, 'electron', {
  writable: true,
  configurable: true,
  value: undefined
})
