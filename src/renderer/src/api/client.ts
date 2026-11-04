import createClient from 'openapi-fetch'
import type { paths } from './generated/schema'

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
})

let accessToken: string | null = null
let accessTokenExpiresAt = 0
let onUnauthorized: () => void = () => {}

export function setAccessToken(token: string, expiresInSeconds: number): void {
  if (!token.trim() || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error('Das Backend hat einen ungültigen Zugriffstoken zurückgegeben.')
  }
  accessToken = token
  accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000
}

export function clearAccessToken(): void {
  accessToken = null
  accessTokenExpiresAt = 0
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

api.use({
  onRequest({ request, schemaPath }) {
    if (schemaPath === '/auth/login' || schemaPath === '/auth/register') return request
    if (!accessToken) return request
    if (Date.now() >= accessTokenExpiresAt) {
      clearAccessToken()
      onUnauthorized()
      return request
    }

    const headers = new Headers(request.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)
    return new Request(request, { headers })
  },
  onResponse({ response, schemaPath }) {
    if (
      response.status === 401 &&
      schemaPath !== '/auth/login' &&
      schemaPath !== '/auth/register'
    ) {
      clearAccessToken()
      onUnauthorized()
    }
  }
})

export function requireApiData<T>(data: T | undefined, error: unknown, fallback: string): T {
  if (error !== undefined && error !== null) {
    throw new Error(apiErrorMessage(error, fallback))
  }
  if (data === undefined) throw new Error(fallback)
  return data
}

export function throwOnApiError(error: unknown, fallback: string): void {
  if (error !== undefined && error !== null) {
    throw new Error(apiErrorMessage(error, fallback))
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const message = error.error
    if (typeof message === 'string') return message
  }
  return fallback
}
