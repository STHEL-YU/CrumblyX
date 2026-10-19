import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'
import './staff_dashboard.css'
import './staff_order.css'

const INITIAL_ORDERS = [
  {
    id: 'ORD-001',
    orderType: 'Table 3',
    timeAgo: '20 min ago',
    total: 350,
    status: 'new',
    notes: 'Please bring to the table when ready.',
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `ord-001-item-${index + 1}`,
      name: 'Matcha Cookies',
      quantity: 1,
      checked: false,
    })),
  },
  {
    id: 'ORD-002',
    orderType: 'Take out',
    timeAgo: '20 min ago',
    total: 50,
    status: 'preparing',
    notes: 'Customer will collect at the counter.',
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `ord-002-item-${index + 1}`,
      name: 'Matcha Cookies',
      quantity: 1,
      checked: index < 2,
    })),
  },
  {
    id: 'ORD-003',
    orderType: 'Table 7',
    timeAgo: '12 min ago',
    total: 250,
    status: 'preparing',
    notes: 'One item is for a guest with a nut allergy.',
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `ord-003-item-${index + 1}`,
      name: 'Matcha Cookies',
      quantity: 1,
      checked: index < 3,
    })),
  },
  {
    id: 'ORD-004',
    orderType: 'Take out',
    timeAgo: '5 min ago',
    total: 150,
    status: 'ready',
    notes: 'Pickup at the front counter.',
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `ord-004-item-${index + 1}`,
      name: 'Matcha Cookies',
      quantity: 1,
      checked: true,
    })),
  },
]

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

