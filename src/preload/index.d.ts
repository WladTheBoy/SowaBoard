import { ElectronAPI } from '@electron-toolkit/preload'
import type { ApiRequest, ApiResponse } from '../shared/api'
import type { AuthSession } from '../shared/auth'

interface SowaBoardAPI extends ElectronAPI {
  apiRequest: (request: ApiRequest) => Promise<ApiResponse>
  auth: {
    login: (username: string, password: string) => Promise<AuthSession>
    register: (username: string, password: string) => Promise<AuthSession>
  }
}

declare global {
  interface Window {
    electron: SowaBoardAPI
  }
}
