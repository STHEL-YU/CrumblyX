import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'
import './staff_dashboard.css'
import './staff_stock.css'

const LOW_STOCK_THRESHOLD = 5

const INITIAL_STOCKS = [
  { id: 'butter-croissant', name: 'Butter Croissant', category: 'Pastry', quantity: 8 },
  { id: 'pain-au-chocolat', name: 'Pain au Chocolat', category: 'Pastry', quantity: 8 },
  { id: 'matcha-cookies', name: 'Matcha Cookies', category: 'Pastry', quantity: 3 },
  { id: 'chocolate-cookies', name: 'Chocolate Cookies', category: 'Pastry', quantity: 15 },
  { id: 'blueberry-muffin', name: 'Blueberry Muffin', category: 'Pastry', quantity: 4 },
  { id: 'cinnamon-roll', name: 'Cinnamon Roll', category: 'Pastry', quantity: 12 },
  { id: 'strawberry-milk-tea', name: 'Strawberry Milk Tea', category: 'Beverages', quantity: null },
  { id: 'brown-sugar-latte', name: 'Brown Sugar Latte', category: 'Beverages', quantity: null },
  { id: 'caramel-latte-macchiato', name: 'Caramel Latte Macchiato', category: 'Beverages', quantity: null },
  { id: 'matcha-latte', name: 'Matcha Latte', category: 'Beverages', quantity: null },
  { id: 'iced-americano', name: 'Iced Americano', category: 'Beverages', quantity: null },
  { id: 'hot-chocolate', name: 'Hot Chocolate', category: 'Beverages', quantity: null },
]

function getStockStatus(quantity) {
  if (quantity === null) return 'in-stock'
  if (quantity === 0) return 'out-of-stock'
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low-stock'
  return 'in-stock'
}

const STOCK_STATUS = {
  'in-stock': { label: 'In Stock', icon: 'checkCircle' },
  'low-stock': { label: 'Low Stock', icon: 'warning' },
  'out-of-stock': { label: 'Out of Stock', icon: 'alertCircle' },
}

