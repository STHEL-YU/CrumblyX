import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardIcon, StaffProfileDialog, StaffSpinner } from './staff_admin_shared.jsx'
import Sidebar from './staff_sidebar.jsx'
import StaffMessageInbox from './staff_message_inbox.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'

const PAGE_SIZE = 10
const REFRESH_INTERVAL = 30000

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthStart(date) {
  return dateKey(new Date(date.getFullYear(), date.getMonth(), 1))
}

function safeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function peso(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function displayMonth(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function SalesMetric({ label, value, caption, icon, tone }) {
  return (
    <article className="flex min-w-0 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><DashboardIcon name={icon} size={21} /></span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-stone-900">{value}</p>
        <p className="mt-0.5 truncate text-xs text-stone-400">{caption}</p>
      </div>
    </article>
  )
}

export default function StaffSales() {
  const [initialDates] = useState(() => {
    const now = new Date()
    return { startDate: monthStart(now), endDate: dateKey(now) }
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [range, setRange] = useState('month')
  const [startDate, setStartDate] = useState(initialDates.startDate)
  const [endDate, setEndDate] = useState(initialDates.endDate)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    let refreshing = false
    let controller

    async function refreshSales() {
      if (refreshing) return
      refreshing = true
      controller = new AbortController()
      try {
        const response = await fetch('/api/orders/list', { signal: controller.signal })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || `Could not load sales (${response.status}).`)
        if (!Array.isArray(data.orders)) throw new Error('Invalid orders response.')
        if (active) {
          setOrders(data.orders)
          setError('')
        }
      } catch (requestError) {
        if (active && !controller.signal.aborted) setError(requestError.message)
      } finally {
        refreshing = false
        if (active) setLoading(false)
      }
    }

    refreshSales()
    const timer = window.setInterval(refreshSales, REFRESH_INTERVAL)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(timer)
    }
  }, [refreshTrigger])

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'completed' && safeDate(order.createdAt)),
    [orders],
  )
  const periodOrders = useMemo(() => completedOrders.filter((order) => {
    if (range === 'all') return true
    const key = dateKey(safeDate(order.createdAt))
    return key >= startDate && key <= endDate
  }), [completedOrders, endDate, range, startDate])
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const searchedOrders = useMemo(
    () => periodOrders.filter((order) => !normalizedSearch || `${order.id} ${order.customerName || ''} ${order.customerEmail || ''} ${order.orderType || ''}`.toLocaleLowerCase().includes(normalizedSearch)),
    [normalizedSearch, periodOrders],
  )
  const pageCount = Math.max(1, Math.ceil(searchedOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageOrders = searchedOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const totalSales = periodOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const averageSale = periodOrders.length ? totalSales / periodOrders.length : 0
  const monthlySales = useMemo(() => {
    const groups = new Map()
    for (const order of periodOrders) {
      const date = safeDate(order.createdAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const current = groups.get(key) || { month: key, orders: 0, sales: 0 }
      current.orders += 1
      current.sales += Number(order.total) || 0
      groups.set(key, current)
    }
    return [...groups.values()].sort((first, second) => second.month.localeCompare(first.month))
  }, [periodOrders])

  function chooseRange(nextRange) {
    setRange(nextRange)
    setPage(1)
    if (nextRange === 'month') {
      const current = new Date()
      setStartDate(monthStart(current))
      setEndDate(dateKey(current))
    }
  }

  function updateStartDate(value) {
    setStartDate(value)
    setRange('custom')
    setPage(1)
  }

  function updateEndDate(value) {
    setEndDate(value)
    setRange('custom')
    setPage(1)
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    const routes = {
      Dashboard: '/staff/dashboard',
      Orders: '/staff/orders',
      Sales: '/staff/sales',
      Menu: '/staff/menu',
      Stocks: '/staff/stocks',
      Customers: '/staff/customers',
    }
    if (routes[name] && name !== 'Sales') navigate(routes[name])
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  return (
    <div className={adminTw('admin-dashboard')}>
      <Sidebar activeRoute="Sales" drawerOpen={drawerOpen} onNavigate={navigateSection} onClose={() => setDrawerOpen(false)} profileOpen={profileOpen} onOpenProfile={openProfile} onLogout={logout} />
      <main className={adminTw('admin-main')}>
        <header className={adminTw('admin-topbar')}>
          <div className={adminTw('admin-title-group')}>
            <button type="button" className={adminTw('admin-hamburger')} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="sales" size={23} />
            <h1>Sales</h1>
          </div>
          <div className={adminTw('admin-top-actions')}>
            <StaffMessageInbox />
            <button type="button" className={adminTw('admin-avatar top-avatar admin-avatar-trigger')} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#faf9f6]">
          <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Revenue overview</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Sales report</h2>
                <p className="mt-1 text-sm text-stone-500">Sales include completed orders only.</p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Sales date range">
                <button type="button" aria-pressed={range === 'month'} className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${range === 'month' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`} onClick={() => chooseRange('month')}>This month</button>
                <button type="button" aria-pressed={range === 'all'} className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${range === 'all' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`} onClick={() => chooseRange('all')}>All time</button>
              </div>
            </section>

            {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert"><span>Could not refresh sales: {error}</span><button type="button" className="font-semibold underline" onClick={() => { setLoading(true); setError(''); setRefreshTrigger((current) => current + 1) }}>Retry</button></div>}

            <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Sales summary">
              <SalesMetric label="Total sales" value={loading && !orders.length ? '—' : peso(totalSales)} caption={range === 'all' ? 'All recorded completed orders' : range === 'month' ? displayMonth(startDate.slice(0, 7)) : `${startDate} – ${endDate}`} icon="sales" tone="bg-emerald-50 text-emerald-700" />
              <SalesMetric label="Completed orders" value={loading && !orders.length ? '—' : periodOrders.length.toLocaleString()} caption="Orders in selected period" icon="orders" tone="bg-amber-50 text-amber-700" />
              <SalesMetric label="Average order" value={loading && !orders.length ? '—' : peso(averageSale)} caption="Sales divided by completed orders" icon="chart" tone="bg-sky-50 text-sky-700" />
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Custom date range">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Specific dates</h3>
                  <p className="mt-1 text-xs text-stone-500">Choose a date range to review sales for selected days.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-stone-600">From
                    <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => updateStartDate(event.target.value)} className="min-h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-normal text-stone-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-stone-600">To
                    <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => updateEndDate(event.target.value)} className="min-h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-normal text-stone-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" />
                  </label>
                </div>
              </div>
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
              <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-labelledby="sales-orders-title">
                <header className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 id="sales-orders-title" className="text-lg font-bold tracking-tight text-stone-900">Completed sales</h3>
                    <p className="mt-1 text-sm text-stone-500">{searchedOrders.length} matching {searchedOrders.length === 1 ? 'order' : 'orders'}</p>
                  </div>
                  <label className="flex min-h-10 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-stone-400 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 sm:w-72">
                    <DashboardIcon name="search" size={17} />
                    <span className="sr-only">Search sales</span>
                    <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search customer or order…" className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
                  </label>
                </header>
                {loading && orders.length === 0 ? (
                  <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-stone-500"><StaffSpinner className="size-4" />Loading sales…</div>
                ) : pageOrders.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-collapse text-left">
                        <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                          <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Order type</th><th className="px-5 py-3 text-right">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {pageOrders.map((order) => {
                            const created = safeDate(order.createdAt)
                            return (
                              <tr key={order.id} className="transition hover:bg-stone-50">
                                <td className="whitespace-nowrap px-5 py-4">
                                  <time className="block text-sm font-medium text-stone-800" dateTime={order.createdAt}>{created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                  <span className="mt-0.5 block text-xs text-stone-400">{created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                </td>
                                <td className="max-w-56 truncate px-5 py-4 text-sm font-medium text-stone-800">{order.customerName || 'Guest customer'}</td>
                                <td className="px-5 py-4 text-sm text-stone-500">{order.orderType || 'Order'}</td>
                                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-stone-900">{peso(order.total)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <footer className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="m-0 text-sm text-stone-500" aria-live="polite">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, searchedOrders.length)} of {searchedOrders.length}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" className="min-h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-40" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button>
                        <span className="min-w-16 text-center text-sm text-stone-500">{currentPage} / {pageCount}</span>
                        <button type="button" className="min-h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-40" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next</button>
                      </div>
                    </footer>
                  </>
                ) : (
                  <div className="grid min-h-64 place-content-center justify-items-center px-6 text-center">
                    <span className="grid size-11 place-items-center rounded-full bg-stone-100 text-stone-500"><DashboardIcon name="sales" size={21} /></span>
                    <p className="mb-0 mt-3 text-sm font-semibold text-stone-800">{search ? 'No matching sales' : 'No completed sales in this period'}</p>
                    <p className="mb-0 mt-1 text-xs text-stone-500">Try another date range or search term.</p>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-labelledby="sales-monthly-title">
                <header className="border-b border-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">By month</p>
                  <h3 id="sales-monthly-title" className="mt-1 text-lg font-bold tracking-tight text-stone-900">Monthly totals</h3>
                </header>
                {monthlySales.length ? (
                  <ul className="divide-y divide-stone-100">
                    {monthlySales.map((item) => (
                      <li key={item.month} className="flex items-center justify-between gap-3 px-5 py-4">
                        <div>
                          <p className="m-0 text-sm font-semibold text-stone-800">{displayMonth(item.month)}</p>
                          <p className="m-0 mt-1 text-xs text-stone-400">{item.orders} completed {item.orders === 1 ? 'order' : 'orders'}</p>
                        </div>
                        <strong className="text-sm font-bold tabular-nums text-stone-900">{peso(item.sales)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 px-5 py-8 text-center text-sm text-stone-400">Monthly sales totals will appear here.</p>
                )}
              </section>
            </div>
            <p className="m-0 text-xs text-stone-400">Sales refresh automatically every {REFRESH_INTERVAL / 1000} seconds. Only orders marked completed are included.</p>
          </div>
        </div>
      </main>
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}
