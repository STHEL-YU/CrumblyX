import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import Sidebar from './staff_sidebar.jsx'
import StaffMessageInbox from './staff_message_inbox.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'

const TABLE_TYPES = ['Round', 'Square', 'Rectangular', 'Booth', 'Bar']
const inputCls = 'mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15'
const primaryBtn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60'

async function tableRequest(action, method = 'GET', body, signal) {
  const response = await fetch(`/api/tables/${action}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Table request failed.')
  return data
}

function resizeImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error('Image could not be processed.'))
        return
      }
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image could not be loaded.'))
    }
    image.src = url
  })
}

function TableDialog({ table, onClose, onSave }) {
  const [tableName, setTableName] = useState(table?.tableName || '')
  const [tableType, setTableType] = useState(table?.tableType || TABLE_TYPES[0])
  const [seats, setSeats] = useState(table ? String(table.seats) : '2')
  const [available, setAvailable] = useState(table?.available ?? true)
  const [image, setImage] = useState(table?.image || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  const isEditing = Boolean(table)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector('input, button')?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function chooseImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose an image smaller than 10 MB.')
      return
    }
    setSaving(true)
    try {
      setImage(await resizeImage(file))
      setError('')
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    const normalizedSeats = Number(seats)
    if (!tableName.trim()) {
      setError('Enter a table name or number.')
      return
    }
    if (!Number.isInteger(normalizedSeats) || normalizedSeats < 1 || normalizedSeats > 1000) {
      setError('Enter a whole number of seats from 1 to 1,000.')
      return
    }
    setSaving(true)
    try {
      const saved = await onSave({
        ...table,
        tableName: tableName.trim(),
        tableType,
        seats: normalizedSeats,
        available,
        image,
      })
      if (saved) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={adminTw('fixed inset-0 z-50 grid place-items-center bg-stone-900/40 p-4 backdrop-blur-sm')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={dialogRef}
        className={adminTw('max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-table-modal-title"
      >
        <header className={adminTw('mb-5 flex items-start justify-between gap-4')}>
          <div>
            <p className={adminTw('text-xs font-bold uppercase tracking-[0.14em] text-amber-700')}>Table setup</p>
            <h2 id="staff-table-modal-title" className={adminTw('mt-1 text-lg font-semibold text-stone-900')}>{isEditing ? 'Edit table' : 'Add table'}</h2>
          </div>
          <button type="button" aria-label="Close table form" onClick={onClose} className={adminTw('-mr-2 -mt-1 rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800')}>
            <DashboardIcon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={submit} className={adminTw('space-y-4')}>
          <label className={adminTw('block text-sm font-medium text-stone-700')}>
            Table name or number
            <input className={adminTw(inputCls)} value={tableName} onChange={(event) => setTableName(event.target.value)} maxLength={50} placeholder="e.g. Table 01" required />
          </label>

          <div className={adminTw('grid grid-cols-1 gap-4 sm:grid-cols-2')}>
            <label className={adminTw('block text-sm font-medium text-stone-700')}>
              Type of table
              <select className={adminTw(inputCls)} value={tableType} onChange={(event) => setTableType(event.target.value)}>
                {TABLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className={adminTw('block text-sm font-medium text-stone-700')}>
              Available seats
              <input className={adminTw(inputCls)} type="number" min="1" max="1000" step="1" value={seats} onChange={(event) => setSeats(event.target.value)} required />
            </label>
          </div>

          <label className={adminTw('flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3')}>
            <span>
              <span className={adminTw('block text-sm font-semibold text-stone-800')}>Available for customers</span>
              <span className={adminTw('mt-0.5 block text-xs text-stone-500')}>Turn off when the table cannot be reserved.</span>
            </span>
            <input className={adminTw('size-5 accent-emerald-600')} type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
          </label>

          <div>
            <label className={adminTw('block text-sm font-medium text-stone-700')} htmlFor="staff-table-image">Table image</label>
            <input id="staff-table-image" className={adminTw('mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:font-semibold file:text-amber-800 hover:file:bg-amber-100')} type="file" accept="image/*" onChange={chooseImage} />
            {image && (
              <div className={adminTw('mt-3 flex items-center gap-3')}>
                <img className={adminTw('h-20 w-28 rounded-lg object-cover ring-1 ring-stone-200')} src={image} alt="Table preview" />
                <button type="button" className={adminTw('text-sm font-semibold text-rose-700 hover:text-rose-800')} onClick={() => setImage('')}>Remove image</button>
              </div>
            )}
          </div>

          {error && <p className={adminTw('rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-600/10')} role="alert">{error}</p>}

          <div className={adminTw('flex justify-end gap-2 pt-2')}>
            <button type="button" className={adminTw('inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50')} onClick={onClose}>Cancel</button>
            <button type="submit" className={adminTw(primaryBtn)} disabled={saving}>{saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add table'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function AvailabilitySwitch({ table, disabled, onToggle }) {
  return (
    <label className={adminTw('inline-flex cursor-pointer items-center gap-2')}>
      <input
        className={adminTw('peer sr-only')}
        type="checkbox"
        checked={table.available}
        disabled={disabled}
        onChange={() => onToggle(table)}
        aria-label={`${table.available ? 'Mark' : 'Make'} ${table.tableName} ${table.available ? 'unavailable' : 'available'}`}
      />
      <span className={adminTw("relative h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-500/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5")} aria-hidden="true" />
      <span className={adminTw(`text-xs font-semibold ${table.available ? 'text-emerald-700' : 'text-stone-500'}`)}>{table.available ? 'Available' : 'Unavailable'}</span>
    </label>
  )
}

function TableQrDialog({ table, onClose }) {
  const [qrImage, setQrImage] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  const tableUrl = new URL('/book-table', window.location.origin)
  tableUrl.searchParams.set('id', table.id)
  const qrUrl = tableUrl.toString()

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector('button')?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href]')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let active = true
    QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
    })
      .then((dataUrl) => {
        if (active) setQrImage(dataUrl)
      })
      .catch((qrError) => {
        if (active) setError(`Could not generate the table QR code: ${qrError.message}`)
      })
    return () => { active = false }
  }, [qrUrl])

  const fileName = `${table.tableName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`

  return (
    <div
      className={adminTw('fixed inset-0 z-50 grid place-items-center bg-stone-900/40 p-4 backdrop-blur-sm')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .staff-table-qr-print, .staff-table-qr-print * { visibility: visible !important; }
          .staff-table-qr-print { position: fixed !important; inset: 0 !important; display: grid !important; place-content: center !important; background: white !important; }
          .staff-table-qr-print-actions { display: none !important; }
        }
      `}</style>
      <section
        ref={dialogRef}
        className={adminTw('staff-table-qr-print w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-stone-900/5')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-table-qr-title"
      >
        <header className={adminTw('flex items-start justify-between gap-4 text-left')}>
          <div>
            <p className={adminTw('text-xs font-bold uppercase tracking-[0.14em] text-amber-700')}>Scan to book</p>
            <h2 id="staff-table-qr-title" className={adminTw('mt-1 text-lg font-semibold text-stone-900')}>{table.tableName}</h2>
          </div>
          <button type="button" aria-label="Close table QR code" onClick={onClose} className={adminTw('-mr-2 -mt-1 rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800')}>
            <DashboardIcon name="close" size={18} />
          </button>
        </header>
        <div className={adminTw('mx-auto mt-5 grid min-h-[280px] w-full place-items-center rounded-xl border border-stone-200 bg-white p-4')}>
          {qrImage
            ? <img className={adminTw('staff-table-qr-image h-64 w-64 max-w-full')} src={qrImage} alt={`QR code for ordering at ${table.tableName}`} />
            : error
              ? <p className={adminTw('text-sm text-rose-700')} role="alert">{error}</p>
              : <p className={adminTw('text-sm text-stone-500')} role="status">Generating QR code…</p>}
        </div>
        <p className={adminTw('mt-4 text-sm text-stone-600')}>Scan this code to view the table details and book {table.tableName}.</p>
        <p className={adminTw('mt-1 break-all text-xs text-stone-400')}>{qrUrl}</p>
        <div className={adminTw('staff-table-qr-print-actions mt-5 flex flex-wrap justify-center gap-2')}>
          <button type="button" className={adminTw('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50')} onClick={() => window.print()} disabled={!qrImage}>
            <DashboardIcon name="qr" size={15} />Print
          </button>
          {qrImage
            ? <a className={adminTw('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800')} href={qrImage} download={fileName}><DashboardIcon name="arrow" size={15} />Download</a>
            : <button type="button" className={adminTw('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white opacity-50')} disabled><DashboardIcon name="arrow" size={15} />Download</button>}
        </div>
      </section>
    </div>
  )
}

export default function StaffTables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingTable, setEditingTable] = useState(null)
  const [qrTable, setQrTable] = useState(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pendingToggleId, setPendingToggleId] = useState('')
  const [toast, setToast] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const navigate = useNavigate()
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 3500)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    tableRequest('list', 'GET', undefined, controller.signal)
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('Invalid tables response.')
        setTables(result)
      })
      .catch((error) => {
        if (!controller.signal.aborted) showToast(`Could not load tables: ${error.message}`)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [showToast])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const visibleTables = tables.filter((table) =>
    `${table.tableName} ${table.tableType}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const availableCount = tables.filter((table) => table.available).length

  async function saveTable(table) {
    const isEditing = Boolean(table.id)
    try {
      const saved = await tableRequest(isEditing ? 'update' : 'create', isEditing ? 'PUT' : 'POST', table)
      setTables((current) => (isEditing
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved].sort((first, second) => first.tableName.localeCompare(second.tableName))))
      showToast(isEditing ? `${saved.tableName} updated` : `${saved.tableName} added`)
      return true
    } catch (error) {
      showToast(error.message)
      return false
    }
  }

  async function toggleAvailability(table) {
    setPendingToggleId(table.id)
    try {
      const saved = await tableRequest('update', 'PUT', { ...table, available: !table.available })
      setTables((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      showToast(`${saved.tableName} is now ${saved.available ? 'available' : 'unavailable'}`)
    } catch (error) {
      showToast(error.message)
    } finally {
      setPendingToggleId('')
    }
  }

  async function deleteTable(table) {
    if (!window.confirm(`Delete ${table.tableName}? This cannot be undone.`)) return
    try {
      await tableRequest(`delete?id=${encodeURIComponent(table.id)}`, 'DELETE')
      setTables((current) => current.filter((item) => item.id !== table.id))
      showToast(`${table.tableName} deleted`)
    } catch (error) {
      showToast(error.message)
    }
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    const routes = {
      Dashboard: '/staff/dashboard',
      Orders: '/staff/orders',
      Sales: '/staff/sales',
      Menu: '/staff/menu',
      Stocks: '/staff/stocks',
      Tables: '/staff/tables',
      Customers: '/staff/customers',
    }
    if (routes[name] && name !== 'Tables') navigate(routes[name])
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  return (
    <div className={adminTw('admin-dashboard staff-tables-app')}>
      <Sidebar activeRoute="Tables" drawerOpen={drawerOpen} onNavigate={navigateSection} onClose={() => setDrawerOpen(false)} profileOpen={profileOpen} onOpenProfile={openProfile} onLogout={logout} />
      <main className={adminTw('admin-main')}>
        <header className={adminTw('admin-topbar')}>
          <div className={adminTw('admin-title-group')}>
            <button type="button" className={adminTw('admin-hamburger')} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="table" size={24} /><h1>Tables</h1>
          </div>
          <div className={adminTw('admin-top-actions')}>
            <StaffMessageInbox />
            <button type="button" className={adminTw('admin-avatar top-avatar admin-avatar-trigger')} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className={adminTw('min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
          <div className={adminTw('mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8')}>
            <section className={adminTw('flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 xl:flex-row xl:items-center xl:justify-between')}>
              <div>
                <p className={adminTw('text-xs font-bold uppercase tracking-[0.16em] text-amber-700')}>Dining room</p>
                <h2 className={adminTw('mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl')}>Table management</h2>
                <p className={adminTw('mt-1.5 text-sm text-stone-500')} aria-live="polite">
                  {loading ? 'Loading tables…' : `${availableCount} of ${tables.length} tables available`}
                </p>
              </div>
              <div className={adminTw('flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto')}>
                <label className={adminTw('relative block min-w-0 flex-1 sm:w-72 xl:flex-none')}>
                  <span className={adminTw('pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400')}><DashboardIcon name="search" size={18} /></span>
                  <span className={adminTw('sr-only')}>Search tables by name or type</span>
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tables" className={adminTw('min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/15')} />
                </label>
                <button type="button" className={adminTw(primaryBtn)} onClick={() => setAddDialogOpen(true)}><DashboardIcon name="plus" size={16} />Add table</button>
              </div>
            </section>

            {loading ? (
              <div className={adminTw('grid gap-4 sm:grid-cols-2 xl:grid-cols-3')}>
                {[0, 1, 2].map((item) => <div key={item} className={adminTw('h-64 animate-pulse rounded-2xl border border-stone-200 bg-white')} />)}
              </div>
            ) : visibleTables.length === 0 ? (
              <section className={adminTw('rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center')}>
                <span className={adminTw('mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-800')}><DashboardIcon name="table" size={22} /></span>
                <h3 className={adminTw('mt-4 text-base font-semibold text-stone-900')}>{search ? 'No matching tables' : 'No tables added yet'}</h3>
                <p className={adminTw('mt-1 text-sm text-stone-500')}>{search ? 'Try another table name or type.' : 'Add your first dining table to manage its seating and availability.'}</p>
                {!search && <button type="button" className={adminTw(`${primaryBtn} mt-5`)} onClick={() => setAddDialogOpen(true)}><DashboardIcon name="plus" size={16} />Add table</button>}
              </section>
            ) : (
              <section className={adminTw('grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3')} aria-label="Dining tables">
                {visibleTables.map((table) => (
                  <article key={table.id} className={adminTw('overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md')}>
                    {table.image
                      ? <img className={adminTw('h-44 w-full bg-stone-100 object-cover')} src={table.image} alt={`${table.tableName} table`} loading="lazy" decoding="async" />
                      : <div className={adminTw('grid h-44 place-items-center bg-gradient-to-br from-amber-50 to-stone-100 text-amber-800')} aria-hidden="true"><DashboardIcon name="table" size={40} /></div>}
                    <div className={adminTw('space-y-4 p-5')}>
                      <div className={adminTw('flex items-start justify-between gap-3')}>
                        <div className={adminTw('min-w-0')}>
                          <h3 className={adminTw('truncate text-lg font-bold text-stone-900')}>{table.tableName}</h3>
                          <p className={adminTw('mt-1 text-sm text-stone-500')}>{table.tableType} table · {table.seats} {table.seats === 1 ? 'seat' : 'seats'}</p>
                        </div>
                        <span className={adminTw(`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${table.available ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`)}>{table.available ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <div className={adminTw('flex items-center justify-between gap-3 border-t border-stone-100 pt-4')}>
                        <AvailabilitySwitch table={table} disabled={pendingToggleId === table.id} onToggle={toggleAvailability} />
                        <div className={adminTw('flex items-center gap-1')}>
                          <button type="button" aria-label={`Show QR code for ${table.tableName}`} title={table.available ? 'Show QR code' : 'Unavailable tables cannot be ordered'} disabled={!table.available} onClick={() => setQrTable(table)} className={adminTw('inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/20')}><DashboardIcon name="qr" size={16} />QR</button>
                          <button type="button" aria-label={`Edit ${table.tableName}`} title={`Edit ${table.tableName}`} onClick={() => setEditingTable(table)} className={adminTw('rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20')}><DashboardIcon name="edit" size={16} /></button>
                          <button type="button" aria-label={`Delete ${table.tableName}`} title={`Delete ${table.tableName}`} onClick={() => deleteTable(table)} className={adminTw('rounded-lg p-2 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400/20')}><DashboardIcon name="trash" size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        </div>
      </main>

      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
      {(addDialogOpen || editingTable) && <TableDialog table={editingTable} onClose={() => { setAddDialogOpen(false); setEditingTable(null) }} onSave={saveTable} />}
      {qrTable && <TableQrDialog table={qrTable} onClose={() => setQrTable(null)} />}
      {toast && <div className={adminTw('fixed bottom-5 right-5 z-[70] max-w-[calc(100vw-2.5rem)] rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-lg')} role="status">{toast}</div>}
    </div>
  )
}
