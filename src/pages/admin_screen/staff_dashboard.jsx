import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardIcon, StaffProfileDialog, StaffSpinner } from './staff_admin_shared.jsx'
import Sidebar from './staff_sidebar.jsx'
import StaffMessageInbox from './staff_message_inbox.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'

const NOTES_KEY = 'crumblyx.staff-dashboard-notes.v1'
const REFRESH_INTERVAL = 30000
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ORDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
]
const STATUS_TONES = {
  new: 'bg-amber-50 text-amber-800',
  preparing: 'bg-sky-50 text-sky-800',
  ready: 'bg-emerald-50 text-emerald-800',
  completed: 'bg-stone-100 text-stone-700',
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function displayDate(value, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
  return parseLocalDate(value).toLocaleDateString(undefined, options)
}

function readNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(
      Object.entries(stored).map(([date, notes]) => [
        date,
        Array.isArray(notes)
          ? notes.filter((note) => note && typeof note.id === 'string' && typeof note.text === 'string')
          : [],
      ]),
    )
  } catch {
    return {}
  }
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`)
  return data
}

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SummaryCard({ label, value, caption, icon, tone }) {
  return (
    <article className="flex min-w-0 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><DashboardIcon name={icon} size={21} /></span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-stone-900">{value}</p>
        <p className="mt-0.5 truncate text-xs text-stone-400">{caption}</p>
      </div>
    </article>
  )
}

function CalendarWidget({ month, todayKey, selectedDate, orderDates, onMonthChange, onDateSelect }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-label="Calendar">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Schedule</p>
          <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-stone-900">{monthLabel}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" className="grid size-9 place-items-center rounded-xl border border-stone-200 bg-white text-lg leading-none text-stone-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-stone-900" aria-label="Previous month" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}><span aria-hidden="true">‹</span></button>
          <button type="button" className="grid size-9 place-items-center rounded-xl border border-stone-200 bg-white text-lg leading-none text-stone-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-stone-900" aria-label="Next month" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}><span aria-hidden="true">›</span></button>
        </div>
      </header>
      <div className="px-4 pb-5 sm:px-5">
        <div className="sd-cal-grid">
          {WEEKDAYS.map((day) => (
            <span key={day} className="sd-dow pb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">{day}</span>
          ))}
          {Array.from({ length: firstDayOffset }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const dateKey = localDateKey(new Date(year, monthIndex, day))
            const isSelected = dateKey === selectedDate
            const isToday = dateKey === todayKey
            const hasOrders = orderDates.has(dateKey)
            return (
              <button
                key={dateKey}
                type="button"
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${displayDate(dateKey)}${hasOrders ? ', has orders' : ''}`}
                onClick={() => onDateSelect(dateKey)}
                className={`sd-day rounded-xl text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'bg-stone-900 font-semibold text-white shadow-sm'
                    : isToday
                      ? 'bg-amber-100 font-bold text-amber-900 ring-1 ring-amber-200'
                      : 'font-medium text-stone-700 hover:bg-stone-100'
                }`}
              >
                {day}
                {hasOrders && <span className={`sd-dot rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-600'}`} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="inline-flex items-center gap-2 text-xs text-stone-500"><i className="size-2 rounded-full bg-amber-600" aria-hidden="true" />Dates with orders</span>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
            onClick={() => {
              onMonthChange(parseLocalDate(todayKey))
              onDateSelect(todayKey)
            }}
          >
            Today
          </button>
        </div>
      </div>
    </section>
  )
}

