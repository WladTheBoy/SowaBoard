export interface AuthenticatedUser {
  id: string
  username: string
}

export interface AuthSession {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AuthenticatedUser
}
