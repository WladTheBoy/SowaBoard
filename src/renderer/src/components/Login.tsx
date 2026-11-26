import {
  CircleAlert,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Lock,
  Sparkles,
  SquareKanban,
  User
} from 'lucide-react'
import { useState } from 'react'
import type { AuthenticatedUser } from '../../../shared/auth'
import { apiErrorMessage, setAccessToken } from '../api/client'
import logo from '../assets/logo.svg'

interface LoginProps {
  onAuthenticated: (user: AuthenticatedUser) => void
}

const features = [
  { icon: SquareKanban, text: 'Kanban-Board für alle Projekte' },
  { icon: FileText, text: 'Dokumentation direkt am Projekt' },
  { icon: Sparkles, text: 'KI-Assistent für Tickets' }
]

function Login({ onAuthenticated }: LoginProps): React.JSX.Element {
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
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
            <ul className="login-features">
              {features.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <span aria-hidden="true" className="login-feature-icon">
                    <Icon size={16} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
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
            <div className="login-field">
              <label htmlFor="login-username">Benutzername</label>
              <div className="login-input">
                <User aria-hidden="true" className="login-input-icon" size={16} />
                <input
                  autoComplete="username"
                  id="login-username"
                  maxLength={50}
                  minLength={3}
                  placeholder="Dein Benutzername"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Passwort</label>
              <div className="login-input has-toggle">
                <Lock aria-hidden="true" className="login-input-icon" size={16} />
                <input
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  id="login-password"
                  maxLength={128}
                  minLength={isRegistering ? 8 : undefined}
                  placeholder={isRegistering ? 'Mindestens 8 Zeichen' : 'Dein Passwort'}
                  required
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  aria-label={isPasswordVisible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  aria-pressed={isPasswordVisible}
                  className="login-password-toggle"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  title={isPasswordVisible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  type="button"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" size={16} />
                  ) : (
                    <Eye aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="login-error" role="alert">
                <CircleAlert aria-hidden="true" size={16} />
                <span>{error}</span>
              </p>
            )}
            <button className="primary-button login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting && (
                <LoaderCircle aria-hidden="true" className="login-spinner" size={16} />
              )}
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
          <p className="login-note">
            Du bleibst angemeldet, bis du die App schließt oder die Sitzung abläuft.
          </p>
        </section>
      </div>
    </main>
  )
}

export default Login
