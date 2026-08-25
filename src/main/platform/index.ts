import * as macos from './macos/permissions'
import * as shared from './shared/permissions'
import * as windows from './windows/permissions'
import type { PlatformPermissions } from './shared/types'

export type { MediaPermissionStatus, MediaType, PlatformPermissions } from './shared/types'

/**
 * Resolves the platform-specific implementation once at module load.
 * The rest of the main process depends on capabilities, never on
 * `process.platform` checks scattered through the code.
 */
function resolvePermissions(): PlatformPermissions {
  switch (process.platform) {
    case 'darwin':
      return macos.permissions
    case 'win32':
      return windows.permissions
    default:
      return shared.permissions
  }
}

export const platformPermissions: PlatformPermissions = resolvePermissions()
