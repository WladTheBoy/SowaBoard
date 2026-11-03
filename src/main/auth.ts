import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

export interface Profile {
  id: string
  username: string
}

interface Account extends Profile {
  normalizedUsername: string
  salt: string
  passwordHash: string
}

interface Session {
  profileId: string
}

const accountsPath = (): string => join(app.getPath('userData'), 'accounts.json')
const sessionPath = (): string => join(app.getPath('userData'), 'session.json')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return null
    throw error
  }
}

async function readAccounts(): Promise<Account[]> {
  const saved = await readJson(accountsPath())
  if (saved === null) return []
  if (
    !Array.isArray(saved) ||
    !saved.every(
      (account) =>
        isRecord(account) &&
        typeof account.id === 'string' &&
        typeof account.username === 'string' &&
        typeof account.normalizedUsername === 'string' &&
        typeof account.salt === 'string' &&
        typeof account.passwordHash === 'string'
    )
  ) {
    throw new Error('Die gespeicherten Profile konnten nicht gelesen werden.')
  }
  return saved as Account[]
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  const path = accountsPath()
  const temporaryPath = `${path}.${randomBytes(8).toString('hex')}.tmp`
  await writeFile(temporaryPath, JSON.stringify(accounts), { mode: 0o600 })
  await rename(temporaryPath, path)
}

function validateCredentials(username: string, password: string): string {
  const normalizedUsername = username.trim().toLocaleLowerCase('de')
  if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim())) {
    throw new Error(
      'Der Benutzername muss 3 bis 32 Zeichen haben und darf Buchstaben, Zahlen, Punkt, _ oder - enthalten.'
    )
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error('Das Passwort muss zwischen 8 und 128 Zeichen lang sein.')
  }
  return normalizedUsername
}

async function saveSession(profileId: string): Promise<void> {
  await writeFile(sessionPath(), JSON.stringify({ profileId } satisfies Session), { mode: 0o600 })
}

export async function getAuthState(): Promise<{ profile: Profile | null; hasProfiles: boolean }> {
  const accounts = await readAccounts()
  const saved = await readJson(sessionPath())
  if (saved === null) return { profile: null, hasProfiles: accounts.length > 0 }
  if (!isRecord(saved) || typeof saved.profileId !== 'string') {
    throw new Error('Die gespeicherte Anmeldung ist ungültig.')
  }
  const account = accounts.find((item) => item.id === saved.profileId)
  if (!account) throw new Error('Das angemeldete Profil wurde nicht gefunden.')
  return {
    profile: { id: account.id, username: account.username },
    hasProfiles: accounts.length > 0
  }
}

export async function registerProfile(username: string, password: string): Promise<Profile> {
  const normalizedUsername = validateCredentials(username, password)
  const accounts = await readAccounts()
  if (accounts.some((account) => account.normalizedUsername === normalizedUsername)) {
    throw new Error('Für diesen Benutzernamen gibt es bereits ein Profil.')
  }

  const salt = randomBytes(16).toString('hex')
  const account: Account = {
    id: randomBytes(16).toString('hex'),
    username: username.trim(),
    normalizedUsername,
    salt,
    passwordHash: scryptSync(password, salt, 64).toString('hex')
  }
  await writeAccounts([...accounts, account])
  await saveSession(account.id)
  return { id: account.id, username: account.username }
}

export async function loginProfile(username: string, password: string): Promise<Profile> {
  const normalizedUsername = username.trim().toLocaleLowerCase('de')
  if (username.length > 32 || password.length > 128) {
    throw new Error('Benutzername oder Passwort ist falsch.')
  }
  const accounts = await readAccounts()
  const account = accounts.find((item) => item.normalizedUsername === normalizedUsername)
  const salt = account?.salt ?? 'sowaboard-login-salt'
  const passwordHash = scryptSync(password, salt, 64)
  if (
    !account ||
    passwordHash.length !== Buffer.from(account.passwordHash, 'hex').length ||
    !timingSafeEqual(passwordHash, Buffer.from(account.passwordHash, 'hex'))
  ) {
    throw new Error('Benutzername oder Passwort ist falsch.')
  }
  await saveSession(account.id)
  return { id: account.id, username: account.username }
}

export async function logoutProfile(): Promise<void> {
  try {
    await unlink(sessionPath())
  } catch (error) {
    if (!(isRecord(error) && error.code === 'ENOENT')) throw error
  }
}
