let _isCameraOn = true

export function getIsCameraOn(): boolean {
  return _isCameraOn
}

export function setIsCameraOn(value: boolean): void {
  _isCameraOn = value
}
