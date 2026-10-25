import { useState } from 'react'
import { Icon, Logo } from '../../../components/customer_ui.jsx'

export default function CustomerLogin({ onSubmit, onSwitch }) {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not sign in.')
      onSubmit(data.customer)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="auth-header">
        <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
      </header>
      <section className="auth-card">
        <h1>Welcome Back!</h1>
        <p className="auth-subtitle">Sign In to continue</p>
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email:</span>
            <input name="email" type="email" placeholder="Jonhdoe@example.com" autoComplete="email" required />
          </label>
          <label className="auth-field">
            <span>Password:</span>
            <span className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={`${showPassword ? 'Hide' : 'Show'} password`}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <div className="auth-options">
          <label className="remember-option">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span>Remember Me</span>
          </label>
          <button className="text-link" type="button">Forgot password?</button>
        </div>
        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button className="text-link" type="button" onClick={onSwitch}>Sign up</button>
        </p>
        <div className="social-divider"><span />or sign in with<span /></div>
        <div className="social-buttons">
          {['google', 'apple', 'facebook'].map((social) => (
            <button type="button" aria-label={`Continue with ${social}`} key={social}>
              <Icon name={social} size={19} />
            </button>
          ))}
        </div>
      </section>
      <p className="auth-wordmark">CrumblyX</p>
    </>
  )
}