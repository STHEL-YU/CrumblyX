import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardIcon, StaffProfileDialog, StaffSpinner } from './staff_admin_shared.jsx'
import { logoutStaff } from './auth/staff_auth_client.js'
import Sidebar from './staff_sidebar.jsx'
import StaffMessageInbox from './staff_message_inbox.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'

const CUSTOMER_FILTERS = [
  { filter: 'all', label: 'Total Customers', icon: 'customers', tone: 'coffee' },
  { filter: 'new', label: 'New Customers', icon: 'userPlus', tone: 'green' },
  { filter: 'active', label: 'Active Customers', icon: 'star', tone: 'amber' },
  { filter: 'inactive', label: 'Inactive Customers', icon: 'userSlash', tone: 'red' },
]
const CUSTOMER_PAGE_SIZE = 10

async function customerRequest(action, method = 'GET', body, signal) {
  const response = await fetch(`/api/customers/${action}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Customer request failed.')
  return data
}

function isNewCustomer(customer) {
  const daysSinceJoined = (Date.now() - new Date(customer.joinedAt).getTime()) / 86400000
  return daysSinceJoined >= 0 && daysSinceJoined <= 30
}

function CustomerStatus({ status }) {
  const active = status === 'active'
  return <span className={adminTw(`staff-customer-status inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${active ? 'status-active bg-green-100 text-green-900' : 'status-inactive bg-red-100 text-red-900'}`)}><i className={adminTw("size-2 rounded-full bg-current")} aria-hidden="true" />{active ? 'Active' : 'Inactive'}</span>
}

function CustomerDialog({ customer, mode, onClose, onModeChange, onSave, onConfirmDelete }) {
  const [name, setName] = useState(customer?.name || '')
  const [email, setEmail] = useState(customer?.email || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [location, setLocation] = useState(customer?.location || '')
  const [status, setStatus] = useState(customer?.status || 'active')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const dialogRef = useRef(null)
  const closeTimer = useRef(null)
  const isEditing = mode === 'edit' || mode === 'details-edit'
  const isDetailsEdit = mode === 'details-edit'
  const isDetails = mode === 'details'
  const isDeleting = mode === 'delete-confirm' || mode === 'details-delete-confirm'
  const isBusy = saving || deleting

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const closeDialog = useCallback(() => {
    if (isClosing || isBusy) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimer.current = window.setTimeout(onClose, 180)
  }, [isBusy, isClosing, onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector('[aria-label="Close customer details"]')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeDialog()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]')]
        .filter((element) => element.getAttribute('type') !== 'checkbox' || getComputedStyle(element).position !== 'absolute')
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
  }, [closeDialog])

  async function submit(event) {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLocaleLowerCase()
    const normalizedPhone = phone.trim()
    if (!normalizedName) {
      setError('Enter the customer name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (!/^09\d{2}\s?\d{3}\s?\d{4}$/.test(normalizedPhone)) {
      setError('Enter a valid PH mobile number, such as 0917 123 4567.')
      return
    }
    if (!location.trim()) {
      setError('Enter a customer location.')
      return
    }
    setSaving(true)
    try {
      const saveError = await onSave({ ...customer, name: normalizedName, email: normalizedEmail, phone: normalizedPhone, location: location.trim(), status })
      if (saveError) setError(saveError)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      const deleteError = await onConfirmDelete()
      if (deleteError) setError(deleteError)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={adminTw(`staff-customer-modal-backdrop ${isClosing ? 'is-closing' : ''}`)} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
      <section ref={dialogRef} className={adminTw(`staff-customer-modal max-h-[90dvh] overflow-y-auto ${isDetails ? 'sm:max-w-[520px]' : ''} ${isClosing ? 'is-closing' : ''}`)} role="dialog" aria-modal="true" aria-labelledby="staff-customer-dialog-title">
        <header>
          <div>
            {isDetails && <p className={adminTw("mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700")}>Customer profile</p>}
            <h2 id="staff-customer-dialog-title" className={adminTw("text-xl font-bold tracking-tight text-stone-900")}>{isDetails ? 'Customer details' : isDeleting ? 'Delete customer?' : isEditing ? customer?.id ? 'Update details' : 'Add customer' : 'Edit customer'}</h2>
          </div>
          <button type="button" className={adminTw("staff-customer-modal-close")} aria-label="Close customer details" onClick={closeDialog} disabled={isBusy}><DashboardIcon name="close" /></button>
        </header>

        {isDetails && (
          <div className={adminTw("staff-customer-profile")}>
            <div className={adminTw("staff-customer-profile-heading")}>
              {customer.photo
                ? <img className={adminTw("staff-customer-profile-avatar")} src={customer.photo} alt={`${customer.name} profile`} />
                : <span className={adminTw("staff-customer-profile-avatar")}><DashboardIcon name="person" size={48} /></span>}
              <div><h3>{customer.name}</h3><p>{customer.email}</p></div>
            </div>
            <dl className={adminTw("staff-customer-details-list")}>
              {/* <div><dt>Contact number</dt><dd>{customer.phone || 'Not provided'}</dd></div>
              <div><dt>Location</dt><dd>{customer.location || 'Not provided'}</dd></div> */}
              <div><dt>Account status</dt><dd><CustomerStatus status={customer.status} /></dd></div>
            </dl>
            <div className={adminTw("staff-customer-detail-actions")}>
              <button className={adminTw("staff-customer-delete-button")} type="button" onClick={() => onModeChange('details-delete-confirm')}><DashboardIcon name="trash" size={16} />Delete Customer</button>
            </div>
          </div>
        )}



        {isDeleting && (
          <div className={adminTw("staff-customer-delete-confirm")}>
            <p>Delete <strong>{customer.name}</strong>? This can’t be undone.</p>
          {error && <p className={adminTw("staff-customer-form-error")} role="alert">{error}</p>}
          <div><button className={adminTw("staff-customer-secondary")} type="button" onClick={() => mode === 'details-delete-confirm' ? onModeChange('details') : closeDialog()} disabled={deleting}>Cancel</button><button className={adminTw("staff-customer-danger")} type="button" onClick={confirmDelete} disabled={deleting} aria-busy={deleting}>{deleting && <StaffSpinner />}{deleting ? 'Deleting…' : 'Delete customer'}</button></div>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value, icon, tone, selected, onClick }) {
  return (
    <button type="button" className={adminTw(`staff-customer-summary-card rounded-2xl border border-amber-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'selected' : ''}`)} aria-pressed={selected} onClick={onClick}>
      <span className={adminTw(`staff-customer-summary-icon tone-${tone}`)}><DashboardIcon name={icon} size={20} /></span>
      <span className={adminTw("staff-customer-summary-label")}>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'id', direction: 'asc' })
  const [dialog, setDialog] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [toast, setToast] = useState(null)
  const [page, setPage] = useState(1)
  const toastTimer = useRef(null)
  const dialogTrigger = useRef(null)
  const navigate = useNavigate()
  const closeDialog = useCallback(() => setDialog(null), [])

  useEffect(() => {
    const controller = new AbortController()
    customerRequest('list', 'GET', undefined, controller.signal)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid customers response.')
        if (!controller.signal.aborted) {
          setCustomers(data)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  const counts = useMemo(() => customers.reduce((result, customer) => {
    result.total += 1
    result[customer.status] += 1
    if (isNewCustomer(customer)) result.new += 1
    return result
  }, { total: 0, active: 0, inactive: 0, new: 0 }), [customers])

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return customers
      .filter((customer) => filter === 'all' || (filter === 'new' ? isNewCustomer(customer) : customer.status === filter))
      .filter((customer) => !normalizedQuery || `${customer.id} ${customer.name} ${customer.email} ${customer.phone} ${customer.location || ''}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        const comparison = String(first[sort.key]).localeCompare(String(second[sort.key]), undefined, { numeric: true, sensitivity: 'base' })
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [customers, filter, query, sort])
  const pageCount = Math.max(1, Math.ceil(visibleCustomers.length / CUSTOMER_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageCustomers = visibleCustomers.slice(
    (currentPage - 1) * CUSTOMER_PAGE_SIZE,
    currentPage * CUSTOMER_PAGE_SIZE,
  )
  const firstEntry = visibleCustomers.length === 0 ? 0 : (currentPage - 1) * CUSTOMER_PAGE_SIZE + 1
  const lastEntry = Math.min(currentPage * CUSTOMER_PAGE_SIZE, visibleCustomers.length)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => {
    if (!dialog) {
      if (dialogTrigger.current?.isConnected) dialogTrigger.current.focus()
      else document.getElementById('staff-customer-table-title')?.focus()
    }
  }, [dialog])

  function showToast(message) {
    window.clearTimeout(toastTimer.current)
    setToast({ message })
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  function openDialog(mode, customer, event) {
    dialogTrigger.current = event.currentTarget
    setDialog({ mode, customer })
  }

  async function handleSave(customer) {
    const existing = customers.some((item) => item.id === customer.id)
    try {
      const savedCustomer = await customerRequest(
        existing ? 'update' : 'create',
        existing ? 'PUT' : 'POST',
        customer,
      )
      setCustomers((current) => existing
        ? current.map((item) => item.id === savedCustomer.id ? savedCustomer : item)
        : [savedCustomer, ...current])
      if (!existing) setPage(1)
      showToast(existing ? `${savedCustomer.name} updated` : `${savedCustomer.name} added`)
      setDialog((current) => current?.mode === 'details-edit'
        ? { mode: 'details', customer: savedCustomer }
        : null)
      return null
    } catch (error) {
      return error.message
    }
  }

  async function confirmDelete() {
    if (!dialog?.customer) return 'Select a customer to delete.'
    try {
      await customerRequest(`delete?id=${encodeURIComponent(dialog.customer.id)}`, 'DELETE')
      setCustomers((current) => current.filter((item) => item.id !== dialog.customer.id))
      setDialog(null)
      showToast(`${dialog.customer.name} deleted`)
      return null
    } catch (error) {
      return error.message
    }
  }

  function sortBy(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  function sortLabel(label, key) {
    const current = sort.key === key
    return <button className={adminTw("staff-customer-sort")} type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${label}${current ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>{label}<span aria-hidden="true">{current ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
  }

  async function logout() {
    if (!window.confirm('Are you sure you want to log out?')) return
    try {
      await logoutStaff()
      navigate('/staff/login', { replace: true })
    } catch (error) {
      window.alert(error.message)
    }
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    const routes = { Dashboard: '/staff/dashboard', Orders: '/staff/orders', Sales: '/staff/sales', Menu: '/staff/menu', Stocks: '/staff/stocks', Tables: '/staff/tables' }
    if (routes[name]) navigate(routes[name])
  }

  return (
    <div className={adminTw("admin-dashboard staff-customer-app")}>
      <Sidebar
        activeRoute="Customers"
        drawerOpen={drawerOpen}
        onNavigate={navigateSection}
        onClose={() => setDrawerOpen(false)}
        profileOpen={profileOpen}
        onOpenProfile={openProfile}
        onLogout={logout}
      />

      <main className={adminTw("admin-main staff-customer-main")}>
        <header className={adminTw("admin-topbar")}>
          <div className={adminTw("admin-title-group")}>
            <button type="button" className={adminTw("admin-hamburger")} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="customers" size={24} /><h1>Customers</h1>
          </div>
          <div className={adminTw("admin-top-actions")}>
            <StaffMessageInbox />
            <button type="button" className={adminTw("admin-avatar top-avatar admin-avatar-trigger")} aria-label="View staff profile for Crumblyx Staff" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>CS</button>
          </div>
        </header>

        <div className={adminTw("staff-customer-content")}>
          <section className={adminTw("staff-customer-search-banner")} aria-label="Search customers">
            <label className={adminTw("staff-customer-search")}>
              <DashboardIcon name="search" size={19} />
              <span className={adminTw("visually-hidden")}>Search customers by ID, name, email, or phone</span>
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search Customer..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setPage(1) }}><DashboardIcon name="close" size={15} /></button>}
            </label>
            <button type="button" className={adminTw("staff-customer-add-button")} onClick={(event) => openDialog('edit', { id: '', name: '', email: '', phone: '', location: '', status: 'active', joinedAt: new Date().toISOString() }, event)}><DashboardIcon name="plus" size={16} />Add Customer</button>
          </section>
          {loadError && <div className={adminTw("mx-4 mt-4 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-7 lg:mx-9")} role="alert"><span>Could not load customers: {loadError}</span><button type="button" className={adminTw("inline-flex shrink-0 items-center gap-2 font-semibold underline")} onClick={() => { setLoading(true); setLoadError(''); setRefreshKey((key) => key + 1) }} disabled={loading} aria-busy={loading}>{loading && <StaffSpinner className="size-3" />}Try again</button></div>}

          <section className={adminTw("staff-customer-dashboard-content")} aria-label="Customer overview">
            <div className={adminTw("staff-customer-summary-grid")} aria-live="polite">
              {CUSTOMER_FILTERS.map((card) => (
                <SummaryCard key={card.filter} {...card} value={counts[card.filter === 'all' ? 'total' : card.filter]} selected={filter === card.filter} onClick={() => { setFilter((current) => card.filter === 'all' || current === card.filter ? 'all' : card.filter); setPage(1) }} />
              ))}
            </div>

            <section className={adminTw("staff-customer-table-section")} aria-labelledby="staff-customer-table-title">
              <div className={adminTw("staff-customer-table-heading")}>
                <h2 id="staff-customer-table-title" tabIndex="-1">Customer Directory</h2>
                <span>{loading ? 'Loading…' : `${visibleCustomers.length} ${visibleCustomers.length === 1 ? 'customer' : 'customers'}`}</span>
              </div>
              <div className={adminTw("staff-customer-table-card flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white shadow-sm")}>
                <div className={adminTw("shrink-0 overflow-x-auto")}>
                <table className={adminTw("staff-customer-table w-full min-w-[900px] border-separate border-spacing-0 text-left")}>
                  <caption className={adminTw("visually-hidden")}>CrumblyX customer directory and account actions</caption>
                  <thead><tr>
                    <th scope="col">{sortLabel('ID', 'id')}</th>
                    <th scope="col">{sortLabel('NAME', 'name')}</th>
                    <th scope="col">{sortLabel('EMAIL', 'email')}</th>
                    {/* <th scope="col">{sortLabel('PHONE', 'phone')}</th> */}
                    <th scope="col">{sortLabel('STATUS', 'status')}</th>
                    <th scope="col"><span className={adminTw("staff-customer-actions-heading")}>ACTIONS</span></th>
                  </tr></thead>
                  <tbody>
                    {loading && Array.from({ length: 5 }, (_, index) => (
                      <tr key={`loading-${index}`} aria-hidden="true">
                        <td colSpan="5"><span className={adminTw("block h-10 animate-pulse rounded-lg bg-stone-100")} /></td>
                      </tr>
                    ))}
                    {!loading && pageCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        tabIndex={0}
                        aria-label={`View details for ${customer.name}`}
                        onClick={(event) => openDialog('details', customer, event)}
                        onKeyDown={(event) => {
                          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault()
                            openDialog('details', customer, event)
                          }
                        }}
                      >
                        <td data-label="ID">{customer.id}</td>
                        <th scope="row" data-label="Name">{customer.name}</th>
                        <td data-label="Email">{customer.email}</td>
                        {/* <td className={adminTw("staff-customer-phone")} data-label="Phone">{customer.phone}</td> */}
                        <td data-label="Status"><CustomerStatus status={customer.status} /></td>
                        <td data-label="Actions"><div className={adminTw("staff-customer-row-actions")}>
                          {/* <button type="button" aria-label={`Edit ${customer.name}`} title={`Edit ${customer.name}`} onClick={(event) => { event.stopPropagation(); openDialog('edit', customer, event) }}><DashboardIcon name="edit" size={16} /></button> */}
                          <button type="button" aria-label={`Delete ${customer.name}`} title={`Delete ${customer.name}`} onClick={(event) => { event.stopPropagation(); openDialog('delete-confirm', customer, event) }}><DashboardIcon name="trash" size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!loading && visibleCustomers.length === 0 && <tr className={adminTw("staff-customer-empty-row")}><td colSpan="6"><span><DashboardIcon name={loadError ? 'alertCircle' : 'search'} size={20} /></span><strong>{loadError ? 'Customer data unavailable' : customers.length ? 'No customers found' : 'No customers yet'}</strong><small>{loadError ? 'Retry the request above to load the customer directory.' : customers.length ? 'Try a different search or filter.' : 'Customer accounts will appear here when they register.'}</small></td></tr>}
                  </tbody>
                </table>
                </div>
                <footer className={adminTw("staff-customer-pagination mt-auto flex flex-col gap-3 border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between")}>
                  <span aria-live="polite">Showing {loading ? '—' : firstEntry}–{loading ? '—' : lastEntry} of {loading ? '—' : visibleCustomers.length} entries</span>
                  <nav className={adminTw("flex items-center justify-end gap-2")} aria-label="Customer table pages">
                    <button
                      type="button"
                      className={adminTw("rounded-lg border border-stone-200 px-3 py-2 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40")}
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={loading || currentPage <= 1}
                    >Previous</button>
                    <span className={adminTw("min-w-16 text-center font-medium text-stone-600")}>Page {loading ? '—' : currentPage} of {loading ? '—' : pageCount}</span>
                    <button
                      type="button"
                      className={adminTw("rounded-lg border border-stone-200 px-3 py-2 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40")}
                      onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                      disabled={loading || currentPage >= pageCount}
                    >Next</button>
                  </nav>
                </footer>
              </div>
            </section>
          </section>
        </div>
      </main>

      {dialog && <CustomerDialog key={`${dialog.mode}-${dialog.customer.id}`} customer={dialog.customer} mode={dialog.mode} onClose={closeDialog} onModeChange={(mode) => setDialog((current) => current ? { ...current, mode } : current)} onSave={handleSave} onConfirmDelete={confirmDelete} />}
      {toast && <div className={adminTw("staff-customer-toast")} role="status"><span>{toast.message}</span></div>}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}