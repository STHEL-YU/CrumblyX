import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'

const LOW_STOCK_THRESHOLD = 5
const SKELETON_ROWS = [0, 1, 2, 3, 4]

/* ---------- shared class strings ---------- */
const inputCls = 'mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15'
const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60'
const ghostBtn = 'inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20'
const categoryTone = {
  Pastry: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Beverages: 'bg-sky-50 text-sky-800 ring-sky-600/20',
}

/* ---------- data helpers ---------- */
async function apiRequest(path, method = 'GET', body, signal) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed.')
  return data
}

const stockRequest = (action, method, body, signal) => apiRequest(`/api/stocks/${action}`, method, body, signal)

function normalizeStock(stock) {
  return { ...stock, quantity: stock.quantity == null ? null : Number(stock.quantity) }
}

const nameKey = (value) => String(value || '').trim().toLocaleLowerCase()

// Stock rows come from the Menu list. A stock record only supplies the quantity.
// Records are matched by id first, then by item name (older records used their own ids).
function mergeWithMenu(menuItems, records) {
  const byId = new Map(records.map((record) => [record.id, record]))
  const byName = new Map(records.map((record) => [nameKey(record.name), record]))
  return menuItems.map((menuItem) => {
    const record = byId.get(menuItem.id) || byName.get(nameKey(menuItem.name)) || null
    return {
      id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      quantity: record ? record.quantity : null,
      record,
    }
  })
}

function getStockStatus(quantity) {
  if (quantity === null) return 'in-stock'
  if (quantity === 0) return 'out-of-stock'
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low-stock'
  return 'in-stock'
}

const STATUS_RANK = { 'out-of-stock': 0, 'low-stock': 1, 'in-stock': 2 }

const STOCK_STATUS = {
  'in-stock': { label: 'In stock', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  'low-stock': { label: 'Low stock', badge: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500' },
  'out-of-stock': { label: 'Out of stock', badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
}

// Escape to close + Tab focus trap. onClose lives in a ref so the effect runs once.
function useDialogA11y(dialogRef, onClose) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

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
  }, [dialogRef])
}

