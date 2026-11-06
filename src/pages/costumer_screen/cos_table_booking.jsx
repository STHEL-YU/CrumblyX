import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon, Logo } from '../../components/customer_ui.jsx'

async function fetchTable(id, signal) {
  const response = await fetch(`/api/tables/get?id=${encodeURIComponent(id)}`, { signal })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not load this table.')
  return data
}

export default function CosTableBooking() {
  const [searchParams] = useSearchParams()
  const [table, setTable] = useState(null)
  const [loadedTableId, setLoadedTableId] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const tableId = searchParams.get('id') || ''
  const isCustomerSignedIn = Boolean(
    sessionStorage.getItem('crumblyx-customer-id')
    && sessionStorage.getItem('crumblyx-customer-email'),
  )

  useEffect(() => {
    if (!tableId) return undefined

    const controller = new AbortController()
    fetchTable(tableId, controller.signal)
      .then((result) => {
        setTable(result)
        setError(null)
        setLoadedTableId(tableId)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError({ id: tableId, message: loadError.message })
          setLoadedTableId(tableId)
        }
      })
    return () => controller.abort()
  }, [tableId])

  const loading = Boolean(tableId) && loadedTableId !== tableId
  const currentTable = loadedTableId === tableId ? table : null
  const currentError = error?.id === tableId ? error.message : ''

  async function bookTable() {
    if (!isCustomerSignedIn) {
      navigate('/login', {
        state: { returnTo: `${location.pathname}${location.search}` },
      })
      return
    }

    setBooking(true)
    setError('')
    try {
      const response = await fetch('/api/tables/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId }),
      })
      const bookedTable = await response.json().catch(() => ({}))
      if (!response.ok) {
        const bookingError = new Error(bookedTable.error || 'Could not book this table.')
        bookingError.status = response.status
        throw bookingError
      }
      navigate(`/home?mode=dine-in&table=${encodeURIComponent(bookedTable.tableName)}`, { replace: true })
    } catch (bookingError) {
      setError({ id: tableId, message: bookingError.message })
      if (bookingError.status === 409) {
        setTable((current) => current ? { ...current, available: false } : current)
      }
    } finally {
      setBooking(false)
    }
  }

  return (
    <>
      <header className="auth-header">
        <button className="scanner-back" type="button" onClick={() => navigate('/')}>‹ Back</button>
        <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
      </header>
      <section className="table-scanner-card">
        <span className="scanner-icon"><Icon name="qr" size={30} /></span>
        {!tableId || (currentError && !currentTable) ? (
          <>
            <h1>Table unavailable</h1>
            <p className="scanner-description" role="alert">{currentError || 'This QR code does not include a table.'}</p>
          </>
        ) : loading ? (
          <>
            <h1>Loading table…</h1>
            <p className="scanner-description" role="status">Getting table details.</p>
          </>
        ) : currentTable ? (
          <>
            {currentTable.image && <img className="mx-auto mb-4 max-h-48 w-full rounded-2xl object-cover" src={currentTable.image} alt={currentTable.tableName} />}
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Table details</p>
            <h1>{currentTable.tableName}</h1>
            <p className="scanner-description">
              {currentTable.tableType} table · {currentTable.seats} {currentTable.seats === 1 ? 'seat' : 'seats'}
            </p>
            <p className={`mb-4 text-sm font-semibold ${currentTable.available ? 'text-emerald-700' : 'text-rose-700'}`}>
              {currentTable.available ? 'Available to book' : 'This table has already been booked'}
            </p>
            {currentTable.available && (
              <button className="auth-submit scanner-start" type="button" disabled={booking} onClick={bookTable}>
                {booking ? 'Booking table…' : isCustomerSignedIn ? 'Book this table' : 'Log in to book this table'}
              </button>
            )}
            {currentError && <p className="scanner-error" role="alert">{currentError}</p>}
            {!currentTable.available && <p className="scanner-description">Please scan another table QR code or ask a staff member for help.</p>}
          </>
        ) : null}
      </section>
      <p className="auth-wordmark">CrumblyX</p>
    </>
  )
}
