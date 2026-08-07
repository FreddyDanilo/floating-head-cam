import { describe, it, expect, beforeEach } from 'vitest'
import { getIsCameraOn, setIsCameraOn } from './camera.service'
describe('camera.service', () => {
  beforeEach(() => {
    setIsCameraOn(false)
  })
  it('starts with camera off', () => {
    expect(getIsCameraOn()).toBe(false)
  })
  it('setIsCameraOn(true) turns camera on', () => {
    setIsCameraOn(true)
    expect(getIsCameraOn()).toBe(true)
  })
  it('setIsCameraOn(false) turns camera off', () => {
    setIsCameraOn(true)
    setIsCameraOn(false)
    expect(getIsCameraOn()).toBe(false)
  })
  it('multiple state transitions work correctly', () => {
    setIsCameraOn(true)
    expect(getIsCameraOn()).toBe(true)
    setIsCameraOn(false)
    expect(getIsCameraOn()).toBe(false)
    setIsCameraOn(true)
    expect(getIsCameraOn()).toBe(true)
  })
})