/* ---------- dialog ---------- */
function StockEditor({ item, onClose, onSave }) {
  const [quantity, setQuantity] = useState(item.quantity == null ? '' : String(item.quantity))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)

  useDialogA11y(dialogRef, onClose)

  async function submit(event) {
    event.preventDefault()
    const normalizedQuantity = quantity === '' ? null : Number(quantity)
    if (normalizedQuantity !== null && (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 0 || normalizedQuantity > 1000000)) {
      setError('Enter a whole number from 0 to 1,000,000, or leave it blank if you don’t track this item.')
      return
    }
    setSaving(true)
    const saved = await onSave(item, normalizedQuantity)
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <div
      className={adminTw('fixed inset-0 z-50 grid place-items-center bg-stone-900/40 p-4 backdrop-blur-sm')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={dialogRef}
        className={adminTw('max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-stock-modal-title"
      >
        <header className={adminTw('mb-5 flex items-start justify-between gap-4')}>
          <h2 id="staff-stock-modal-title" className={adminTw('text-lg font-semibold text-stone-900')}>Update stock</h2>
          <button type="button" aria-label="Close stock form" onClick={onClose} className={adminTw('-mr-2 -mt-1 rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800')}>
            <DashboardIcon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={submit} className={adminTw('space-y-4')}>
          <div className={adminTw('flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200')}>
            <div className={adminTw('min-w-0')}>
              <p className={adminTw('truncate font-medium text-stone-900')}>{item.name}</p>
              <p className={adminTw('text-xs text-stone-500')}>From your menu</p>
            </div>
            <span className={adminTw(`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryTone[item.category] || 'bg-stone-100 text-stone-700 ring-stone-500/20'}`)}>{item.category}</span>
          </div>

          <label className={adminTw('block text-sm font-medium text-stone-700')}>
            Stock quantity
            <input className={adminTw(inputCls)} type="number" min="0" max="1000000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Not tracked" />
          </label>
          <p className={adminTw('text-xs text-stone-500')}>Items with {LOW_STOCK_THRESHOLD} or fewer left are flagged as low stock. Leave blank if you don’t count this item.</p>

          {error && <p className={adminTw('rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-600/10')} role="alert">{error}</p>}

          <div className={adminTw('flex justify-end gap-2 pt-2')}>
            <button type="button" className={adminTw(ghostBtn)} onClick={onClose}>Cancel</button>
            <button type="submit" className={adminTw(primaryBtn)} disabled={saving}>{saving ? 'Saving…' : 'Save quantity'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

/* ---------- small pieces ---------- */
function StockStatus({ quantity }) {
  const status = STOCK_STATUS[getStockStatus(quantity)]
  return (
    <span className={adminTw(`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.badge}`)}>
      <i aria-hidden="true" className={adminTw(`h-1.5 w-1.5 rounded-full ${status.dot}`)} />
      <span>{status.label}</span>
    </span>
  )
}

const SUMMARY_TONES = {
  coffee: 'bg-stone-100 text-stone-700',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
}

function SummaryCard({ label, value, icon, tone, selected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={adminTw(`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25 ${selected ? 'border-amber-500 ring-4 ring-amber-500/15' : 'border-stone-200 hover:border-stone-300 hover:shadow'}`)}
    >
      <span className={adminTw(`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${SUMMARY_TONES[tone]}`)}><DashboardIcon name={icon} size={20} /></span>
      <span className={adminTw('min-w-0')}>
        <span className={adminTw('block text-sm text-stone-500')}>{label}</span>
        <strong className={adminTw('block text-2xl font-semibold tabular-nums text-stone-900')}>{value}</strong>
      </span>
    </button>
  )
}

function SkeletonRows() {
  return SKELETON_ROWS.map((row) => (
    <tr key={row} className={adminTw('animate-pulse')} aria-hidden="true">
      <td className={adminTw('px-4 py-3.5')}><span className={adminTw('block h-3.5 w-36 rounded bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3.5')}><span className={adminTw('block h-5 w-20 rounded-full bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3.5')}><span className={adminTw('mx-auto block h-3.5 w-8 rounded bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3.5')}><span className={adminTw('block h-5 w-24 rounded-full bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3.5')}><span className={adminTw('ml-auto block h-7 w-20 rounded bg-stone-200')} /></td>
    </tr>
  ))
}

/* ---------- page ---------- */
export default function StaffStock() {
  const [menuItems, setMenuItems] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [editingItem, setEditingItem] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const navigate = useNavigate()

  const items = useMemo(() => mergeWithMenu(menuItems, records), [menuItems, records])

  const counts = useMemo(() => items.reduce((result, item) => {
    result.total += 1
    result[getStockStatus(item.quantity)] += 1
    return result
  }, { total: 0, 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 0 }), [items])

  const visibleStocks = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase()
    return items
      .filter((item) => statusFilter === 'all' || getStockStatus(item.quantity) === statusFilter)
      .filter((item) => !normalizedQuery || `${item.name} ${item.category}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        let comparison
        if (sort.key === 'quantity') {
          comparison = (first.quantity ?? -1) - (second.quantity ?? -1)
        } else if (sort.key === 'status') {
          comparison = STATUS_RANK[getStockStatus(first.quantity)] - STATUS_RANK[getStockStatus(second.quantity)]
        } else {
          comparison = String(first[sort.key]).localeCompare(String(second[sort.key]))
        }
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [items, deferredQuery, sort, statusFilter])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast({ message })
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  // Load the menu (the source of the item list) and the saved quantities together.
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      apiRequest('/api/menu/list', 'GET', undefined, controller.signal),
      stockRequest('list', 'GET', undefined, controller.signal),
    ])
      .then(([menu, stocks]) => {
        if (!Array.isArray(menu) || !Array.isArray(stocks)) throw new Error('Invalid response.')
        setMenuItems(menu.map(({ id, name, category }) => ({ id, name, category })))
        setRecords(stocks.map(normalizeStock))
      })
      .catch((error) => {
        if (!controller.signal.aborted) showToast(`Could not load inventory: ${error.message}`)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [showToast])

  async function saveQuantity(item, quantity) {
    try {
      const payload = item.record
        ? { ...item.record, name: item.name, category: item.category, quantity }
        : { id: item.id, name: item.name, category: item.category, quantity }
      const savedStock = normalizeStock(await stockRequest(
        item.record ? 'update' : 'create',
        item.record ? 'PUT' : 'POST',
        payload,
      ))
      setRecords((current) => (item.record
        ? current.map((record) => (record.id === savedStock.id ? savedStock : record))
        : [...current, savedStock]))

      if (item.quantity !== savedStock.quantity) {
        const previousStatus = getStockStatus(item.quantity)
        const nextStatus = getStockStatus(savedStock.quantity)
        if (nextStatus === 'low-stock' && previousStatus !== 'low-stock') showToast(`${item.name} is low on stock`)
        else if (nextStatus === 'out-of-stock' && previousStatus !== 'out-of-stock') showToast(`${item.name} is out of stock`)
        else showToast(`${item.name} stock updated`)
      } else {
        showToast(`${item.name} stock updated`)
      }
      return true
    } catch (error) {
      showToast(error.message)
      return false
    }
  }

  function sortBy(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  }

  function sortHeader(label, key, align = 'left') {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={adminTw(`px-4 py-3 ${align === 'center' ? 'text-center' : 'text-left'}`)}>
        <button
          type="button"
          onClick={() => sortBy(key)}
          aria-label={`Sort by ${label}${active ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
          className={adminTw('inline-flex items-center gap-1.5 rounded transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20')}
        >
          {label}
          <span aria-hidden="true" className={adminTw(active ? 'text-amber-600' : 'text-stone-300')}>{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    )
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    if (name === 'Dashboard') navigate('/staff/dashboard')
    else if (name === 'Orders') navigate('/staff/orders')
    else if (name === 'Menu') navigate('/staff/menu')
    else if (name === 'Customers') navigate('/staff/customers')
  }

  function toggleStatusFilter(status) {
    setStatusFilter((current) => (current === status ? 'all' : status))
  }

  const isEmpty = !loading && visibleStocks.length === 0
  const noMenuItems = !loading && items.length === 0
  const needsAttention = counts['low-stock'] + counts['out-of-stock']
  const countValue = (value) => (loading ? '–' : value)

  return (
    <div className={adminTw('admin-dashboard staff-stock-app')}>
      <style>{`
        .staff-stock-app { min-height: calc(100dvh - 2.5rem) !important; }
        .stock-table th, .stock-table td { font-size: 0.875rem !important; line-height: 1.25rem !important; }
        .stock-table thead th { font-size: 0.8125rem !important; font-weight: 600 !important; color: #78716c; }
        .stock-table thead button { font: inherit !important; color: inherit !important; }
        .stock-table thead th[aria-sort="ascending"], .stock-table thead th[aria-sort="descending"] { color: #1c1917; }
      `}</style>
      <button className={adminTw(`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`)} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={adminTw(`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`)} aria-label="Staff navigation">
        <div className={adminTw('admin-brand')}><Logo small /><span>CrumblyX</span><button type="button" className={adminTw('admin-drawer-close')} aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button></div>
        <div className={adminTw('admin-side-divider')} />
        <nav className={adminTw('admin-nav')} aria-label="Main navigation">
          {STAFF_NAVIGATION.map((entry) => (
            <button type="button" key={entry.name} className={adminTw(`admin-nav-item ${entry.name === 'Stocks' ? 'active' : ''}`)} aria-current={entry.name === 'Stocks' ? 'page' : undefined} onClick={() => navigateSection(entry.name)}>
              <DashboardIcon name={entry.icon} /><span>{entry.name}</span>
            </button>
          ))}
        </nav>
        <div className={adminTw('admin-account')}><div className={adminTw('admin-side-divider')} /><div className={adminTw('admin-user')}><button type="button" className={adminTw('admin-avatar admin-avatar-trigger')} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button><span className={adminTw('admin-user-copy')}><strong>John Doe</strong><small>doe@example.com</small></span><button type="button" className={adminTw('admin-logout')} aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button></div></div>
      </aside>

      <main className={adminTw('admin-main staff-stock-main')}>
        <header className={adminTw('admin-topbar')}>
          <div className={adminTw('admin-title-group')}>
            <button type="button" className={adminTw('admin-hamburger')} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="stocks" size={24} /><h1>Stocks</h1>
          </div>
          <div className={adminTw('admin-top-actions')}>
            <div className={adminTw('admin-chat-wrap')}>
              <button type="button" className={adminTw('admin-chat-button')} aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}><DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b></button>
              {chatOpen && <div className={adminTw('admin-chat-popover')} role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className={adminTw('px-3 py-2 text-sm text-stone-600')}>2 unread customer messages</p></div>}
            </div>
            <button type="button" className={adminTw('admin-avatar top-avatar admin-avatar-trigger')} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className={adminTw('mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6')}>
          {/* Title and search */}
          <section className={adminTw('flex flex-col gap-4 md:flex-row md:items-end md:justify-between')} aria-label="Search inventory">
            <div>
              <h2 className={adminTw('text-2xl font-semibold tracking-tight text-stone-900')}>Inventory</h2>
              <p className={adminTw('mt-1 text-sm text-stone-500')} aria-live="polite">
                {loading ? 'Loading inventory…' : needsAttention > 0 ? `${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} restocking` : 'Everything is well stocked'}
              </p>
            </div>
            <label className={adminTw('relative block md:w-80')}>
              <span className={adminTw('pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400')}><DashboardIcon name="search" size={18} /></span>
              <span className={adminTw('sr-only')}>Search stock by item name or category</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items"
                className={adminTw('w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-9 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 [&::-webkit-search-cancel-button]:appearance-none')}
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className={adminTw('absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700')}>
                  <DashboardIcon name="close" size={15} />
                </button>
              )}
            </label>
          </section>

          {/* Summary cards double as status filters */}
          <section className={adminTw('grid grid-cols-2 gap-3 lg:grid-cols-4')} aria-label="Inventory overview" aria-live="polite">
            <SummaryCard label="Total items" value={countValue(counts.total)} icon="boxOpen" tone="coffee" selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <SummaryCard label="In stock" value={countValue(counts['in-stock'])} icon="checkCircle" tone="green" selected={statusFilter === 'in-stock'} onClick={() => toggleStatusFilter('in-stock')} />
            <SummaryCard label="Low stock" value={countValue(counts['low-stock'])} icon="warning" tone="amber" selected={statusFilter === 'low-stock'} onClick={() => toggleStatusFilter('low-stock')} />
            <SummaryCard label="Out of stock" value={countValue(counts['out-of-stock'])} icon="alertCircle" tone="red" selected={statusFilter === 'out-of-stock'} onClick={() => toggleStatusFilter('out-of-stock')} />
          </section>

          {/* Table card */}
          <section className={adminTw('overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm')} aria-labelledby="staff-stock-table-title">
            <div className={adminTw('flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3')}>
              <div>
                <h2 id="staff-stock-table-title" className={adminTw('text-sm font-semibold text-stone-900')}>
                  {statusFilter === 'all' ? 'All items' : STOCK_STATUS[statusFilter].label}
                </h2>
                <p className={adminTw('text-xs text-stone-500')}>Items come from your menu. Add or remove them in Menu.</p>
              </div>
              <span className={adminTw('shrink-0 text-sm text-stone-500')}>{visibleStocks.length} {visibleStocks.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className={adminTw('overflow-x-auto')}>
              <table className={adminTw('stock-table w-full min-w-[640px] border-collapse text-sm')}>
                <caption className={adminTw('sr-only')}>CrumblyX inventory stock levels and actions</caption>
                <thead className={adminTw('bg-stone-50')}>
                  <tr className={adminTw('border-b border-stone-200')}>
                    {sortHeader('Item', 'name')}
                    {sortHeader('Category', 'category')}
                    {sortHeader('Stock qty', 'quantity', 'center')}
                    {sortHeader('Status', 'status')}
                    <th scope="col" className={adminTw('px-4 py-3 text-right')}>Actions</th>
                  </tr>
                </thead>
                <tbody className={adminTw('divide-y divide-stone-100')}>
                  {loading && <SkeletonRows />}
                  {!loading && visibleStocks.map((item) => {
                    const status = getStockStatus(item.quantity)
                    return (
                      <tr key={item.id} className={adminTw('transition-colors hover:bg-amber-50/40')}>
                        <th scope="row" data-label="Item" className={adminTw('px-4 py-3.5 text-left font-medium text-stone-900')}>{item.name}</th>
                        <td data-label="Category" className={adminTw('px-4 py-3.5')}>
                          <span className={adminTw(`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryTone[item.category] || 'bg-stone-100 text-stone-700 ring-stone-500/20'}`)}>{item.category}</span>
                        </td>
                        <td data-label="Stock Qty" className={adminTw(`px-4 py-3.5 text-center font-semibold tabular-nums ${status === 'out-of-stock' ? 'text-rose-600' : status === 'low-stock' ? 'text-amber-700' : 'text-stone-800'}`)}>{item.quantity == null ? '—' : item.quantity}</td>
                        <td data-label="Status" className={adminTw('px-4 py-3.5')}><StockStatus quantity={item.quantity} /></td>
                        <td data-label="Actions" className={adminTw('px-4 py-3.5')}>
                          <div className={adminTw('flex justify-end')}>
                            <button
                              type="button"
                              aria-label={`Update stock for ${item.name}`}
                              onClick={() => setEditingItem(item)}
                              className={adminTw('inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20')}
                            >
                              <DashboardIcon name="edit" size={14} />Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {isEmpty && (
                    <tr>
                      <td colSpan="5" className={adminTw('px-4 py-14 text-center')}>
                        <span className={adminTw('mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-400')}><DashboardIcon name="search" size={21} /></span>
                        <strong className={adminTw('block text-stone-900')}>{noMenuItems ? 'No menu items yet' : 'No matching items'}</strong>
                        <small className={adminTw('mt-1 block text-stone-500')}>{noMenuItems ? 'Stock is tracked for items on your menu. Add an item there first.' : 'Try a different name, or clear the filter.'}</small>
                        {noMenuItems && <button type="button" className={adminTw(`${primaryBtn} mt-4`)} onClick={() => navigate('/staff/menu')}>Go to Menu</button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {toast && (
        <div className={adminTw('fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl')} role="status">
          <DashboardIcon name="check" size={16} />
          <span>{toast.message}</span>
        </div>
      )}
      {editingItem && <StockEditor item={editingItem} onClose={() => setEditingItem(null)} onSave={saveQuantity} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}