function StockEditor({ stock, onClose, onSave }) {
  const [name, setName] = useState(stock?.name || '')
  const [category, setCategory] = useState(stock?.category || 'Pastry')
  const [quantity, setQuantity] = useState(stock?.quantity == null ? '' : String(stock.quantity))
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const isEditing = Boolean(stock)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector('input')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
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
  }, [onClose])

  function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const normalizedQuantity = quantity === '' ? null : Number(quantity)
    if (!trimmedName) {
      setError('Enter an item name.')
      return
    }
    if (normalizedQuantity !== null && (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 0 || normalizedQuantity > 1000000)) {
      setError('Enter a whole stock quantity from 0 to 1,000,000, or leave it blank for untracked stock.')
      return
    }
    onSave({
      id: stock?.id || `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: trimmedName,
      category,
      quantity: normalizedQuantity,
    })
    onClose()
  }

  return (
    <div className="staff-stock-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="staff-stock-modal" role="dialog" aria-modal="true" aria-labelledby="staff-stock-modal-title">
        <header>
          <div><span>INVENTORY MANAGEMENT</span><h2 id="staff-stock-modal-title">{isEditing ? 'Edit stock item' : 'Add stock item'}</h2></div>
          <button type="button" aria-label="Close stock form" onClick={onClose}><DashboardIcon name="close" /></button>
        </header>
        <form onSubmit={submit}>
          <label>Item name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Blueberry Muffin" maxLength={100} /></label>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Pastry</option><option>Beverages</option></select></label>
          <label>Stock quantity<input type="number" min="0" max="1000000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Leave blank for untracked" /></label>
          {error && <p className="staff-stock-form-error" role="alert">{error}</p>}
          <button className="staff-stock-save" type="submit">{isEditing ? 'Save changes' : 'Add stock item'}</button>
        </form>
      </section>
    </div>
  )
}

function StockStatus({ quantity }) {
  const status = STOCK_STATUS[getStockStatus(quantity)]
  return <span className={`staff-stock-status status-${getStockStatus(quantity)}`}><i aria-hidden="true" /><span>{status.label}</span></span>
}

function SummaryCard({ label, value, icon, tone, selected, onClick }) {
  return (
    <button type="button" className={`staff-stock-summary-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      <span className={`staff-stock-summary-icon tone-${tone}`}><DashboardIcon name={icon} size={20} /></span>
      <span className="staff-stock-summary-label">{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

export default function StaffStock() {
  const [items, setItems] = useState(INITIAL_STOCKS)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [editingStock, setEditingStock] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const deletedStock = useRef(null)
  const navigate = useNavigate()

  const counts = useMemo(() => items.reduce((result, item) => {
    result.total += 1
    result[getStockStatus(item.quantity)] += 1
    return result
  }, { total: 0, 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 0 }), [items])

  const visibleStocks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return items
      .filter((item) => statusFilter === 'all' || getStockStatus(item.quantity) === statusFilter)
      .filter((item) => !normalizedQuery || `${item.name} ${item.category}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        let comparison
        if (sort.key === 'quantity') {
          const firstQuantity = first.quantity ?? -1
          const secondQuantity = second.quantity ?? -1
          comparison = firstQuantity - secondQuantity
        } else {
          comparison = String(first[sort.key]).localeCompare(String(second[sort.key]))
        }
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [items, query, sort, statusFilter])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  function showToast(message, undoStock = null) {
    window.clearTimeout(toastTimer.current)
    deletedStock.current = undoStock
    setToast({ message, canUndo: Boolean(undoStock) })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      deletedStock.current = null
    }, 4500)
  }

  function saveStock(stock) {
    const oldStock = items.find((item) => item.id === stock.id)
    setItems((current) => oldStock
      ? current.map((item) => item.id === stock.id ? stock : item)
      : [...current, stock])
    if (oldStock && oldStock.quantity !== stock.quantity) {
      const previousStatus = getStockStatus(oldStock.quantity)
      const nextStatus = getStockStatus(stock.quantity)
      if (nextStatus === 'low-stock' && previousStatus !== 'low-stock') showToast(`${stock.name} is low on stock`)
      else if (nextStatus === 'out-of-stock' && previousStatus !== 'out-of-stock') showToast(`${stock.name} is out of stock`)
      else showToast(`${stock.name} stock updated`)
    } else if (!oldStock) {
      showToast(`${stock.name} added to inventory`)
    } else {
      showToast(`${stock.name} updated`)
    }
  }

  function editStock(stock) {
    setEditingStock(stock)
    setEditorOpen(true)
  }

  function addStock() {
    setEditingStock(null)
    setEditorOpen(true)
  }

  function deleteStock(stock) {
    if (!window.confirm(`Delete ${stock.name} from inventory?`)) return
    setItems((current) => current.filter((item) => item.id !== stock.id))
    showToast(`${stock.name} deleted`, stock)
  }

  function undoDelete() {
    const removed = deletedStock.current
    if (!removed) return
    setItems((current) => current.some((item) => item.id === removed.id) ? current : [...current, removed])
    window.clearTimeout(toastTimer.current)
    deletedStock.current = null
    setToast({ message: `${removed.name} restored`, canUndo: false })
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  function sortBy(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  }

  function sortLabel(label, key, align = '') {
    return <button className={`staff-stock-sort ${align}`} type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${label}${sort.key === key ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>{label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
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
    setStatusFilter((current) => current === status ? 'all' : status)
  }

  return (
    <div className="admin-dashboard staff-stock-app">
      <button className={`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Staff navigation">
        <div className="admin-brand"><Logo small /><span>CrumblyX</span><button type="button" className="admin-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button></div>
        <div className="admin-side-divider" />
        <nav className="admin-nav" aria-label="Main navigation">
          {STAFF_NAVIGATION.map((entry) => (
            <button type="button" key={entry.name} className={`admin-nav-item ${entry.name === 'Stocks' ? 'active' : ''}`} aria-current={entry.name === 'Stocks' ? 'page' : undefined} onClick={() => navigateSection(entry.name)}>
              <DashboardIcon name={entry.icon} /><span>{entry.name}</span>
            </button>
          ))}
        </nav>
        <div className="admin-account"><div className="admin-side-divider" /><div className="admin-user"><button type="button" className="admin-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button><span className="admin-user-copy"><strong>John Doe</strong><small>doe@example.com</small></span><button type="button" className="admin-logout" aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button></div></div>
      </aside>

      <main className="admin-main staff-stock-main">
        <header className="admin-topbar">
          <div className="admin-title-group">
            <button type="button" className="admin-hamburger" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="stocks" size={24} /><h1>Stocks</h1>
          </div>
          <div className="admin-top-actions">
            <div className="admin-chat-wrap">
              <button type="button" className="admin-chat-button" aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}><DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b></button>
              {chatOpen && <div className="admin-chat-popover" role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className="staff-stock-chat-note">2 unread customer messages</p></div>}
            </div>
            <button type="button" className="admin-avatar top-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        <div className="staff-stock-content">
          <section className="staff-stock-search-banner" aria-label="Search inventory">
            <label className="staff-stock-search">
              <DashboardIcon name="search" size={19} />
              <span className="visually-hidden">Search stock by item name or category</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Item..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><DashboardIcon name="close" size={15} /></button>}
            </label>
            <button type="button" className="staff-stock-add-button" onClick={addStock}><DashboardIcon name="plus" size={16} />Add Stock</button>
          </section>

          <section className="staff-stock-dashboard-content" aria-label="Inventory overview">
            <div className="staff-stock-summary-grid" aria-live="polite">
              <SummaryCard label="Total items" value={counts.total} icon="boxOpen" tone="coffee" selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
              <SummaryCard label="In Stock" value={counts['in-stock']} icon="checkCircle" tone="green" selected={statusFilter === 'in-stock'} onClick={() => toggleStatusFilter('in-stock')} />
              <SummaryCard label="Low Stock" value={counts['low-stock']} icon="warning" tone="amber" selected={statusFilter === 'low-stock'} onClick={() => toggleStatusFilter('low-stock')} />
              <SummaryCard label="Out of Stock" value={counts['out-of-stock']} icon="alertCircle" tone="red" selected={statusFilter === 'out-of-stock'} onClick={() => toggleStatusFilter('out-of-stock')} />
            </div>

            <section className="staff-stock-table-section" aria-labelledby="staff-stock-table-title">
              <div className="staff-stock-table-heading">
                <h2 id="staff-stock-table-title">Inventory</h2>
                <span>{visibleStocks.length} {visibleStocks.length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="staff-stock-table-wrap">
                <table className="staff-stock-table">
                  <caption className="visually-hidden">CrumblyX inventory stock levels and actions</caption>
                  <thead>
                    <tr>
                      <th scope="col">{sortLabel('ITEM', 'name')}</th>
                      <th scope="col">{sortLabel('CATEGORY', 'category')}</th>
                      <th scope="col">{sortLabel('STOCK QTY', 'quantity', 'center')}</th>
                      <th scope="col">{sortLabel('STATUS', 'quantity')}</th>
                      <th scope="col"><span className="staff-stock-actions-heading">ACTIONS</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStocks.map((stock) => (
                      <tr key={stock.id}>
                        <th scope="row" data-label="Item">{stock.name}</th>
                        <td data-label="Category"><span className={`staff-stock-category category-${stock.category.toLowerCase()}`}>{stock.category}</span></td>
                        <td data-label="Stock Qty" className="staff-stock-quantity">{stock.quantity == null ? '—' : stock.quantity}</td>
                        <td data-label="Status"><StockStatus quantity={stock.quantity} /></td>
                        <td data-label="Actions">
                          <div className="staff-stock-row-actions">
                            <button type="button" aria-label={`Edit ${stock.name}`} title={`Edit ${stock.name}`} onClick={() => editStock(stock)}><DashboardIcon name="edit" size={16} /></button>
                            <button type="button" aria-label={`Delete ${stock.name}`} title={`Delete ${stock.name}`} onClick={() => deleteStock(stock)}><DashboardIcon name="trash" size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleStocks.length === 0 && <tr className="staff-stock-empty-row"><td colSpan="5"><span><DashboardIcon name="search" size={23} /></span><strong>No items found</strong><small>Try another item name or category.</small></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </main>

      {toast && <div className="staff-stock-toast" role="status"><DashboardIcon name={toast.canUndo ? 'trash' : 'check'} size={16} /><span>{toast.message}</span>{toast.canUndo && <button type="button" onClick={undoDelete}>Undo</button>}</div>}
      {editorOpen && <StockEditor stock={editingStock} onClose={() => setEditorOpen(false)} onSave={saveStock} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}