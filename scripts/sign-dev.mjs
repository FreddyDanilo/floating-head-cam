import { execSync } from 'child_process'
import os from 'os'

if (os.platform() === 'darwin') {
  console.log('Signing dev Electron.app with custom entitlements for audio loopback...')
  try {
    execSync(
      'codesign --force --sign - --entitlements build/entitlements.mac.plist --deep node_modules/electron/dist/Electron.app',
      { stdio: 'inherit' }
    )
    console.log('Successfully signed dev Electron.app')
  } catch (err) {
    console.warn('Failed to sign dev Electron.app', err.message)
  }
}
