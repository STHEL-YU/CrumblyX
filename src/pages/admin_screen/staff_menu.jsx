import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardIcon, StaffProfileDialog, StaffSpinner } from './staff_admin_shared.jsx'
import { logoutStaff } from './auth/staff_auth_client.js'
import Sidebar from './staff_sidebar.jsx'
import StaffMessageInbox from './staff_message_inbox.jsx'
import { adminTw } from './staff_admin_tw.js'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'

const CATEGORY_FILTERS = ['All', 'Pastry', 'Meal', 'Beverages']
const MENU_CACHE_KEY = 'crumblyx.menu.v1'
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5]
const MENU_PAGE_SIZE = 8

/* ---------- shared class strings ---------- */
const inputCls = 'mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15'
const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30'
const ghostBtn = 'inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20'
const categoryTone = {
  Pastry: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Meal: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  Beverages: 'bg-sky-50 text-sky-800 ring-sky-600/20',
}

/* ---------- helpers (outside the component so they are created once) ---------- */
async function menuRequest(action, method = 'GET', body, signal) {
  return apiRequest(`/api/menu/${action}`, method, body, signal)
}

async function stockRequest(signal) {
  return apiRequest('/api/stocks/list', 'GET', undefined, signal)
}

async function apiRequest(path, method = 'GET', body, signal) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Menu request failed.')
  return data
}

function normalizeMenuItem(item) {
  return {
    ...item,
    price: Number(item.price),
    description: item.description || '',
    available: Boolean(item.available),
  }
}

function normalizeStockRecord(record) {
  return { ...record, quantity: record.quantity == null ? null : Number(record.quantity) }
}

const nameKey = (value) => String(value || '').trim().toLocaleLowerCase()

// A menu item is sold out when its stock record has a quantity of exactly 0.
// Records are matched by id first, then by item name (older records used their own ids).
function getSoldOutIds(items, records) {
  const byId = new Map(records.map((record) => [record.id, record]))
  const byName = new Map(records.map((record) => [nameKey(record.name), record]))
  const soldOut = new Set()
  for (const item of items) {
    const record = byId.get(item.id) || byName.get(nameKey(item.name))
    if (record && record.quantity != null && Number(record.quantity) === 0) soldOut.add(item.id)
  }
  return soldOut
}

function readMenuCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(MENU_CACHE_KEY) || 'null')
    return Array.isArray(cached) ? cached : null
  } catch {
    return null
  }
}

function writeMenuCache(items) {
  try { sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(items)) } catch { /* storage full or blocked */ }
}

// Shrinks the photo before it is saved. A raw phone photo can be 3-5 MB as base64;
// this brings it down to roughly 30-80 KB, so the menu list loads much faster.
function resizeImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image could not be loaded.'))
    }
    img.src = url
  })
}

// Escape to close + Tab focus trap. Keeps onClose in a ref so the effect runs once
// (previously it re-ran, and re-focused the first input, on every parent render).
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

