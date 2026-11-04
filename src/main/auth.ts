import type { AuthSession } from '../shared/auth'
import { apiBaseUrl } from './api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function authenticate(
  endpoint: 'login' | 'register',
  username: unknown,
  password: unknown
): Promise<AuthSession> {
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.trim().length < 3 ||
    username.trim().length > 50 ||
    password.length === 0 ||
    password.length > 128
  ) {
    throw new Error('Benutzername oder Passwort ist ungültig.')
  }

  const response = await fetch(new URL(`/auth/${endpoint}`, apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password })
  })

  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (response.ok) throw error
  }

  if (!response.ok) {
    if (isRecord(body) && typeof body.error === 'string') {
      throw new Error(body.error)
    }
    throw new Error(`Die Anfrage ist fehlgeschlagen (HTTP ${response.status}).`)
  }

  if (
    !isRecord(body) ||
    typeof body.accessToken !== 'string' ||
    body.tokenType !== 'Bearer' ||
    typeof body.expiresIn !== 'number' ||
    !isRecord(body.user) ||
    typeof body.user.id !== 'string' ||
    typeof body.user.username !== 'string'
  ) {
    throw new Error('Das Backend hat eine ungültige Anmeldeantwort zurückgegeben.')
  }

  return {
    accessToken: body.accessToken,
    tokenType: 'Bearer',
    expiresIn: body.expiresIn,
    user: {
      id: body.user.id,
      username: body.user.username
    }
  }
}

export function login(username: unknown, password: unknown): Promise<AuthSession> {
  return authenticate('login', username, password)
}

export function register(username: unknown, password: unknown): Promise<AuthSession> {
  if (typeof password === 'string' && password.length < 8) {
    throw new Error('Das Passwort muss mindestens 8 Zeichen lang sein.')
  }
  return authenticate('register', username, password)
}
