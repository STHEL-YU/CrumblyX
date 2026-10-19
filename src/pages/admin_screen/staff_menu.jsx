import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'
import './staff_dashboard.css'
import './staff_menu.css'

const INITIAL_MENU = [
  { id: 'butter-croissant', name: 'Butter Croissant', category: 'Pastry', price: 85, available: true },
  { id: 'pain-au-chocolat', name: 'Pain au Chocolat', category: 'Pastry', price: 95, available: true },
  { id: 'matcha-cookies', name: 'Matcha Cookies', category: 'Pastry', price: 50, available: true },
  { id: 'chocolate-cookies', name: 'Chocolate Cookies', category: 'Pastry', price: 50, available: true },
  { id: 'strawberry-milk-tea', name: 'Strawberry Milk Tea', category: 'Beverages', price: 130, available: true },
  { id: 'brown-sugar-latte', name: 'Brown Sugar Latte', category: 'Beverages', price: 145, available: false },
  { id: 'caramel-latte-macchiato', name: 'Caramel Latte Macchiato', category: 'Beverages', price: 180, available: true },
  { id: 'matcha-latte', name: 'Matcha Latte', category: 'Beverages', price: 180, available: true },
  { id: 'iced-americano', name: 'Iced Americano', category: 'Beverages', price: 120, available: true },
]

const CATEGORY_FILTERS = ['All', 'Pastry', 'Beverages']

