import { useState } from 'react'

interface Profile {
  id: string
  username: string
}

interface LoginProps {
  hasProfiles: boolean
  initialError?: string
  onAuthenticated: (profile: Profile) => void
}

function Login({ hasProfiles, initialError, onAuthenticated }: LoginProps): React.JSX.Element {
  const [isRegistering, setIsRegistering] = useState(!hasProfiles)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const profile = isRegistering
        ? await window.api.auth.register(username, password)
        : await window.api.auth.login(username, password)
      onAuthenticated(profile)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Anmeldung ist fehlgeschlagen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-layout">
        <aside className="login-aside">
          <a className="app-brand login-brand" href="#login" aria-label="SowaBoard">
            <span className="brand-symbol">S</span>
            <span>SowaBoard</span>
          </a>
          <div className="login-intro">
            <span className="login-eyebrow">DEIN PERSÖNLICHER ARBEITSPLATZ</span>
            <h2>Ordnung für deine Arbeit.</h2>
            <p>
              Projekte und Aufgaben an einem Ort. Melde dich an und mach dort weiter, wo du
              aufgehört hast.
            </p>
          </div>
          <div className="login-aside-footer">
            <span className="login-status-mark" />
            <span>Dein Board bleibt auf diesem Gerät.</span>
          </div>
        </aside>

        <section className="login-card" aria-labelledby="login-title">
          <span className="login-eyebrow">{isRegistering ? 'NEUES PROFIL' : 'ANMELDUNG'}</span>
          <h1 id="login-title">{isRegistering ? 'Profil erstellen' : 'Willkommen zurück'}</h1>
          <p className="login-description">
            {isRegistering
              ? 'Wähle deine Zugangsdaten für SowaBoard.'
              : 'Melde dich mit deinem Profil an.'}
          </p>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span>Benutzername</span>
              <input
                autoComplete="username"
                maxLength={32}
                minLength={3}
                pattern={'[\\p{L}\\p{N}._\\-]{3,32}'}
                placeholder="Dein Benutzername"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="login-field">
              <span>Passwort</span>
              <input
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                maxLength={128}
                minLength={8}
                placeholder="Mindestens 8 Zeichen"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Bitte warten...' : isRegistering ? 'Profil erstellen' : 'Anmelden'}
            </button>
          </form>

          <p className="login-switch">
            {isRegistering ? 'Du hast schon ein Profil?' : 'Noch kein Profil?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('')
                setIsRegistering((current) => !current)
              }}
            >
              {isRegistering ? 'Jetzt anmelden' : 'Profil erstellen'}
            </button>
          </p>
          <p className="login-note">Lokale Anmeldung · keine Cloud erforderlich</p>
        </section>
      </div>
    </main>
  )
}

export default Login
