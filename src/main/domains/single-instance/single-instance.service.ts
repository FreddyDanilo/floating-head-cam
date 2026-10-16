import { app } from 'electron'

/**
 * Ensures only one instance of the app runs at a time. Launching the app again
 * (e.g. from a shortcut while it is already in the tray) would otherwise spawn
 * a second camera window and a second tray icon.
 *
 * Returns false when another instance already holds the lock; in that case the
 * app is quitting and startup should be skipped.
 */
export function ensureSingleInstance(onSecondInstance: () => void): boolean {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return false
  }
  app.on('second-instance', () => onSecondInstance())
  return true
}