function MenuItemDialog({ item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || 'Pastry')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [image, setImage] = useState(item?.image || '')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const isEditing = Boolean(item)

  useEffect(() => {
    dialogRef.current?.querySelector('input')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
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

  function uploadImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('This image could not be loaded. Try another file.')
        return
      }
      setImage(reader.result)
      setError('')
    }
    reader.onerror = () => setError('This image could not be loaded. Try another file.')
    reader.readAsDataURL(file)
  }

  function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const numericPrice = Number(price)
    if (!trimmedName) {
      setError('Enter an item name.')
      return
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Enter a valid price.')
      return
    }
    onSave({
      ...item,
      id: item?.id || `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: trimmedName,
      category,
      price: numericPrice,
      available,
      image,
    })
    onClose()
  }

  return (
    <div className="staff-menu-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="staff-menu-modal" role="dialog" aria-modal="true" aria-labelledby="staff-menu-modal-title">
        <header>
          <div><span>MENU MANAGEMENT</span><h2 id="staff-menu-modal-title">{isEditing ? 'Edit menu item' : 'Add menu item'}</h2></div>
          <button type="button" aria-label="Close menu item form" onClick={onClose}><DashboardIcon name="close" /></button>
        </header>
        <form onSubmit={submit}>
          <label>Item name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cinnamon Roll" maxLength={100} /></label>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Pastry</option><option>Beverages</option></select></label>
          <label>Price (₱)<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" /></label>
          <div className="staff-menu-image-field">
            <span className="staff-menu-image-label">Item image</span>
            <div className="staff-menu-image-control">
              {image
                ? <img className="staff-menu-image-preview" src={image} alt={`Preview of ${name || 'menu item'}`} />
                : <span className="staff-menu-image-placeholder"><DashboardIcon name="boxOpen" size={22} /></span>}
              <div>
                <label className="staff-menu-image-upload">
                  <span>{image ? 'Change image' : 'Upload image'}</span>
                  <input type="file" accept="image/*" onChange={uploadImage} aria-label="Upload menu item image" />
                </label>
                <small>Image files up to 5 MB</small>
              </div>
              {image && <button className="staff-menu-image-remove" type="button" onClick={() => { setImage(''); setError('') }}>Remove</button>}
            </div>
          </div>
          {isEditing && <label className="staff-menu-availability-field">Available
            <input type="checkbox" role="switch" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
          </label>}
          {error && <p role="alert">{error}</p>}
          <button className="staff-menu-modal-submit" type="submit">{isEditing ? 'Save changes' : 'Add item'}</button>
        </form>
      </section>
    </div>
  )
}

function MenuDeleteDialog({ item, onClose, onConfirm }) {
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
    <div className="staff-menu-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="staff-menu-modal staff-menu-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="staff-menu-delete-title">
        <header>
          <div><span>MENU MANAGEMENT</span><h2 id="staff-menu-delete-title">Delete menu item?</h2></div>
          <button type="button" aria-label="Close delete confirmation" onClick={onClose}><DashboardIcon name="close" /></button>
        </header>
        <p>Delete <strong>{item.name}</strong> from the menu? This action cannot be undone.</p>
        <div className="staff-menu-delete-actions">
          <button type="button" className="staff-menu-cancel-button" onClick={onClose}>Cancel</button>
          <button type="button" className="staff-menu-confirm-delete" onClick={onConfirm}>Delete item</button>
        </div>
      </section>
    </div>
  )
}

export default function StaffMenu() {
  const [items, setItems] = useState(INITIAL_MENU)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [toast, setToast] = useState(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletedItem, setDeletedItem] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [section, setSection] = useState('Menu')
  const toastTimer = useRef(null)
  const deletedItemTimer = useRef(null)
  const navigate = useNavigate()

  const availableCount = items.filter((item) => item.available).length
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return items
      .filter((item) => categoryFilter === 'All' || item.category === categoryFilter)
      .filter((item) => !normalizedQuery || `${item.name} ${item.category}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        const firstValue = first[sort.key]
        const secondValue = second[sort.key]
        const comparison = typeof firstValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue))
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [items, query, categoryFilter, sort])

  function toggleAvailability(itemId) {
    const currentItem = items.find((item) => item.id === itemId)
    if (!currentItem) return
    const available = !currentItem.available
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, available } : item))
    setToast({ message: `${currentItem.name} marked ${available ? 'available' : 'unavailable'}` })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(deletedItemTimer.current)
  }, [])

  function saveItem(item) {
    const existing = items.some((current) => current.id === item.id)
    setItems((current) => existing
      ? current.map((entry) => entry.id === item.id ? item : entry)
      : [...current, item])
    setAddDialogOpen(false)
    setEditingItem(null)
    setToast({ message: `${item.name} ${existing ? 'updated' : 'added'}` })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  function deleteItem(item) {
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    setPendingDelete(null)
    setDeletedItem(item)
    setToast({ message: `${item.name} deleted`, canUndo: true })
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(deletedItemTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      setDeletedItem(null)
    }, 5000)
    deletedItemTimer.current = window.setTimeout(() => setDeletedItem(null), 5000)
  }

  function undoDelete() {
    if (!deletedItem) return
    setItems((current) => current.some((item) => item.id === deletedItem.id) ? current : [...current, deletedItem])
    setToast({ message: `${deletedItem.name} restored` })
    setDeletedItem(null)
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(deletedItemTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    deleteItem(pendingDelete)
  }

  function sortBy(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
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
    if (name === 'Orders') {
      navigate('/staff/orders')
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
    if (name !== 'Menu') {
      setSection(name)
      return
    }
    setSection('Menu')
  }

  function sortLabel(label, key) {
    return (
      <button className="staff-menu-sort" type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${label}${sort.key === key ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>
        {label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    )
  }

  return (
    <div className="admin-dashboard staff-menu-app">
      <button className={`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Staff navigation">
        <div className="admin-brand"><Logo small /><span>CrumblyX</span><button type="button" className="admin-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button></div>
        <div className="admin-side-divider" />
        <nav className="admin-nav" aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button type="button" key={item.name} className={`admin-nav-item ${section === item.name ? 'active' : ''}`} aria-current={section === item.name ? 'page' : undefined} onClick={() => navigateSection(item.name)}>
              <DashboardIcon name={item.icon} /><span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="admin-account"><div className="admin-side-divider" /><div className="admin-user"><button type="button" className="admin-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button><span className="admin-user-copy"><strong>John Doe</strong><small>doe@example.com</small></span><button type="button" className="admin-logout" aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button></div></div>
      </aside>

      <main className="admin-main staff-menu-main">
        <header className="admin-topbar">
          <div className="admin-title-group">
            <button type="button" className="admin-hamburger" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="plate" size={24} /><h1>{section}</h1>
          </div>
          <div className="admin-top-actions">
            <div className="admin-chat-wrap">
              <button type="button" className="admin-chat-button" aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}><DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b></button>
              {chatOpen && <div className="admin-chat-popover" role="dialog" aria-label="Customer chat preview"><header><strong>Customer Chat</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header><p className="staff-menu-chat-note">2 unread customer messages</p></div>}
            </div>
            <button type="button" className="admin-avatar top-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>

        {section === 'Menu' ? <div className="staff-menu-content">
          <section className="staff-menu-banner">
            <h2>{section === 'Menu' ? 'Menu Management' : `${section} Management`}</h2>
            <label className="staff-menu-search">
              <DashboardIcon name="search" size={19} />
              <span className="visually-hidden">Search menu items by name or category</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Item..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><DashboardIcon name="close" size={15} /></button>}
            </label>
          </section>

          <section className="staff-menu-list-section" aria-labelledby="staff-menu-table-title">
            <div className="staff-menu-toolbar">
              <div className="staff-menu-filters" aria-label="Filter by category">
                {CATEGORY_FILTERS.map((category) => <button type="button" key={category} className={categoryFilter === category ? 'selected' : ''} aria-pressed={categoryFilter === category} onClick={() => setCategoryFilter(category)}>{category}</button>)}
              </div>
              <div className="staff-menu-toolbar-actions">
                <div className="staff-menu-summary" aria-live="polite">{availableCount} of {items.length} Available</div>
                <button type="button" className="staff-menu-add-button" onClick={() => setAddDialogOpen(true)}><DashboardIcon name="plus" size={15} />Add Item</button>
              </div>
            </div>

            <div className="staff-menu-table-wrap">
              <table className="staff-menu-table">
                <caption id="staff-menu-table-title" className="visually-hidden">CrumblyX menu item availability and prices</caption>
                <thead>
                  <tr>
                    <th scope="col">{sortLabel('ITEM', 'name')}</th>
                    <th scope="col">{sortLabel('CATEGORY', 'category')}</th>
                    <th scope="col">{sortLabel('PRICE', 'price')}</th>
                    <th scope="col">AVAILABLE</th>
                    <th scope="col"><span className="staff-menu-actions-heading">ACTIONS</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <th scope="row" data-label="Item">
                        <span className="staff-menu-item-cell">
                          {item.image
                            ? <img className="staff-menu-item-image" src={item.image} alt="" />
                            : <span className="staff-menu-item-image staff-menu-item-image-empty" aria-hidden="true"><DashboardIcon name="boxOpen" size={17} /></span>}
                          <span>{item.name}</span>
                        </span>
                      </th>
                      <td data-label="Category"><span className={`staff-menu-category category-${item.category.toLowerCase()}`}>{item.category}</span></td>
                      <td data-label="Price" className="staff-menu-price">₱{item.price.toFixed(2)}</td>
                      <td data-label="Available">
                        <label className="staff-menu-toggle">
                          <span className="visually-hidden">{item.name} available</span>
                          <input type="checkbox" role="switch" checked={item.available} onChange={() => toggleAvailability(item.id)} aria-label={`${item.name} available`} />
                          <span className="staff-menu-toggle-track" aria-hidden="true"><i /></span>
                        </label>
                      </td>
                      <td data-label="Actions">
                        <div className="staff-menu-row-actions">
                          <button type="button" aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`} onClick={() => setEditingItem(item)}><DashboardIcon name="edit" size={15} /></button>
                          <button type="button" aria-label={`Delete ${item.name}`} title={`Delete ${item.name}`} onClick={() => setPendingDelete(item)}><DashboardIcon name="trash" size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && <tr className="staff-menu-empty-row"><td colSpan="5"><span><DashboardIcon name="search" size={23} /></span><strong>No items found</strong><small>Try another item name or category.</small></td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div> : <section className="staff-menu-placeholder"><span><DashboardIcon name={STAFF_NAVIGATION.find((item) => item.name === section)?.icon} size={25} /></span><h2>{section}</h2><p>This management section is not available yet.</p></section>}
      </main>
      {toast && <div className="staff-menu-toast" role="status"><DashboardIcon name={toast.canUndo ? 'trash' : 'check'} size={16} /><span>{toast.message}</span>{toast.canUndo && deletedItem && <button type="button" onClick={undoDelete}>Undo</button>}</div>}
      {addDialogOpen && <MenuItemDialog onClose={() => setAddDialogOpen(false)} onSave={saveItem} />}
      {editingItem && <MenuItemDialog item={editingItem} onClose={() => setEditingItem(null)} onSave={saveItem} />}
      {pendingDelete && <MenuDeleteDialog item={pendingDelete} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}