import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'

const INITIAL_CUSTOMERS = [
  'Maria Santos', 'Juan Dela Cruz', 'Jayson Mancol', 'Luis Garcia',
  'Sofia Cruz', 'Daniel Ramos', 'Ella Navarro', 'Rafael Torres',
  'Isabella Reyes', 'Miguel Bautista', 'Camila Flores', 'Gabriel Mendoza',
  'Ava Castillo', 'Ethan Villanueva', 'Mia Aquino', 'Noah Fernandez',
  'Chloe Rivera', 'Liam Torres', 'Amara Lim', 'Lucas Santiago',
  'Zoe Mercado', 'Elijah Valdez', 'Nina Gonzales', 'Caleb Ortiz',
  'Leah Dizon', 'Nathan Soriano', 'Ivy Domingo', 'Adrian Cabrera',
  'Maya Delos Reyes', 'Joshua Padilla', 'Aria Manalo', 'Theo Velasco',
  'Luna Pineda', 'Marco Aguilar', 'Grace Natividad', 'Enzo de Leon',
  'Jade Villarin', 'Paolo Romero', 'Mika Salazar', 'Dylan Gutierrez',
  'Talia Ramos', 'Andre Francisco', 'Hope Macapagal', 'Rico Estrella',
  'Faith Ocampo', 'Sean Javier', 'Bea Alonzo', 'Vincent Co',
].map((name, index) => {
  const joinedAt = new Date()
  joinedAt.setDate(joinedAt.getDate() - (index < 10 ? index + 1 : 31 + (index % 250)))
  const inactiveIndexes = [2, 10, 18, 26, 34, 42]
  const emailName = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')

  return {
    id: `C${String(index + 1).padStart(3, '0')}`,
    name,
    email: `${emailName}@example.com`,
    phone: index === 0 ? '09123456789' : `09${String(10 + (index % 10)).padStart(2, '0')} ${String(234 + index).padStart(3, '0')} ${String(1000 + index)}`,
    location: index === 0 ? 'Catbalogan City' : index % 2 === 0 ? 'Catbalogan City' : 'Tacloban City',
    status: inactiveIndexes.includes(index) ? 'inactive' : 'active',
    joinedAt: joinedAt.toISOString(),
    recentOrders: [
      { id: `ORD-${String(120 + index).padStart(3, '0')}`, summary: 'Matcha Cookies, Iced Americano', total: '₱230', date: 'Oct 18, 2026' },
      { id: `ORD-${String(92 + index).padStart(3, '0')}`, summary: 'Butter Croissant', total: '₱85', date: 'Oct 12, 2026' },
    ],
  }
})

