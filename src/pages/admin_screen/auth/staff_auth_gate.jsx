import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SplashScreen from '../../../components/splashscreen.jsx'
import { adminTw } from '../staff_admin_tw.js'

async function staffAuthRequest(action, body, signal) {
  const response = await fetch(`/api/staff-auth/${action}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Staff authentication failed.')
  return data
}

export default function StaffAuthGate({ children }) {
  const location = useLocation()
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    staffAuthRequest('session', undefined, controller.signal)
      .then(() => setStatus('authenticated'))
      .catch((requestError) => {
        if (controller.signal.aborted) return
        if (requestError.message === 'Staff sign-in required.') {
          setStatus('unauthenticated')
        } else {
          setError(requestError.message)
          setStatus('error')
        }
      })
    return () => controller.abort()
  }, [attempt])

  if (status === 'loading') {
    return (
      <main className={adminTw('fixed inset-0 z-[100] grid min-h-dvh place-items-center bg-stone-950')} role="status" aria-label="Loading CrumblyX">
        <SplashScreen />
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className={adminTw('grid min-h-dvh place-items-center p-4')}>
        <section className={adminTw('w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl')}>
          <p className={adminTw('text-sm text-rose-700')} role="alert">Could not verify staff sign-in: {error}</p>
          <button className={adminTw('mt-4 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white')} type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1) }}>Try again</button>
        </section>
      </main>
    )
  }
  if (status === 'unauthenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/staff/login" state={{ returnTo }} replace />
  }
  return children
}
