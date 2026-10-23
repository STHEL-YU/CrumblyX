import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'

const FILTERS = [
  { status: 'new', label: 'New' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'completed', label: 'Completed' },
]

const STATUS_LABELS = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
}

async function orderRequest(action, method = 'GET', body, signal) {
  const response = await fetch(`/api/orders/${action}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Order request failed.')
  return data
}

function normalizeOrder(order) {
  const createdAt = new Date(order.createdAt)
  const elapsed = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000))
  const timeAgo = Number.isNaN(createdAt.getTime())
    ? ''
    : elapsed < 1 ? 'Just now' : elapsed < 60 ? `${elapsed} min ago` : `${Math.floor(elapsed / 60)} hr ago`
  return {
    ...order,
    total: Number(order.total),
    timeAgo,
    items: order.items.map((item) => ({ ...item, checked: Boolean(item.checked) })),
  }
}

function replaceOrder(orders, updatedOrder) {
  return orders.map((order) => order.id === updatedOrder.id ? updatedOrder : order)
}

function OrderCard({ order, onToggleItem, onAdvance, onViewDetails }) {
  const completedItems = order.items.filter((item) => item.checked).length
  const progress = Math.round(completedItems / order.items.length * 100)
  const actionLabel = {
    new: 'Accept orders',
    preparing: 'Complete orders',
    ready: 'Mark completed',
  }[order.status]

  return (
    <article className={adminTw("staff-order-row rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md")} key={`${order.id}-${order.status}`}>
      <div className={adminTw("staff-order-left")}>
        <div className={adminTw("staff-order-id-line")}>
          <h3>#{order.id}</h3>
          <span className={adminTw(`staff-order-pill order-status-${order.status}`)}>
            {order.status === 'preparing' && <i aria-hidden="true" />}
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <div className={adminTw("staff-order-meta")}>
          <span><DashboardIcon name={order.orderType === 'Take out' ? 'menu' : 'orders'} size={15} />{order.orderType}</span>
          <i aria-hidden="true" />
          <span>{order.timeAgo}</span>
          <i aria-hidden="true" />
          <strong>₱{order.total}</strong>
        </div>
        <div className={adminTw("staff-order-items-checklist")}>
          {order.items.map((item, index) => (
            <label className={adminTw(`staff-order-check ${item.checked ? 'checked' : ''}`)} key={item.id}>
              <input
                type="checkbox"
                checked={item.checked}
                disabled={order.status === 'ready' || order.status === 'completed'}
                onChange={() => onToggleItem(order.id, item.id)}
                aria-label={`${item.name}, item ${index + 1} of ${order.items.length}`}
              />
              <span className={adminTw("staff-order-checkbox")} aria-hidden="true"><DashboardIcon name="check" size={13} /></span>
              <span>{item.quantity > 1 ? `${item.quantity} × ` : ''}{item.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={adminTw("staff-order-right")}>
        <div className={adminTw("staff-order-progress-copy")}>
          <span>{completedItems} of {order.items.length} items completed</span>
          <span>{progress}%</span>
        </div>
        <div
          className={adminTw("staff-order-progress")}
          role="progressbar"
          aria-label={`${order.id} preparation progress`}
          aria-valuemin={0}
          aria-valuemax={order.items.length}
          aria-valuenow={completedItems}
          aria-valuetext={`${completedItems} of ${order.items.length} items completed`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className={adminTw("staff-order-actions")}>
          <button className={adminTw("staff-order-details")} type="button" onClick={() => onViewDetails(order)}>View order details</button>
          {actionLabel && (
            <button
              className={adminTw("staff-order-primary")}
              type="button"
              disabled={order.status === 'preparing' && completedItems !== order.items.length}
              onClick={() => onAdvance(order)}
            >
              {actionLabel}<DashboardIcon name="arrow" size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function OrderDetailsDialog({ order, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector('button')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll('button:not(:disabled)')]
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
  }, [onClose])

  return (
    <div className={adminTw("staff-order-modal-backdrop")} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className={adminTw("staff-order-modal max-h-[90dvh] overflow-y-auto rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl")} role="dialog" aria-modal="true" aria-labelledby="staff-order-dialog-title">
        <header>
          <div><span>ORDER DETAILS</span><h2 id="staff-order-dialog-title">#{order.id}</h2></div>
          <button type="button" aria-label="Close order details" onClick={onClose}><DashboardIcon name="close" /></button>
        </header>
        <div className={adminTw("staff-order-modal-meta")}>
          <span className={adminTw(`staff-order-pill order-status-${order.status}`)}>{STATUS_LABELS[order.status]}</span>
          <span>{order.orderType}</span><span>{order.timeAgo}</span>
        </div>
        <h3>Items</h3>
        <ul className={adminTw("staff-order-modal-items")}>
          {order.items.map((item) => (
            <li key={item.id}><span>{item.quantity} × {item.name}</span><span>{item.checked ? 'Prepared' : 'Pending'}</span></li>
          ))}
        </ul>
        <div className={adminTw("staff-order-modal-note")}><strong>Order notes</strong><p>{order.notes || 'No special instructions.'}</p></div>
        <div className={adminTw("staff-order-modal-total")}><span>Total</span><strong>₱{order.total.toFixed(2)}</strong></div>
        <button className={adminTw("staff-order-modal-close")} type="button" onClick={onClose}>Close details</button>
      </section>
    </div>
  )
}

export default function StaffOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [section, setSection] = useState('Orders')
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    orderRequest('list', 'GET', undefined, controller.signal)
      .then((data) => {
        if (!Array.isArray(data.orders)) throw new Error('Invalid orders response.')
        if (!controller.signal.aborted) setOrders(data.orders.map(normalizeOrder))
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  const counts = FILTERS.reduce((result, item) => {
    result[item.status] = orders.filter((order) => order.status === item.status).length
    return result
  }, {})

  const visibleOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter)

  async function toggleItem(orderId, itemId) {
    const order = orders.find((item) => item.id === orderId)
    const item = order?.items.find((entry) => entry.id === itemId)
    if (!order || !item) return
    try {
      const updatedOrder = normalizeOrder(await orderRequest('update', 'PUT', {
        id: orderId,
        itemId,
        checked: !item.checked,
      }))
      setOrders((current) => replaceOrder(current, updatedOrder))
      setSelectedOrder((current) => current?.id === updatedOrder.id ? updatedOrder : current)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function advanceOrder(order) {
    const nextStatus = { new: 'preparing', preparing: 'ready', ready: 'completed' }[order.status]
    if (!nextStatus) return
    if (order.status === 'preparing' && order.items.some((item) => !item.checked)) return
    try {
      const updatedOrder = normalizeOrder(await orderRequest('update', 'PUT', { id: order.id, status: nextStatus }))
      setOrders((current) => replaceOrder(current, updatedOrder))
      setSelectedOrder((current) => current?.id === updatedOrder.id ? updatedOrder : current)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function refreshOrders() {
    setLoading(true)
    setError('')
    setRefreshKey((current) => current + 1)
  }

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  function navigateSection(name) {
    setDrawerOpen(false)
    if (name === 'Dashboard') {
      navigate('/staff/dashboard')
      return
    }
    if (name === 'Menu') {
      navigate('/staff/menu')
      return
    }
    if (name === 'Stocks') {
      navigate('/staff/stocks')
      return
    }
    if (name === 'Customers') {
      navigate('/staff/customers')
      return
    }
    if (name === 'Orders') {
      setSection('Orders')
      return
    }
    setSection(name)
  }

  return (
    <div className={adminTw("admin-dashboard staff-orders-app")}>
      <button className={adminTw(`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`)} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={adminTw(`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`)} aria-label="Staff navigation">
        <div className={adminTw("admin-brand")}>
          <Logo small /><span>CrumblyX</span>
          <button type="button" className={adminTw("admin-drawer-close")} aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button>
        </div>
        <div className={adminTw("admin-side-divider")} />
        <nav className={adminTw("admin-nav")} aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.name}
              className={adminTw(`admin-nav-item ${section === item.name ? 'active' : ''}`)}
              aria-current={section === item.name ? 'page' : undefined}
              onClick={() => navigateSection(item.name)}
            >
              <DashboardIcon name={item.icon} /><span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className={adminTw("admin-account")}>
          <div className={adminTw("admin-side-divider")} />
          <div className={adminTw("admin-user")}>
            <button type="button" className={adminTw("admin-avatar admin-avatar-trigger")} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
            <span className={adminTw("admin-user-copy")}><strong>John Doe</strong><small>doe@example.com</small></span>
            <button type="button" className={adminTw("admin-logout")} aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>

      <main className={adminTw("admin-main staff-orders-main")}>
        <header className={adminTw("admin-topbar")}>
          <div className={adminTw("admin-title-group")}>
            <button type="button" className={adminTw("admin-hamburger")} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="orders" size={23} />
            <h1>{section}</h1>
          </div>
          <div className={adminTw("admin-top-actions")}>
            <div className={adminTw("admin-chat-wrap")}>
              <button type="button" className={adminTw("admin-chat-button")} aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}>
                <DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b>
              </button>
              {chatOpen && <div className={adminTw("admin-chat-popover")} role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className={adminTw("staff-orders-chat-note")}>2 unread customer messages</p></div>}
            </div>
            <button type="button" className={adminTw("admin-avatar top-avatar admin-avatar-trigger")} aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        {section === 'Orders' ? (
          <div className={adminTw("staff-orders-content")}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-600" aria-live="polite">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
              </p>
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                onClick={refreshOrders}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p>}
            <section className={adminTw("staff-order-summary")} aria-label="Order status summary" aria-live="polite">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  className={adminTw(`staff-order-stat ${filter === item.status ? 'selected' : ''}`)}
                  key={item.status}
                  aria-pressed={filter === item.status}
                  onClick={() => setFilter((current) => current === item.status ? 'all' : item.status)}
                >
                  <strong>{counts[item.status]}</strong><span>{item.label}</span>
                </button>
              ))}
            </section>

            <section className={adminTw("staff-order-list-section")} aria-labelledby="staff-order-list-title">
              <div className={adminTw("staff-order-section-heading")}>
                <div>
                  <h2 id="staff-order-list-title">{filter === 'all' || filter === 'new' ? 'New Orders' : `${STATUS_LABELS[filter]} Orders`}</h2>
                  <p><DashboardIcon name="orders" size={16} />Check each item as it is prepared. Complete the order when everything is ready.</p>
                </div>
                {filter !== 'all' && <button type="button" className={adminTw("staff-order-clear-filter")} onClick={() => setFilter('all')}>Show all</button>}
              </div>

              {loading && orders.length === 0 ? (
                <div className={adminTw("staff-order-empty")} role="status"><h3>Loading orders…</h3></div>
              ) : visibleOrders.length === 0 ? (
                <div className={adminTw("staff-order-empty")}><DashboardIcon name="orders" size={27} /><h3>No {filter === 'all' ? '' : STATUS_LABELS[filter].toLowerCase()} orders</h3><p>Orders in this status will show here.</p></div>
              ) : (
                <div className={adminTw("staff-order-list")}>
                  {visibleOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onToggleItem={toggleItem} onAdvance={advanceOrder} onViewDetails={setSelectedOrder} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className={adminTw("staff-orders-content")}><section className={adminTw("staff-order-empty")}><h2>{section}</h2><p>This section is not available in the orders preview.</p></section></div>
        )}
      </main>
      {selectedOrder && <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}