import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Logo } from '../../../components/customer_ui.jsx'
import { StaffSpinner } from '../staff_admin_shared.jsx'
import { adminTw } from '../staff_admin_tw.js'

export default function StaffLogin({ onSubmit, onForgotPassword, onSignUp, onSocialLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [optionalAction, setOptionalAction] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/staff-auth/session', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not verify staff sign-in.')
        navigate('/staff/dashboard', { replace: true })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setFormError(error instanceof Error ? error.message : 'Could not verify staff sign-in.')
        }
      })
    return () => controller.abort()
  }, [navigate])

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

  async function runOptionalAction(key, action, fallbackMessage) {
    setNotice('')
    setFormError('')
    if (!action) {
      setNotice(fallbackMessage)
      return
    }
    setOptionalAction(key)
    try {
      await action()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'This action could not be completed.')
    } finally {
      setOptionalAction('')
    }
  }

  return (
    <div className={adminTw("staff-login-scene")}>
      <div className={adminTw("staff-login-photo")} aria-hidden="true" />
      <div className={adminTw("staff-login-shade")} aria-hidden="true" />

      <header className={adminTw("staff-login-header")}>
        <a className={adminTw("staff-login-brand")} href="/" aria-label="CrumblyX home">
          <Logo small />
          <span>CrumblyX</span>
        </a>
        <span className={adminTw("staff-login-est")}>EST. 2026</span>
      </header>

      <main className={adminTw("staff-login-main")}>
        <section className={adminTw("staff-login-card")} aria-labelledby="staff-login-title">
          <h1 className={adminTw("staff-login-card-title")} id="staff-login-title">Welcome Admin!</h1>
          <p className={adminTw("staff-login-subtitle")}>Sign In to continue</p>

          <form onSubmit={submit} noValidate>
            <div className={adminTw("staff-login-field")}>
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
              {errors.email && <p className={adminTw("staff-login-field-error")} id="staff-login-email-error">{errors.email}</p>}
            </div>

            <div className={adminTw("staff-login-field")}>
              <label htmlFor="staff-login-password">Password</label>
              <span className={adminTw("staff-login-password")}>
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
                  className={adminTw("staff-login-password-toggle")}
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                </button>
              </span>
              {errors.password && <p className={adminTw("staff-login-field-error")} id="staff-login-password-error">{errors.password}</p>}
            </div>

            {formError && <p className={adminTw("staff-login-error")} role="alert">{formError}</p>}

            <button className={adminTw("staff-login-submit")} type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? <><span className={adminTw("staff-login-spinner")} aria-hidden="true" /> Signing in…</> : 'Sign In'}
            </button>
          </form>
          {notice && <p className={adminTw("staff-login-notice")} role="status">{notice}</p>}
        </section>
      </main>
    </div>
  )
}