function OrderCard({ order, onToggleItem, onAdvance, onViewDetails }) {
  const completedItems = order.items.filter((item) => item.checked).length
  const progress = Math.round(completedItems / order.items.length * 100)
  const actionLabel = {
    new: 'Accept orders',
    preparing: 'Complete orders',
    ready: 'Mark completed',
  }[order.status]

  return (
    <article className="staff-order-row" key={`${order.id}-${order.status}`}>
      <div className="staff-order-left">
        <div className="staff-order-id-line">
          <h3>#{order.id}</h3>
          <span className={`staff-order-pill order-status-${order.status}`}>
            {order.status === 'preparing' && <i aria-hidden="true" />}
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <div className="staff-order-meta">
          <span><DashboardIcon name={order.orderType === 'Take out' ? 'menu' : 'orders'} size={15} />{order.orderType}</span>
          <i aria-hidden="true" />
          <span>{order.timeAgo}</span>
          <i aria-hidden="true" />
          <strong>₱{order.total}</strong>
        </div>
        <div className="staff-order-items-checklist">
          {order.items.map((item, index) => (
            <label className={`staff-order-check ${item.checked ? 'checked' : ''}`} key={item.id}>
              <input
                type="checkbox"
                checked={item.checked}
                disabled={order.status === 'ready' || order.status === 'completed'}
                onChange={() => onToggleItem(order.id, item.id)}
                aria-label={`${item.name}, item ${index + 1} of ${order.items.length}`}
              />
              <span className="staff-order-checkbox" aria-hidden="true"><DashboardIcon name="check" size={13} /></span>
              <span>{item.quantity > 1 ? `${item.quantity} × ` : ''}{item.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="staff-order-right">
        <div className="staff-order-progress-copy">
          <span>{completedItems} of {order.items.length} items completed</span>
          <span>{progress}%</span>
        </div>
        <div
          className="staff-order-progress"
          role="progressbar"
          aria-label={`${order.id} preparation progress`}
          aria-valuemin={0}
          aria-valuemax={order.items.length}
          aria-valuenow={completedItems}
          aria-valuetext={`${completedItems} of ${order.items.length} items completed`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="staff-order-actions">
          <button className="staff-order-details" type="button" onClick={() => onViewDetails(order)}>View order details</button>
          {actionLabel && (
            <button
              className="staff-order-primary"
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
    <div className="staff-order-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="staff-order-modal" role="dialog" aria-modal="true" aria-labelledby="staff-order-dialog-title">
        <header>
          <div><span>ORDER DETAILS</span><h2 id="staff-order-dialog-title">#{order.id}</h2></div>
          <button type="button" aria-label="Close order details" onClick={onClose}><DashboardIcon name="close" /></button>
        </header>
        <div className="staff-order-modal-meta">
          <span className={`staff-order-pill order-status-${order.status}`}>{STATUS_LABELS[order.status]}</span>
          <span>{order.orderType}</span><span>{order.timeAgo}</span>
        </div>
        <h3>Items</h3>
        <ul className="staff-order-modal-items">
          {order.items.map((item) => (
            <li key={item.id}><span>{item.quantity} × {item.name}</span><span>{item.checked ? 'Prepared' : 'Pending'}</span></li>
          ))}
        </ul>
        <div className="staff-order-modal-note"><strong>Order notes</strong><p>{order.notes || 'No special instructions.'}</p></div>
        <div className="staff-order-modal-total"><span>Total</span><strong>₱{order.total.toFixed(2)}</strong></div>
        <button className="staff-order-modal-close" type="button" onClick={onClose}>Close details</button>
      </section>
    </div>
  )
}

export default function StaffOrders() {
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [section, setSection] = useState('Orders')
  const navigate = useNavigate()

  const counts = FILTERS.reduce((result, item) => {
    result[item.status] = orders.filter((order) => order.status === item.status).length
    return result
  }, {})

  const visibleOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter)

  function toggleItem(orderId, itemId) {
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, items: order.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) }
      : order))
  }

  function advanceOrder(order) {
    const nextStatus = { new: 'preparing', preparing: 'ready', ready: 'completed' }[order.status]
    if (!nextStatus) return
    if (order.status === 'preparing' && order.items.some((item) => !item.checked)) return
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item))
    setSelectedOrder((current) => current?.id === order.id ? { ...current, status: nextStatus } : current)
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
    <div className="admin-dashboard staff-orders-app">
      <button className={`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Staff navigation">
        <div className="admin-brand">
          <Logo small /><span>CrumblyX</span>
          <button type="button" className="admin-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button>
        </div>
        <div className="admin-side-divider" />
        <nav className="admin-nav" aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`admin-nav-item ${section === item.name ? 'active' : ''}`}
              aria-current={section === item.name ? 'page' : undefined}
              onClick={() => navigateSection(item.name)}
            >
              <DashboardIcon name={item.icon} /><span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <div className="admin-side-divider" />
          <div className="admin-user">
            <button type="button" className="admin-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
            <span className="admin-user-copy"><strong>John Doe</strong><small>doe@example.com</small></span>
            <button type="button" className="admin-logout" aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="admin-main staff-orders-main">
        <header className="admin-topbar">
          <div className="admin-title-group">
            <button type="button" className="admin-hamburger" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="orders" size={23} />
            <h1>{section}</h1>
          </div>
          <div className="admin-top-actions">
            <div className="admin-chat-wrap">
              <button type="button" className="admin-chat-button" aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}>
                <DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b>
              </button>
              {chatOpen && <div className="admin-chat-popover" role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className="staff-orders-chat-note">2 unread customer messages</p></div>}
            </div>
            <button type="button" className="admin-avatar top-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        {section === 'Orders' ? (
          <div className="staff-orders-content">
            <section className="staff-order-summary" aria-label="Order status summary" aria-live="polite">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  className={`staff-order-stat ${filter === item.status ? 'selected' : ''}`}
                  key={item.status}
                  aria-pressed={filter === item.status}
                  onClick={() => setFilter((current) => current === item.status ? 'all' : item.status)}
                >
                  <strong>{counts[item.status]}</strong><span>{item.label}</span>
                </button>
              ))}
            </section>

            <section className="staff-order-list-section" aria-labelledby="staff-order-list-title">
              <div className="staff-order-section-heading">
                <div>
                  <h2 id="staff-order-list-title">{filter === 'all' || filter === 'new' ? 'New Orders' : `${STATUS_LABELS[filter]} Orders`}</h2>
                  <p><DashboardIcon name="orders" size={16} />Check each item as it is prepared. Complete the order when everything is ready.</p>
                </div>
                {filter !== 'all' && <button type="button" className="staff-order-clear-filter" onClick={() => setFilter('all')}>Show all</button>}
              </div>

              {visibleOrders.length === 0 ? (
                <div className="staff-order-empty"><DashboardIcon name="orders" size={27} /><h3>No {filter === 'all' ? '' : STATUS_LABELS[filter].toLowerCase()} orders</h3><p>Orders in this status will show here.</p></div>
              ) : (
                <div className="staff-order-list">
                  {visibleOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onToggleItem={toggleItem} onAdvance={advanceOrder} onViewDetails={setSelectedOrder} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="staff-orders-content"><section className="staff-order-empty"><h2>{section}</h2><p>This section is not available in the orders preview.</p></section></div>
        )}
      </main>
      {selectedOrder && <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}