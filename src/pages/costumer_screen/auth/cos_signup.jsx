import { useState } from 'react'
import { Icon, Logo } from '../../../components/customer_ui.jsx'

export default function CustomerSignup({ onSubmit, onSwitch }) {
  const [showPasswords, setShowPasswords] = useState({})

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onSubmit({
      name: String(formData.get('username') || '').trim(),
      email: String(formData.get('email') || '').trim(),
    })
  }

  function togglePassword(name) {
    setShowPasswords((values) => ({ ...values, [name]: !values[name] }))
  }

  return (
    <>
      <header className="auth-header">
        <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
      </header>
      <section className="auth-card signup-card">
        <h1>Create an account</h1>
        <p className="auth-subtitle">Sign Up to continue</p>
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username:</span>
            <input name="username" type="text" placeholder="Choose a username" autoComplete="username" required />
          </label>
          <label className="auth-field">
            <span>Email:</span>
            <input name="email" type="email" placeholder="Jonhdoe@example.com" autoComplete="email" required />
          </label>
          {['Password', 'Confirm Password'].map((field) => (
            <label className="auth-field" key={field}>
              <span>{field}:</span>
              <span className="password-input-wrap">
                <input
                  type={showPasswords[field] ? 'text' : 'password'}
                  name={field === 'Password' ? 'password' : 'confirmPassword'}
                  placeholder={field === 'Password' ? 'Enter your password' : 'Confirm your password'}
                  autoComplete="new-password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={`${showPasswords[field] ? 'Hide' : 'Show'} ${field.toLowerCase()}`}
                  onClick={() => togglePassword(field)}
                >
                  <Icon name={showPasswords[field] ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </span>
            </label>
          ))}
          <button className="auth-submit" type="submit">Sign Up</button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button className="text-link" type="button" onClick={onSwitch}>Sign In</button>
        </p>
        <div className="social-divider"><span />or sign up with<span /></div>
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