/* ---------- dialogs ---------- */
function DialogShell({ children, onClose, labelledBy, role = 'dialog', dialogRef }) {
  return (
    <div
      className={adminTw('fixed inset-0 z-50 grid place-items-center bg-stone-900/40 p-4 backdrop-blur-sm')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={dialogRef}
        className={adminTw('max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5')}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
    </div>
  )
}

function DialogHeader({ id, title, closeLabel, onClose }) {
  return (
    <header className={adminTw('mb-5 flex items-start justify-between gap-4')}>
      <h2 id={id} className={adminTw('text-lg font-semibold text-stone-900')}>{title}</h2>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={adminTw('-mr-2 -mt-1 rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800')}
      >
        <DashboardIcon name="close" size={18} />
      </button>
    </header>
  )
}

function MenuItemDialog({ item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [category, setCategory] = useState(item?.category || 'Pastry')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [image, setImage] = useState(item?.image || '')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const dialogRef = useRef(null)
  const isEditing = Boolean(item)

  useDialogA11y(dialogRef, onClose)

  async function uploadImage(event) {
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
    setProcessing(true)
    try {
      setImage(await resizeImage(file))
      setError('')
    } catch {
      setError('This image could not be loaded. Try another file.')
    } finally {
      setProcessing(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const numericPrice = Number(price)
    if (!trimmedName) {
      setError('Enter an item name.')
      return
    }
    if (price === '' || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Enter a valid price.')
      return
    }
    setProcessing(true)
    try {
      const saved = await onSave({
        ...item,
        id: item?.id || `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: trimmedName,
        description: description.trim(),
        category,
        price: numericPrice,
        available,
        image,
      })
      if (saved) onClose()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <DialogShell onClose={onClose} labelledBy="staff-menu-modal-title" dialogRef={dialogRef}>
      <DialogHeader
        id="staff-menu-modal-title"
        title={isEditing ? 'Edit menu item' : 'Add menu item'}
        closeLabel="Close menu item form"
        onClose={onClose}
      />
      <form onSubmit={submit} className={adminTw('space-y-4')}>
        <label className={adminTw('block text-sm font-medium text-stone-700')}>
          Item name
          <input className={adminTw(inputCls)} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cinnamon Roll" maxLength={100} />
        </label>

        <label className={adminTw('block text-sm font-medium text-stone-700')}>
          Description
          <textarea
            className={adminTw(`${inputCls} min-h-24 resize-y`)}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the ingredients, flavor, or what comes with this item."
            maxLength={500}
            rows={3}
          />
          <span className={adminTw('mt-1 block text-xs font-normal text-stone-500')}>
            {description.length}/500 characters
          </span>
        </label>

        <div className={adminTw('grid grid-cols-2 gap-3')}>
          <label className={adminTw('block text-sm font-medium text-stone-700')}>
            Category
            <select className={adminTw(inputCls)} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Pastry</option>
              <option>Meal</option>
              <option>Beverages</option>
            </select>
          </label>
          <label className={adminTw('block text-sm font-medium text-stone-700')}>
            Price (₱)
            <input className={adminTw(inputCls)} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
          </label>
        </div>

        <div>
          <span className={adminTw('block text-sm font-medium text-stone-700')}>Item image</span>
          <div className={adminTw('mt-1.5 flex items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3')}>
            {image
              ? <img className={adminTw('h-16 w-16 rounded-lg object-cover ring-1 ring-stone-900/10')} src={image} alt={`Preview of ${name || 'menu item'}`} />
              : <span className={adminTw('grid h-16 w-16 place-items-center rounded-lg bg-white text-stone-400 ring-1 ring-stone-200')}><DashboardIcon name="boxOpen" size={22} /></span>}
            <div className={adminTw('min-w-0 flex-1')}>
              <label className={adminTw('inline-flex cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus-within:ring-4 focus-within:ring-stone-400/20')}>
                <span className={adminTw('inline-flex items-center gap-2')}>{processing && <StaffSpinner className="size-3" />}{processing ? 'Processing…' : image ? 'Change image' : 'Upload image'}</span>
                <input className={adminTw('sr-only')} type="file" accept="image/*" onChange={uploadImage} aria-label="Upload menu item image" disabled={processing} />
              </label>
              <p className={adminTw('mt-1 text-xs text-stone-500')}>Photos are resized automatically.</p>
            </div>
            {image && <button className={adminTw('text-sm font-medium text-rose-600 hover:text-rose-700')} type="button" onClick={() => { setImage(''); setError('') }}>Remove</button>}
          </div>
        </div>

        {isEditing && (
          <label className={adminTw('flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-700')}>
            Available for ordering
            <Switch checked={available} onChange={setAvailable} />
          </label>
        )}

        {error && <p role="alert" className={adminTw('rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-600/10')}>{error}</p>}

        <div className={adminTw('flex justify-end gap-2 pt-2')}>
          <button type="button" className={adminTw(ghostBtn)} onClick={onClose}>Cancel</button>
          <button type="submit" className={adminTw(primaryBtn)} disabled={processing} aria-busy={processing}>
            {processing && <StaffSpinner />}
            {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

function MenuDeleteDialog({ item, onClose, onConfirm, loading }) {
  const dialogRef = useRef(null)
  useDialogA11y(dialogRef, onClose)

  return (
    <DialogShell onClose={onClose} labelledBy="staff-menu-delete-title" role="alertdialog" dialogRef={dialogRef}>
      <DialogHeader id="staff-menu-delete-title" title="Delete menu item?" closeLabel="Close delete confirmation" onClose={onClose} />
      <p className={adminTw('text-sm leading-6 text-stone-600')}>
        <strong className={adminTw('text-stone-900')}>{item.name}</strong> will be removed from the menu. You can undo this for a few seconds afterwards.
      </p>
      <div className={adminTw('mt-6 flex justify-end gap-2')}>
        <button type="button" className={adminTw(ghostBtn)} onClick={onClose}>Cancel</button>
        <button type="button" className={adminTw('inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 disabled:cursor-wait disabled:opacity-70')} onClick={onConfirm} disabled={loading} aria-busy={loading}>
          {loading && <StaffSpinner />}
          {loading ? 'Deleting…' : 'Delete item'}
        </button>
      </div>
    </DialogShell>
  )
}

/* ---------- small pieces ---------- */
function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <span className={adminTw('relative inline-flex h-6 w-11 shrink-0')}>
      <input
        type="checkbox"
        role="switch"
        className={adminTw('peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0')}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        disabled={disabled}
      />
      <span
        aria-hidden="true"
        className={adminTw("absolute inset-0 cursor-pointer rounded-full bg-stone-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-500/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5")}
      />
    </span>
  )
}

const MenuRow = memo(function MenuRow({ item, soldOut, onToggle, onEdit, onDelete, toggling }) {
  const available = item.available && !soldOut
  return (
    <tr className={adminTw('transition-colors hover:bg-amber-50/40')}>
      <th scope="row" data-label="Item" className={adminTw('px-4 py-3 text-left font-medium text-stone-900')}>
        <span className={adminTw('flex items-center gap-3')}>
          {item.image
            ? <img className={adminTw('h-11 w-11 rounded-lg bg-stone-100 object-cover ring-1 ring-stone-900/10')} src={item.image} alt="" loading="lazy" decoding="async" width="44" height="44" />
            : <span className={adminTw('grid h-11 w-11 place-items-center rounded-lg bg-stone-100 text-stone-400')} aria-hidden="true"><DashboardIcon name="boxOpen" size={17} /></span>}
          <span>{item.name}</span>
        </span>
      </th>
      <td data-label="Category" className={adminTw('px-4 py-3')}>
        <span className={adminTw(`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryTone[item.category] || 'bg-stone-100 text-stone-700 ring-stone-500/20'}`)}>{item.category}</span>
      </td>
      <td data-label="Price" className={adminTw('px-4 py-3 font-medium tabular-nums text-stone-800')}>₱{item.price.toFixed(2)}</td>
      <td data-label="Available" className={adminTw('px-4 py-3')}>
        <span className={adminTw('flex items-center gap-2')}>
          <Switch checked={available} onChange={() => onToggle(item.id)} label={`${item.name} available`} disabled={soldOut || toggling} />
          {toggling && <StaffSpinner className="size-3 text-stone-500" />}
          <span className={adminTw(`text-xs font-medium ${available ? 'text-emerald-700' : 'text-stone-500'}`)}>{available ? 'Available' : 'Sold out'}</span>
        </span>
      </td>
      <td data-label="Actions" className={adminTw('px-4 py-3')}>
        <div className={adminTw('flex justify-end gap-1')}>
          <button type="button" aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`} onClick={() => onEdit(item)} className={adminTw('rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20')}>
            <DashboardIcon name="edit" size={16} />
          </button>
          <button type="button" aria-label={`Delete ${item.name}`} title={`Delete ${item.name}`} onClick={() => onDelete(item)} className={adminTw('rounded-lg p-2 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400/20')}>
            <DashboardIcon name="trash" size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
})

function SkeletonRows() {
  return SKELETON_ROWS.map((row) => (
    <tr key={row} className={adminTw('animate-pulse')} aria-hidden="true">
      <td className={adminTw('px-4 py-3')}><span className={adminTw('flex items-center gap-3')}><span className={adminTw('h-11 w-11 rounded-lg bg-stone-200')} /><span className={adminTw('h-3.5 w-32 rounded bg-stone-200')} /></span></td>
      <td className={adminTw('px-4 py-3')}><span className={adminTw('block h-5 w-20 rounded-full bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3')}><span className={adminTw('block h-3.5 w-14 rounded bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3')}><span className={adminTw('block h-6 w-24 rounded-full bg-stone-200')} /></td>
      <td className={adminTw('px-4 py-3')}><span className={adminTw('ml-auto block h-6 w-16 rounded bg-stone-200')} /></td>
    </tr>
  ))
}

/* ---------- page ---------- */
export default function StaffMenu() {
  // Show the last known menu instantly, then refresh it in the background.
  const [items, setItems] = useState(() => (readMenuCache() || []).map(normalizeMenuItem))
  const [stockRecords, setStockRecords] = useState([])
  const [menuLoading, setMenuLoading] = useState(() => !readMenuCache())
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [toast, setToast] = useState(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletedItem, setDeletedItem] = useState(null)
  const [pendingToggleId, setPendingToggleId] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const [section, setSection] = useState('Menu')
  const toastTimer = useRef(null)
  const deletedItemTimer = useRef(null)
  const itemsRef = useRef(items)
  const hasLoaded = useRef(false)
  const navigate = useNavigate()

  itemsRef.current = items

  const showToast = useCallback((next, duration = 2800) => {
    setToast(next)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    menuRequest('list', 'GET', undefined, controller.signal)
      .then((menuItems) => {
        if (controller.signal.aborted) return
        hasLoaded.current = true
        setItems(menuItems.map(normalizeMenuItem))
        setMenuLoading(false)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setMenuLoading(false)
        showToast({ message: `Could not load menu: ${error.message}` })
      })

    stockRequest(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setStockRecords(records.map(normalizeStockRecord))
      })
      .catch((error) => {
        if (!controller.signal.aborted) showToast({ message: `Could not load stock quantities: ${error.message}` })
      })
    return () => controller.abort()
  }, [showToast])

  // Keep the cache in sync after the first successful load (edits, deletes, toggles).
  useEffect(() => {
    if (hasLoaded.current) writeMenuCache(items)
  }, [items])

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(deletedItemTimer.current)
  }, [])

  const soldOutIds = useMemo(() => getSoldOutIds(items, stockRecords), [items, stockRecords])
  const availableCount = useMemo(
    () => items.filter((item) => item.available && !soldOutIds.has(item.id)).length,
    [items, soldOutIds],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase()
    return items
      .filter((item) => categoryFilter === 'All' || item.category === categoryFilter)
      .filter((item) => !normalizedQuery || `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        const firstValue = first[sort.key]
        const secondValue = second[sort.key]
        const comparison = typeof firstValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue))
        return sort.direction === 'asc' ? comparison : -comparison
      })
  }, [items, deferredQuery, categoryFilter, sort])
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / MENU_PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const pageItems = useMemo(
    () => filteredItems.slice((visiblePage - 1) * MENU_PAGE_SIZE, visiblePage * MENU_PAGE_SIZE),
    [filteredItems, visiblePage],
  )

  const toggleAvailability = useCallback(async (itemId) => {
    if (pendingToggleId) return
    const currentItem = itemsRef.current.find((item) => item.id === itemId)
    if (!currentItem) return
    if (soldOutIds.has(itemId)) return
    const available = !currentItem.available
    const updatedItem = { ...currentItem, available }

    setPendingToggleId(itemId)
    setItems((current) => current.map((item) => (item.id === itemId ? updatedItem : item)))
    try {
      await menuRequest('update', 'PUT', updatedItem)
      showToast({ message: `${currentItem.name} marked ${available ? 'available' : 'unavailable'}` })
    } catch (error) {
      setItems((current) => current.map((item) => (item.id === itemId ? currentItem : item)))
      showToast({ message: error.message })
    } finally {
      setPendingToggleId('')
    }
  }, [pendingToggleId, showToast, soldOutIds])

  async function saveItem(item) {
    const existing = items.some((current) => current.id === item.id)
    try {
      const savedItem = existing
        ? normalizeMenuItem(await menuRequest('update', 'PUT', item))
        : normalizeMenuItem(await menuRequest('create', 'POST', item))
      setItems((current) => (existing
        ? current.map((entry) => (entry.id === savedItem.id ? savedItem : entry))
        : [...current, savedItem]))
      setAddDialogOpen(false)
      setEditingItem(null)
      showToast({ message: `${savedItem.name} ${existing ? 'updated' : 'added'}` })
      return true
    } catch (error) {
      showToast({ message: error.message })
      return false
    }
  }

  async function deleteItem(item) {
    setDeleting(true)
    try {
      const result = await menuRequest(`delete?id=${encodeURIComponent(item.id)}`, 'DELETE', { id: item.id })
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      const deletedStockIds = new Set((result.stockRecords || []).map((record) => record.id))
      setStockRecords((current) => current.filter((record) => !deletedStockIds.has(record.id)))
      setDeletedItem({ item, stockRecords: result.stockRecords || [] })
    } catch (error) {
      setPendingDelete(null)
      showToast({ message: error.message })
      return
    } finally {
      setDeleting(false)
    }
    setPendingDelete(null)
    showToast({ message: `${item.name} and its stock records deleted`, canUndo: true }, 5000)
    window.clearTimeout(deletedItemTimer.current)
    deletedItemTimer.current = window.setTimeout(() => setDeletedItem(null), 5000)
  }

  async function undoDelete() {
    if (!deletedItem || undoing) return
    setUndoing(true)
    try {
      const restoredItem = normalizeMenuItem(await menuRequest('create', 'POST', {
        ...deletedItem.item,
        stockRecords: deletedItem.stockRecords,
      }))
      setItems((current) => (current.some((item) => item.id === restoredItem.id) ? current : [...current, restoredItem]))
      setStockRecords((current) => [
        ...current,
        ...deletedItem.stockRecords
          .filter((record) => !current.some((existing) => existing.id === record.id))
          .map(normalizeStockRecord),
      ])
      showToast({ message: `${restoredItem.name} restored` }, 2500)
    } catch (error) {
      showToast({ message: error.message })
      return
    } finally {
      setUndoing(false)
    }
    setDeletedItem(null)
    window.clearTimeout(deletedItemTimer.current)
  }

  function confirmDelete() {
    if (pendingDelete) deleteItem(pendingDelete)
  }

  function sortBy(key) {
    setPage(1)
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
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
    const routes = {
      Dashboard: '/staff/dashboard',
      Orders: '/staff/orders',
      Sales: '/staff/sales',
      Stocks: '/staff/stocks',
      Tables: '/staff/tables',
      Customers: '/staff/customers',
    }
    if (routes[name]) {
      navigate(routes[name])
      return
    }
    setSection(name)
  }

  function sortHeader(label, key) {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={adminTw('px-4 py-3 text-left')}>
        <button
          type="button"
          onClick={() => sortBy(key)}
          aria-label={`Sort by ${label}${active ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
          className={adminTw(`inline-flex items-center gap-1.5 rounded text-xs font-semibold transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20 ${active ? 'text-stone-900' : 'text-stone-500'}`)}
        >
          {label}
          <span aria-hidden="true" className={adminTw(active ? 'text-amber-600' : 'text-stone-300')}>{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    )
  }

  const isEmpty = !menuLoading && filteredItems.length === 0

  return (
    <div className={adminTw('admin-dashboard staff-menu-app')}>
      <style>{`
        .menu-table th, .menu-table td { font-size: 0.875rem !important; line-height: 1.25rem !important; }
        .menu-table thead th { font-size: 0.8125rem !important; font-weight: 600 !important; color: #78716c; }
        .menu-table thead button { font: inherit !important; color: inherit !important; }
        .menu-table thead th[aria-sort="ascending"], .menu-table thead th[aria-sort="descending"] { color: #1c1917; }
      `}</style>
      <Sidebar
        activeRoute={section}
        drawerOpen={drawerOpen}
        onNavigate={navigateSection}
        onClose={() => setDrawerOpen(false)}
        profileOpen={profileOpen}
        onOpenProfile={openProfile}
        onLogout={logout}
      />

      <main className={adminTw('admin-main staff-menu-main')}>
        <header className={adminTw('admin-topbar')}>
          <div className={adminTw('admin-title-group')}>
            <button type="button" className={adminTw('admin-hamburger')} aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><span /><span /><span /></button>
            <DashboardIcon name="plate" size={24} /><h1>{section}</h1>
          </div>
          <div className={adminTw('admin-top-actions')}>
            <StaffMessageInbox />
            <button type="button" className={adminTw('admin-avatar top-avatar admin-avatar-trigger')} aria-label="View staff profile for Crumblyx Staff" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>CS</button>
          </div>
        </header>

        {section === 'Menu' ? (
          <div className={adminTw('min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
          <div className={adminTw('mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8')}>
            {/* Title, search and primary action */}
            <section className={adminTw('flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 xl:flex-row xl:items-center xl:justify-between')}>
              <div>
                <p className={adminTw('text-xs font-bold uppercase tracking-[0.16em] text-amber-700')}>Catalog</p>
                <h2 className={adminTw('mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl')}>Menu management</h2>
                <p className={adminTw('mt-1.5 text-sm text-stone-500')} aria-live="polite">
                  {menuLoading ? 'Loading your menu…' : `${availableCount} of ${items.length} items available`}
                </p>
              </div>
              <div className={adminTw('flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto')}>
                <label className={adminTw('relative block min-w-0 flex-1 sm:w-80 xl:flex-none')}>
                  <span className={adminTw('pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400')}><DashboardIcon name="search" size={18} /></span>
                  <span className={adminTw('sr-only')}>Search menu items by name or category</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1) }}
                    placeholder="Search items"
                    className={adminTw('min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-9 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/15 [&::-webkit-search-cancel-button]:appearance-none')}
                  />
                  {query && (
                    <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setPage(1) }} className={adminTw('absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700')}>
                      <DashboardIcon name="close" size={15} />
                    </button>
                  )}
                </label>
                <button type="button" className={adminTw(`${primaryBtn} min-h-11 rounded-xl bg-amber-700 px-5 hover:bg-amber-800`)} onClick={() => setAddDialogOpen(true)}>
                  <DashboardIcon name="plus" size={15} />Add item
                </button>
              </div>
            </section>

            {/* Table card */}
            <section className={adminTw('overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_30px_rgba(28,25,23,0.06)]')} aria-labelledby="staff-menu-table-title">
              <div className={adminTw('flex flex-col gap-4 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6')}>
                <div role="group" aria-label="Filter by category" className={adminTw('inline-flex rounded-lg bg-stone-100 p-1')}>
                  {CATEGORY_FILTERS.map((category) => (
                    <button
                      type="button"
                      key={category}
                      aria-pressed={categoryFilter === category}
                      onClick={() => { setCategoryFilter(category); setPage(1) }}
                      className={adminTw(`rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25 ${categoryFilter === category ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <span className={adminTw('text-sm font-medium text-stone-500')}>{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found</span>
              </div>

              <div className={adminTw('overflow-x-auto')}>
                <table className={adminTw('menu-table w-full min-w-[760px] border-collapse text-sm')}>
                  <caption id="staff-menu-table-title" className={adminTw('sr-only')}>CrumblyX menu item availability and prices</caption>
                  <thead className={adminTw('bg-stone-50/80')}>
                    <tr className={adminTw('border-b border-stone-200')}>
                      {sortHeader('Item', 'name')}
                      {sortHeader('Category', 'category')}
                      {sortHeader('Price', 'price')}
                      <th scope="col" className={adminTw('px-4 py-3 text-left text-xs font-semibold text-stone-500')}>Status</th>
                      <th scope="col" className={adminTw('px-4 py-3 text-right text-xs font-semibold text-stone-500')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={adminTw('divide-y divide-stone-100')}>
                    {menuLoading && <SkeletonRows />}
                    {!menuLoading && pageItems.map((item) => (
                      <MenuRow key={item.id} item={item} soldOut={soldOutIds.has(item.id)} onToggle={toggleAvailability} onEdit={setEditingItem} onDelete={setPendingDelete} toggling={pendingToggleId === item.id} />
                    ))}
                    {isEmpty && (
                      <tr>
                        <td colSpan="5" className={adminTw('px-4 py-14 text-center')}>
                          <span className={adminTw('mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-400')}><DashboardIcon name="search" size={21} /></span>
                          <strong className={adminTw('block text-stone-900')}>{query ? 'No matching items' : 'No items yet'}</strong>
                          <small className={adminTw('mt-1 block text-stone-500')}>{query ? 'Try a different name or category.' : 'Add your first menu item to get started.'}</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className={adminTw('flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6')}>
                <p className={adminTw('text-sm text-stone-500')} aria-live="polite">
                  Showing {filteredItems.length ? (visiblePage - 1) * MENU_PAGE_SIZE + 1 : 0}–{Math.min(visiblePage * MENU_PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items
                </p>
                <div className={adminTw('flex items-center gap-2')}>
                  <button
                    type="button"
                    className={adminTw('min-h-10 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-45')}
                    onClick={() => setPage(Math.max(1, visiblePage - 1))}
                    disabled={visiblePage <= 1 || menuLoading}
                  >
                    Previous
                  </button>
                  <span className={adminTw('min-w-20 text-center text-sm font-semibold tabular-nums text-stone-600')} aria-label={`Page ${visiblePage} of ${pageCount}`}>
                    {visiblePage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    className={adminTw('min-h-10 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-45')}
                    onClick={() => setPage(Math.min(pageCount, visiblePage + 1))}
                    disabled={visiblePage >= pageCount || menuLoading}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </section>
          </div>
          </div>
        ) : (
          <section className={adminTw('mx-auto mt-16 max-w-sm px-4 text-center')}>
            <span className={adminTw('mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-500')}><DashboardIcon name={STAFF_NAVIGATION.find((item) => item.name === section)?.icon} size={25} /></span>
            <h2 className={adminTw('text-lg font-semibold text-stone-900')}>{section}</h2>
            <p className={adminTw('mt-1 text-sm text-stone-500')}>This section isn’t available yet.</p>
          </section>
        )}
      </main>

      {toast && (
        <div className={adminTw('fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl')} role="status">
          <DashboardIcon name={toast.canUndo ? 'trash' : 'check'} size={16} />
          <span>{toast.message}</span>
          {toast.canUndo && deletedItem && <button type="button" className={adminTw('inline-flex items-center gap-2 font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-70')} onClick={undoDelete} disabled={undoing}>{undoing && <StaffSpinner className="size-3" />}{undoing ? 'Restoring…' : 'Undo'}</button>}
        </div>
      )}
      {addDialogOpen && <MenuItemDialog onClose={() => setAddDialogOpen(false)} onSave={saveItem} />}
      {editingItem && <MenuItemDialog item={editingItem} onClose={() => setEditingItem(null)} onSave={saveItem} />}
      {pendingDelete && <MenuDeleteDialog item={pendingDelete} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} loading={deleting} />}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}