import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { ApiRequest, ApiResponse } from '../shared/api'
import type { AuthSession } from '../shared/auth'

const api = {
  ...electronAPI,
  apiRequest: (request: ApiRequest): Promise<ApiResponse> =>
    ipcRenderer.invoke('api:request', request),
  auth: {
    login: (username: string, password: string): Promise<AuthSession> =>
      ipcRenderer.invoke('auth:login', username, password),
    register: (username: string, password: string): Promise<AuthSession> =>
      ipcRenderer.invoke('auth:register', username, password)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    console.error('Die App-Schnittstelle konnte nicht bereitgestellt werden.', error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = api
}
