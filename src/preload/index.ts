import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI } from '@electron-toolkit/preload'

const api: unknown = {}

type PreloadWindow = {
  electron: ElectronAPI
  api: unknown
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Preload runs in a context without a DOM `window` global; expose through a
  // typed view of `globalThis` instead of relying on `@ts-ignore`.
  const exposed = globalThis as unknown as PreloadWindow
  exposed.electron = electronAPI
  exposed.api = api
}
