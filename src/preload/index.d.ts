import { ElectronAPI } from '@electron-toolkit/preload'

interface Profile {
  id: string
  username: string
}

interface AuthState {
  profile: Profile | null
  hasProfiles: boolean
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        getState: () => Promise<AuthState>
        register: (username: string, password: string) => Promise<Profile>
        login: (username: string, password: string) => Promise<Profile>
        logout: () => Promise<void>
      }
    }
  }
}