function NotesWidget({ date, notes, onAdd, onToggle, onRemove }) {
  const [draft, setDraft] = useState('')
  const dayNotes = notes[date] || []
  const remaining = dayNotes.filter((note) => !note.done).length

  function submit(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onAdd(date, text)
    setDraft('')
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="dashboard-notes-title">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Shopping reminders</p>
          <h2 id="dashboard-notes-title" className="mt-1 text-lg font-bold tracking-tight text-stone-900">Notes for {displayDate(date, { month: 'short', day: 'numeric' })}</h2>
        </div>
        {dayNotes.length > 0 && (
          <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">{remaining} left</span>
        )}
      </header>
      <form className="flex gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="dashboard-note-input">Add a reminder</label>
        <input id="dashboard-note-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={180} placeholder="Add an ingredient reminder…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10" />
        <button type="submit" disabled={!draft.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-900 text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Add reminder"><DashboardIcon name="plus" size={18} /></button>
      </form>
      {dayNotes.length ? (
        <ul className="mt-3 grid max-h-72 gap-2 overflow-y-auto">
          {dayNotes.map((note) => (
            <li key={note.id} className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2.5">
              <input type="checkbox" checked={Boolean(note.done)} onChange={() => onToggle(date, note.id)} aria-label={`Mark ${note.text} ${note.done ? 'not done' : 'done'}`} className="mt-1 size-4 accent-amber-700" />
              <span className={`min-w-0 flex-1 break-words text-sm leading-5 ${note.done ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{note.text}</span>
              <button type="button" className="rounded-md p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${note.text}`} onClick={() => onRemove(date, note.id)}><DashboardIcon name="close" size={15} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-sm text-stone-400">No reminders for this date yet.</p>
      )}
    </section>
  )
}

export default function StaffDashboard() {
  const [orders, setOrders] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()))
  const [todayKey] = useState(() => localDateKey(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [notes, setNotes] = useState(readNotes)
  const [notesError, setNotesError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    let refreshing = false
    let controller

    async function refreshDashboard() {
      if (refreshing) return
      refreshing = true
      controller = new AbortController()
      const results = await Promise.allSettled([
        fetchJson('/api/orders/list', controller.signal),
        fetchJson('/api/stocks/list', controller.signal),
      ])
      if (active) {
        const errors = []
        if (results[0].status === 'fulfilled') {
          if (Array.isArray(results[0].value.orders)) setOrders(results[0].value.orders)
          else errors.push('Orders response was invalid.')
        } else errors.push(`Orders: ${results[0].reason.message}`)
        if (results[1].status === 'fulfilled') {
          if (Array.isArray(results[1].value)) setStocks(results[1].value)
          else errors.push('Stocks response was invalid.')
        } else errors.push(`Stocks: ${results[1].reason.message}`)
        setLoadError(errors.join(' '))
        setLoading(false)
      }
      refreshing = false
    }

    refreshDashboard()
    const interval = window.setInterval(refreshDashboard, REFRESH_INTERVAL)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(interval)
    }
  }, [])

  function saveNotes(nextNotes) {
    setNotes(nextNotes)
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(nextNotes))
      setNotesError('')
    } catch {
      setNotesError('Reminders could not be saved in this browser.')
    }
  }

  const selectedDayOrders = useMemo(
    () => orders.filter((order) => localDateKey(new Date(order.createdAt)) === selectedDate),
    [orders, selectedDate],
  )
  const orderDates = useMemo(
    () => new Set(orders.map((order) => localDateKey(new Date(order.createdAt)))),
    [orders],
  )
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return selectedDayOrders
      .filter((order) => filter === 'all' || order.status === filter)
      .filter((order) => !term || `${order.id} ${order.customerName || ''} ${order.customerEmail || ''} ${order.orderType || ''}`.toLocaleLowerCase().includes(term))
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
  }, [filter, search, selectedDayOrders])
  const totalSales = selectedDayOrders
    .filter((order) => order.status === 'completed')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const newOrders = selectedDayOrders.filter((order) => order.status === 'new').length
  const pendingOrders = selectedDayOrders.filter((order) => ['new', 'preparing'].includes(order.status)).length
  const lowStock = stocks.filter((item) => item.quantity != null && Number(item.quantity) <= 5)

  function addNote(date, text) {
    saveNotes({ ...notes, [date]: [...(notes[date] || []), { id: crypto.randomUUID(), text, done: false }] })
  }

  function toggleNote(date, noteId) {
    saveNotes({
      ...notes,
      [date]: (notes[date] || []).map((note) => note.id === noteId ? { ...note, done: !note.done } : note),
    })
  }

  function removeNote(date, noteId) {
    saveNotes({ ...notes, [date]: (notes[date] || []).filter((note) => note.id !== noteId) })
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  function choosePage(page) {
    setDrawerOpen(false)
    const routes = { Dashboard: '/staff/dashboard', Orders: '/staff/orders', Sales: '/staff/sales', Menu: '/staff/menu', Stocks: '/staff/stocks', Customers: '/staff/customers' }
    if (routes[page] && page !== 'Dashboard') navigate(routes[page])
  }

  return (
    <div className={adminTw('admin-dashboard')}>
      <Sidebar activeRoute="Dashboard" drawerOpen={drawerOpen} onNavigate={choosePage} onClose={() => setDrawerOpen(false)} profileOpen={profileOpen} onOpenProfile={openProfile} onLogout={logout} />
      <main className={adminTw('admin-main')}>
        <header className={adminTw('admin-topbar')}>
          <div className={adminTw('admin-title-group')}>
            <button type="button" className={adminTw('admin-hamburger')} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="dashboard" size={23} />
            <h1>Dashboard</h1>
          </div>
          <div className={adminTw('admin-top-actions')}>
            <StaffMessageInbox />
            <button type="button" className={adminTw('admin-avatar top-avatar admin-avatar-trigger')} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#faf9f6]">
          <div className="mx-auto w-full max-w-[1800px] space-y-6 p-4 sm:p-6 lg:p-8">
            <style>{`
              .sd-kpi { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
              .sd-layout { display: grid; gap: 20px; align-items: start; grid-template-columns: minmax(0, 1fr); }
              .sd-right { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); min-width: 0; }
              .sd-cal-grid { display: grid; gap: 6px; grid-template-columns: repeat(7, minmax(0, 1fr)); }
              .sd-dow { text-align: center; }
              .sd-day { position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1 / 1; padding: 0; border: 0; cursor: pointer; }
              .sd-dot { position: absolute; bottom: 6px; left: 50%; width: 4px; height: 4px; transform: translateX(-50%); }
              @media (min-width: 640px) {
                .sd-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              }
              @media (min-width: 768px) {
                .sd-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .sd-right { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
              }
              @media (min-width: 1280px) {
                .sd-kpi { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                .sd-layout { grid-template-columns: minmax(290px, 340px) minmax(0, 1fr) minmax(260px, 320px); }
                .sd-right { grid-column: auto; grid-template-columns: minmax(0, 1fr); }
              }
            `}</style>

            <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Operations overview</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Good day, team</h2>
                <p className="mt-1 text-sm text-stone-500">{displayDate(selectedDate)} · Live order and stock overview</p>
              </div>
              <p className="text-xs text-stone-400">{loading ? 'Loading live data…' : `Updates every ${REFRESH_INTERVAL / 1000} seconds`}</p>
            </section>

            {loadError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{loadError} Showing the latest available data.</p>}

            <section className="sd-kpi" aria-label="Daily key metrics">
              <SummaryCard label="Completed sales" value={loading ? '—' : formatPeso(totalSales)} caption="Selected date · completed orders" icon="orders" tone="bg-emerald-50 text-emerald-700" />
              <SummaryCard label="New orders" value={loading ? '—' : newOrders} caption="Awaiting acceptance" icon="plus" tone="bg-amber-50 text-amber-700" />
              <SummaryCard label="Pending orders" value={loading ? '—' : pendingOrders} caption="New or being prepared" icon="plate" tone="bg-sky-50 text-sky-700" />
              <SummaryCard label="Stock alerts" value={loading ? '—' : lowStock.length} caption="Low or out of stock" icon="warning" tone={lowStock.length ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'} />
            </section>

            {notesError && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{notesError}</p>}

            <div className="sd-layout">
              {/* Left column: calendar + notes */}
              <div className="grid min-w-0 gap-5">
                <CalendarWidget month={calendarMonth} todayKey={todayKey} selectedDate={selectedDate} orderDates={orderDates} onMonthChange={setCalendarMonth} onDateSelect={setSelectedDate} />
                <NotesWidget date={selectedDate} notes={notes} onAdd={addNote} onToggle={toggleNote} onRemove={removeNote} />
              </div>

              {/* Center column: live activity */}
              <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-labelledby="dashboard-activity-title">
                <header className="border-b border-stone-100 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Live activity</p>
                      <h2 id="dashboard-activity-title" className="mt-1 text-lg font-bold tracking-tight text-stone-900">Orders for {displayDate(selectedDate, { month: 'short', day: 'numeric' })}</h2>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">{filteredOrders.length} orders</span>
                  </div>
                  <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-stone-400 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10">
                    <DashboardIcon name="search" size={17} />
                    <span className="sr-only">Search orders on the selected date</span>
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or order…" className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
                  </label>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter activity by order status">
                    {ORDER_FILTERS.map((item) => (
                      <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`min-h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${filter === item.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{item.label}</button>
                    ))}
                  </div>
                </header>
                <div className="max-h-[640px] min-h-64 overflow-y-auto">
                  {loading && orders.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-stone-500"><StaffSpinner className="size-4" />Loading activity…</div>
                  ) : filteredOrders.length ? (
                    <ul className="divide-y divide-stone-100">
                      {filteredOrders.map((order) => (
                        <li key={order.id} className="flex items-start gap-3 px-5 py-4 transition hover:bg-stone-50">
                          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${STATUS_TONES[order.status] || 'bg-stone-100 text-stone-600'}`}><DashboardIcon name="orders" size={17} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="m-0 truncate text-sm font-semibold text-stone-900">{order.customerName || 'Guest customer'}</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_TONES[order.status] || 'bg-stone-100 text-stone-600'}`}>{order.status}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-stone-500">{order.items?.length || 0} items · {order.orderType || 'Order'}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <time className="text-xs text-stone-400" dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                              <strong className="text-sm font-semibold tabular-nums text-stone-800">{formatPeso(order.total)}</strong>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="grid min-h-64 place-content-center justify-items-center px-6 text-center">
                      <span className="grid size-11 place-items-center rounded-full bg-stone-100 text-stone-500"><DashboardIcon name="orders" size={21} /></span>
                      <p className="mb-0 mt-3 text-sm font-semibold text-stone-800">{search || filter !== 'all' ? 'No matching activity' : 'No orders on this date'}</p>
                      <p className="mb-0 mt-1 text-xs text-stone-500">Choose another date or adjust your filters.</p>
                    </div>
                  )}
                </div>
                <footer className="border-t border-stone-100 px-5 py-3">
                  <button type="button" className="text-sm font-semibold text-amber-800 transition hover:text-amber-950" onClick={() => navigate('/staff/orders')}>Open order management <span aria-hidden="true">→</span></button>
                </footer>
              </section>

              {/* Right column: inventory + quick info */}
              <aside className="sd-right">
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="dashboard-stock-title">
                  <header className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Inventory</p>
                      <h2 id="dashboard-stock-title" className="mt-1 text-lg font-bold tracking-tight text-stone-900">Needs attention</h2>
                    </div>
                    <span className={`grid size-10 place-items-center rounded-xl ${lowStock.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}><DashboardIcon name={lowStock.length ? 'warning' : 'checkCircle'} size={19} /></span>
                  </header>
                  {lowStock.length ? (
                    <ul className="mt-4 grid gap-2">
                      {lowStock.slice(0, 5).map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                          <span className="min-w-0 truncate text-sm font-medium text-stone-700">{item.name}</span>
                          <span className={`shrink-0 text-xs font-semibold ${Number(item.quantity) === 0 ? 'text-rose-700' : 'text-amber-700'}`}>{Number(item.quantity) === 0 ? 'Out' : `${item.quantity} left`}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">{loading ? 'Checking stock levels…' : 'No low-stock items right now.'}</p>
                  )}
                  <button type="button" className="mt-4 text-sm font-semibold text-amber-800 transition hover:text-amber-950" onClick={() => navigate('/staff/stocks')}>Review inventory <span aria-hidden="true">→</span></button>
                </section>

                <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm" aria-labelledby="dashboard-quick-title">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Quick info</p>
                  <h2 id="dashboard-quick-title" className="mt-1 text-lg font-bold tracking-tight text-stone-900">Stay on top of service</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Review new orders promptly and keep ingredient quantities current to help the team prepare each order.</p>
                  <div className="mt-4 grid gap-2">
                    <button type="button" className="flex min-h-11 items-center justify-between rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-amber-200 hover:bg-amber-50" onClick={() => navigate('/staff/orders')}>View incoming orders <span aria-hidden="true">→</span></button>
                    <button type="button" className="flex min-h-11 items-center justify-between rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-amber-200 hover:bg-amber-50" onClick={() => navigate('/staff/menu')}>Manage menu <span aria-hidden="true">→</span></button>
                    <button type="button" className="flex min-h-11 items-center justify-between rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-amber-200 hover:bg-amber-50" onClick={() => navigate('/staff/customers')}>View customers <span aria-hidden="true">→</span></button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </main>
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}