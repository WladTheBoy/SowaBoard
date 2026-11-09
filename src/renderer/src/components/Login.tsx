import { useState } from 'react'
import logo from '../assets/logo.svg'
import type { AuthenticatedUser } from '../../../shared/auth'
import { apiErrorMessage, setAccessToken } from '../api/client'

interface LoginProps {
  onAuthenticated: (user: AuthenticatedUser) => void
}

function Login({ onAuthenticated }: LoginProps): React.JSX.Element {
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = isRegistering
        ? await window.electron.auth.register(username, password)
        : await window.electron.auth.login(username, password)
      setAccessToken(session.accessToken, session.expiresIn)
      onAuthenticated(session.user)
    } catch (reason) {
      setError(apiErrorMessage(reason, 'Die Anmeldung ist fehlgeschlagen.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-layout">
        <aside className="login-aside">
          <a className="app-brand login-brand" href="#login" aria-label="SowaBoard">
            <img alt="" className="brand-logo" src={logo} />
            <span>SowaBoard</span>
          </a>
          <div className="login-intro">
            <span className="login-eyebrow">DEIN GEMEINSAMER ARBEITSPLATZ</span>
            <h2>Ordnung für deine Arbeit.</h2>
            <p>Projekte und Aufgaben an einem Ort. Melde dich an, um dein Board zu öffnen.</p>
          </div>
          <div className="login-aside-footer">
            <span className="login-status-mark" />
            <span>Sichere Anmeldung mit deinem Konto.</span>
          </div>
        </aside>

        <section className="login-card" aria-labelledby="login-title">
          <span className="login-eyebrow">
            {isRegistering ? 'NEUES KONTO' : 'WILLKOMMEN ZURÜCK'}
          </span>
          <h1 id="login-title">{isRegistering ? 'Konto erstellen' : 'Anmelden'}</h1>
          <p className="login-description">
            {isRegistering
              ? 'Erstelle ein Konto, um SowaBoard zu nutzen.'
              : 'Melde dich mit deinem Backend-Konto an.'}
          </p>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span>Benutzername</span>
              <input
                autoComplete="username"
                maxLength={50}
                minLength={3}
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
                minLength={isRegistering ? 8 : undefined}
                placeholder={isRegistering ? 'Mindestens 8 Zeichen' : 'Dein Passwort'}
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
              {isSubmitting ? 'Bitte warten...' : isRegistering ? 'Konto erstellen' : 'Anmelden'}
            </button>
          </form>

          <p className="login-switch">
            {isRegistering ? 'Du hast schon ein Konto?' : 'Noch kein Konto?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('')
                setIsRegistering((current) => !current)
              }}
            >
              {isRegistering ? 'Jetzt anmelden' : 'Konto erstellen'}
            </button>
          </p>
          <p className="login-note">JWT-Zugang wird nur während dieser App-Sitzung gehalten.</p>
        </section>
      </div>
    </main>
  )
}

export default Login
