import { useState } from 'react'
import { Icon, Logo } from '../../../components/customer_ui.jsx'

export default function StaffLogin({ onSubmit, onForgotPassword, onSignUp, onSocialLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    const normalizedEmail = email.trim()

    if (!normalizedEmail) nextErrors.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (!password) nextErrors.password = 'Enter your password.'

    setErrors(nextErrors)
    setFormError('')
    setNotice('')
    if (Object.keys(nextErrors).length) return

    if (!onSubmit) {
      setFormError('Staff sign-in is not connected yet. Please contact your administrator.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ email: normalizedEmail, password, rememberMe })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function runOptionalAction(action, fallbackMessage) {
    setNotice('')
    setFormError('')
    if (!action) {
      setNotice(fallbackMessage)
      return
    }
    try {
      await action()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'This action could not be completed.')
    }
  }

  return (
    <div className="staff-login-scene">
      <div className="staff-login-photo" aria-hidden="true" />
      <div className="staff-login-shade" aria-hidden="true" />

      <header className="staff-login-header">
        <a className="staff-login-brand" href="/" aria-label="CrumblyX home">
          <Logo small />
          <span>CrumblyX</span>
        </a>
        <span className="staff-login-est">EST. 2026</span>
      </header>

      <main className="staff-login-main">
        <section className="staff-login-card" aria-labelledby="staff-login-title">
          <h1 id="staff-login-title">Welcome Back!</h1>
          <p className="staff-login-subtitle">Sign In to continue</p>

          <form onSubmit={submit} noValidate>
            <div className="staff-login-field">
              <label htmlFor="staff-login-email">Email</label>
              <input
                id="staff-login-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="johndoe@example.com"
                value={email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'staff-login-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrors((current) => ({ ...current, email: '' }))
                }}
              />
              {errors.email && <p className="staff-login-field-error" id="staff-login-email-error">{errors.email}</p>}
            </div>

            <div className="staff-login-field">
              <label htmlFor="staff-login-password">Password</label>
              <span className="staff-login-password">
                <input
                  id="staff-login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'staff-login-password-error' : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({ ...current, password: '' }))
                  }}
                />
                <button
                  className="staff-login-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                </button>
              </span>
              {errors.password && <p className="staff-login-field-error" id="staff-login-password-error">{errors.password}</p>}
            </div>

            {formError && <p className="staff-login-error" role="alert">{formError}</p>}

            <button className="staff-login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><span className="staff-login-spinner" aria-hidden="true" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="staff-login-options">
            <label className="staff-login-remember">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>Remember Me</span>
            </label>
            <button type="button" className="staff-login-link" onClick={() => runOptionalAction(onForgotPassword, 'Password reset is not available yet. Contact your administrator.')}>
              Forgot password?
            </button>
          </div>

          <p className="staff-login-signup">
            Don&apos;t have an account?{' '}
            <button type="button" className="staff-login-link staff-login-signup-link" onClick={() => runOptionalAction(onSignUp, 'Staff account registration is managed by your administrator.')}>
              Sign up
            </button>
          </p>

          <div className="staff-login-divider"><span />or sign in with<span /></div>
          <div className="staff-login-socials" aria-label="Other sign-in options">
            {['google', 'apple', 'facebook'].map((provider) => (
              <button
                type="button"
                aria-label={`Sign in with ${provider}`}
                key={provider}
                onClick={() => runOptionalAction(
                  onSocialLogin ? () => onSocialLogin(provider) : undefined,
                  `${provider[0].toUpperCase()}${provider.slice(1)} sign-in is not available yet.`,
                )}
              >
                <Icon name={provider} size={20} />
              </button>
            ))}
          </div>
          {notice && <p className="staff-login-notice" role="status">{notice}</p>}
        </section>
      </main>
    </div>
  )
}