const CUSTOMER_FILTERS = [
  { filter: 'all', label: 'Total Customers', icon: 'customers', tone: 'coffee' },
  { filter: 'new', label: 'New Customers', icon: 'userPlus', tone: 'green' },
  { filter: 'active', label: 'Active Customers', icon: 'star', tone: 'amber' },
  { filter: 'inactive', label: 'Inactive Customers', icon: 'userSlash', tone: 'red' },
]

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
  const [isClosing, setIsClosing] = useState(false)
  const dialogRef = useRef(null)
  const closeTimer = useRef(null)
  const isEditing = mode === 'edit' || mode === 'details-edit'
  const isDetailsEdit = mode === 'details-edit'
  const isDetails = mode === 'details'
  const isDeleting = mode === 'delete-confirm' || mode === 'details-delete-confirm'

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const closeDialog = useCallback(() => {
    if (isClosing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimer.current = window.setTimeout(onClose, 180)
  }, [isClosing, onClose])

  const confirmDelete = useCallback(() => {
    if (isClosing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onConfirmDelete()
      return
    }
    setIsClosing(true)
    closeTimer.current = window.setTimeout(onConfirmDelete, 180)
  }, [isClosing, onConfirmDelete])

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

  function submit(event) {
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
    const saveError = onSave({ ...customer, name: normalizedName, email: normalizedEmail, phone: normalizedPhone, location: location.trim(), status })
    if (saveError) setError(saveError)
  }

  return (
    <div className={adminTw(`staff-customer-modal-backdrop ${isClosing ? 'is-closing' : ''}`)} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
      <section ref={dialogRef} className={adminTw(`staff-customer-modal max-h-[90dvh] overflow-y-auto rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl ${mode.startsWith('details') ? 'customer-details-modal' : ''} ${isClosing ? 'is-closing' : ''}`)} role="dialog" aria-modal="true" aria-labelledby="staff-customer-dialog-title">
        <header>
          <h2 id="staff-customer-dialog-title">{isDetails ? 'Customer Details' : isDeleting ? 'Delete customer?' : isEditing ? customer?.id ? 'Update Details' : 'Add customer' : 'Edit customer'}</h2>
          <button type="button" className={adminTw("staff-customer-modal-close")} aria-label="Close customer details" onClick={closeDialog}><DashboardIcon name="close" /></button>
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
              <div><dt>Contact No.</dt><dd>{customer.phone}</dd></div>
              <div><dt>Location</dt><dd>{customer.location || 'Not provided'}</dd></div>
            </dl>
            <div className={adminTw("staff-customer-detail-actions")}>
              <button className={adminTw("staff-customer-update-button")} type="button" onClick={() => onModeChange('details-edit')}><DashboardIcon name="edit" size={16} />Update Details</button>
              <button className={adminTw("staff-customer-delete-button")} type="button" onClick={() => onModeChange('delete-confirm')}><DashboardIcon name="trash" size={16} />Delete Customer</button>
            </div>
          </div>
        )}

        {isEditing && (
          <form onSubmit={submit}>
            <label>Full name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></label>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} /></label>
            <label>Phone number<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={15} placeholder="0917 123 4567" /></label>
            <label>Location<input autoComplete="address-level2" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} placeholder="City or municipality" /></label>
            <label className={adminTw("staff-customer-switch-label")}>Customer status
              <span className={adminTw("staff-customer-switch-copy")}><span>{status === 'active' ? 'Active' : 'Inactive'}</span><input type="checkbox" role="switch" checked={status === 'active'} onChange={(event) => setStatus(event.target.checked ? 'active' : 'inactive')} /><i aria-hidden="true" /></span>
            </label>
            {error && <p className={adminTw("staff-customer-form-error")} role="alert">{error}</p>}
            <div className={adminTw("staff-customer-form-actions")}>
              <button className={adminTw("staff-customer-secondary")} type="button" onClick={() => isDetailsEdit ? onModeChange('details') : closeDialog()}>Cancel</button>
              <button className={adminTw("staff-customer-primary")} type="submit">{customer.id ? 'Save changes' : 'Add customer'}</button>
            </div>
          </form>
        )}

        {isDeleting && (
          <div className={adminTw("staff-customer-delete-confirm")}>
            <p>Delete <strong>{customer.name}</strong>? This can’t be undone.</p>
            <div><button className={adminTw("staff-customer-secondary")} type="button" onClick={() => mode === 'details-delete-confirm' ? onModeChange('details') : closeDialog()}>Cancel</button><button className={adminTw("staff-customer-danger")} type="button" onClick={confirmDelete}>Delete customer</button></div>
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
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'id', direction: 'asc' })
  const [dialog, setDialog] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const deletedCustomer = useRef(null)
  const dialogTrigger = useRef(null)
  const nextCustomerId = useRef(INITIAL_CUSTOMERS.length + 1)
  const navigate = useNavigate()
  const closeDialog = useCallback(() => setDialog(null), [])

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
      .filter((customer) => !normalizedQuery || `${customer.id} ${customer.name} ${customer.email} ${customer.phone}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        const comparison = String(first[sort.key]).localeCompare(String(second[sort.key]), undefined, { numeric: true, sensitivity: 'base' })
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [customers, filter, query, sort])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => {
    if (!dialog) {
      if (dialogTrigger.current?.isConnected) dialogTrigger.current.focus()
      else document.getElementById('staff-customer-table-title')?.focus()
    }
  }, [dialog])

  function showToast(message, deleted = null) {
    window.clearTimeout(toastTimer.current)
    deletedCustomer.current = deleted
    setToast({ message, canUndo: Boolean(deleted) })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      deletedCustomer.current = null
    }, 4500)
  }

  function openDialog(mode, customer, event) {
    dialogTrigger.current = event.currentTarget
    setDialog({ mode, customer })
  }

  function handleSave(customer) {
    const duplicateEmail = customers.find((item) => item.email === customer.email && item.id !== customer.id)
    if (duplicateEmail) {
      return 'That email address is already assigned to another customer.'
    }
    const existing = customers.some((item) => item.id === customer.id)
    const savedCustomer = existing
      ? customer
      : { ...customer, id: `C${String(nextCustomerId.current++).padStart(3, '0')}`, joinedAt: new Date().toISOString(), recentOrders: [] }
    setCustomers((current) => existing
      ? current.map((item) => item.id === customer.id ? savedCustomer : item)
      : [...current, savedCustomer])
    showToast(existing ? `${customer.name} updated` : `${customer.name} added`)
    setDialog((current) => current?.mode === 'details-edit'
      ? { mode: 'details', customer: savedCustomer }
      : null)
    return null
  }

  function confirmDelete() {
    const index = customers.findIndex((item) => item.id === dialog.customer.id)
    const removed = { customer: dialog.customer, index }
    setCustomers((current) => current.filter((item) => item.id !== dialog.customer.id))
    setDialog(null)
    showToast(`${dialog.customer.name} deleted`, removed)
  }

  function undoDelete() {
    const removed = deletedCustomer.current
    if (!removed) return
    setCustomers((current) => {
      if (current.some((item) => item.id === removed.customer.id)) return current
      const restored = [...current]
      restored.splice(Math.min(removed.index, restored.length), 0, removed.customer)
      return restored
    })
    window.clearTimeout(toastTimer.current)
    deletedCustomer.current = null
    setToast({ message: `${removed.customer.name} restored`, canUndo: false })
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  function sortBy(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  }

  function sortLabel(label, key) {
    const current = sort.key === key
    return <button className={adminTw("staff-customer-sort")} type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${label}${current ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>{label}<span aria-hidden="true">{current ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    const routes = { Dashboard: '/staff/dashboard', Orders: '/staff/orders', Menu: '/staff/menu', Stocks: '/staff/stocks' }
    if (routes[name]) navigate(routes[name])
  }

  return (
    <div className={adminTw("admin-dashboard staff-customer-app")}>
      <button className={adminTw(`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`)} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={adminTw(`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`)} aria-label="Staff navigation">
        <div className={adminTw("admin-brand")}><Logo small /><span>CrumblyX</span><button type="button" className={adminTw("admin-drawer-close")} aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button></div>
        <div className={adminTw("admin-side-divider")} />
        <nav className={adminTw("admin-nav")} aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button type="button" key={item.name} className={adminTw(`admin-nav-item ${item.name === 'Customers' ? 'active' : ''}`)} aria-current={item.name === 'Customers' ? 'page' : undefined} onClick={() => navigateSection(item.name)}>
              <DashboardIcon name={item.icon} /><span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className={adminTw("admin-account")}><div className={adminTw("admin-side-divider")} /><div className={adminTw("admin-user")}><button type="button" className={adminTw("admin-avatar admin-avatar-trigger")} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button><span className={adminTw("admin-user-copy")}><strong>John Doe</strong><small>doe@example.com</small></span><button type="button" className={adminTw("admin-logout")} aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button></div></div>
      </aside>

      <main className={adminTw("admin-main staff-customer-main")}>
        <header className={adminTw("admin-topbar")}>
          <div className={adminTw("admin-title-group")}>
            <button type="button" className={adminTw("admin-hamburger")} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="customers" size={24} /><h1>Customers</h1>
          </div>
          <div className={adminTw("admin-top-actions")}>
            <div className={adminTw("admin-chat-wrap")}>
              <button type="button" className={adminTw("admin-chat-button")} aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}><DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b></button>
              {chatOpen && <div className={adminTw("admin-chat-popover")} role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className={adminTw("staff-customer-chat-note")}>2 unread customer messages</p></div>}
            </div>
            <button type="button" className={adminTw("admin-avatar top-avatar admin-avatar-trigger")} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className={adminTw("staff-customer-content")}>
          <section className={adminTw("staff-customer-search-banner")} aria-label="Search customers">
            <label className={adminTw("staff-customer-search")}>
              <DashboardIcon name="search" size={19} />
              <span className={adminTw("visually-hidden")}>Search customers by ID, name, email, or phone</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Customer..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><DashboardIcon name="close" size={15} /></button>}
            </label>
            <button type="button" className={adminTw("staff-customer-add-button")} onClick={(event) => openDialog('edit', { id: '', name: '', email: '', phone: '', location: '', status: 'active', joinedAt: new Date().toISOString(), recentOrders: [] }, event)}><DashboardIcon name="plus" size={16} />Add Customer</button>
          </section>

          <section className={adminTw("staff-customer-dashboard-content")} aria-label="Customer overview">
            <div className={adminTw("staff-customer-summary-grid")} aria-live="polite">
              {CUSTOMER_FILTERS.map((card) => (
                <SummaryCard key={card.filter} {...card} value={counts[card.filter === 'all' ? 'total' : card.filter]} selected={filter === card.filter} onClick={() => setFilter((current) => card.filter === 'all' || current === card.filter ? 'all' : card.filter)} />
              ))}
            </div>

            <section className={adminTw("staff-customer-table-section")} aria-labelledby="staff-customer-table-title">
              <div className={adminTw("staff-customer-table-heading")}>
                <h2 id="staff-customer-table-title" tabIndex="-1">Customer Directory</h2>
                <span>{visibleCustomers.length} {visibleCustomers.length === 1 ? 'customer' : 'customers'}</span>
              </div>
              <div className={adminTw("staff-customer-table-wrap overflow-x-auto rounded-2xl border border-amber-100 bg-white shadow-sm")}>
                <table className={adminTw("staff-customer-table")}>
                  <caption className={adminTw("visually-hidden")}>CrumblyX customer directory and account actions</caption>
                  <thead><tr>
                    <th scope="col">{sortLabel('ID', 'id')}</th>
                    <th scope="col">{sortLabel('NAME', 'name')}</th>
                    <th scope="col">{sortLabel('EMAIL', 'email')}</th>
                    <th scope="col">{sortLabel('PHONE', 'phone')}</th>
                    <th scope="col">{sortLabel('STATUS', 'status')}</th>
                    <th scope="col"><span className={adminTw("staff-customer-actions-heading")}>ACTIONS</span></th>
                  </tr></thead>
                  <tbody>
                    {visibleCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td data-label="ID">{customer.id}</td>
                        <th scope="row" data-label="Name">{customer.name}</th>
                        <td data-label="Email">{customer.email}</td>
                        <td className={adminTw("staff-customer-phone")} data-label="Phone">{customer.phone}</td>
                        <td data-label="Status"><CustomerStatus status={customer.status} /></td>
                        <td data-label="Actions"><div className={adminTw("staff-customer-row-actions")}>
                          <button type="button" aria-label={`View ${customer.name}`} title={`View ${customer.name}`} onClick={(event) => openDialog('details', customer, event)}><DashboardIcon name="eye" size={15} /></button>
                          <button type="button" aria-label={`Edit ${customer.name}`} title={`Edit ${customer.name}`} onClick={(event) => openDialog('edit', customer, event)}><DashboardIcon name="edit" size={15} /></button>
                          <button type="button" aria-label={`Delete ${customer.name}`} title={`Delete ${customer.name}`} onClick={(event) => openDialog('delete-confirm', customer, event)}><DashboardIcon name="trash" size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {visibleCustomers.length === 0 && <tr className={adminTw("staff-customer-empty-row")}><td colSpan="6"><span><DashboardIcon name="search" size={20} /></span><strong>No customers found</strong><small>Try a different search or filter.</small></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </main>

      {dialog && <CustomerDialog key={`${dialog.mode}-${dialog.customer.id}`} customer={dialog.customer} mode={dialog.mode} onClose={closeDialog} onModeChange={(mode) => setDialog((current) => current ? { ...current, mode } : current)} onSave={handleSave} onConfirmDelete={confirmDelete} />}
      {toast && <div className={adminTw("staff-customer-toast")} role="status"><span>{toast.message}</span>{toast.canUndo && <button type="button" onClick={undoDelete}>Undo</button>}</div>}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}