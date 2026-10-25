import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

const ORDER_STATUS_LABELS = {
  new: 'Order placed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

export default function CustomerNotifications({ customerId, orders, ordersLoaded }) {
  const [isOpen, setIsOpen] = useState(false)
  const storageKey = `crumblyx-notifications-${customerId}`
  const seenMenuStorageKey = `crumblyx-seen-menu-${customerId}`
  const [notifications, setNotifications] = useState(() => readStoredArray(storageKey) || [])
  const seenMenuIds = useRef(null)
  const previousOrderStatuses = useRef(null)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notifications))
  }, [notifications, storageKey])

  useEffect(() => {
    const controller = new AbortController()

    async function checkForNewMenuItems() {
      try {
        const response = await fetch('/api/menu/list', { signal: controller.signal })
        const items = await response.json().catch(() => [])
        if (!response.ok || !Array.isArray(items) || controller.signal.aborted) return

        const storedIds = seenMenuIds.current || readStoredArray(seenMenuStorageKey)
        if (!storedIds) {
          const initialIds = items.map((item) => item.id).filter(Boolean)
          seenMenuIds.current = initialIds
          localStorage.setItem(seenMenuStorageKey, JSON.stringify(initialIds))
          return
        }

        const knownIds = new Set(storedIds)
        const newItems = items.filter((item) => item.available && item.id && !knownIds.has(item.id))
        const allIds = [...new Set([...storedIds, ...items.map((item) => item.id).filter(Boolean)])]
        seenMenuIds.current = allIds
        localStorage.setItem(seenMenuStorageKey, JSON.stringify(allIds))

        if (newItems.length) {
          const addedNotifications = newItems.map((item) => ({
            id: `menu:${item.id}`,
            title: 'New on the menu',
            message: `${item.name} is now available to order.`,
            read: false,
            createdAt: new Date().toISOString(),
          }))
          setNotifications((current) => [
            ...addedNotifications.filter((added) => !current.some((item) => item.id === added.id)),
            ...current,
          ])
        }
      } catch {
        // Notifications can retry on the next poll if the menu request fails.
      }
    }

    checkForNewMenuItems()
    const timer = window.setInterval(checkForNewMenuItems, 30000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [seenMenuStorageKey])

  useEffect(() => {
    if (!ordersLoaded) return

    const currentStatuses = new Map(orders.map((order) => [order.id, order.status]))
    const previousStatuses = previousOrderStatuses.current
    if (previousStatuses) {
      const updates = []
      for (const order of orders) {
        const previousStatus = previousStatuses.get(order.id)
        if (!previousStatus || previousStatus === order.status) continue
        const statusLabel = ORDER_STATUS_LABELS[order.status] || 'updated'
        updates.push({
          id: `order:${order.id}:${order.status}`,
          title: `Order ${statusLabel.toLowerCase()}`,
          message: `Order #${order.id} is now ${statusLabel.toLowerCase()}.`,
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      if (updates.length) {
        setNotifications((current) => [
          ...updates.filter((update) => !current.some((item) => item.id === update.id)),
          ...current,
        ])
      }
    }
    previousOrderStatuses.current = currentStatuses
  }, [orders, ordersLoaded])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function markAsRead(id) {
    setNotifications((items) =>
      items.map((item) => item.id === id ? { ...item, read: true } : item),
    )
  }

  function markAllAsRead() {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })))
  }

  return (
    <>
      <button
        className="header-icon notification-trigger"
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-controls="customer-notifications"
        onClick={() => setIsOpen(true)}
      >
        <Icon name="bell" />
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-backdrop" onClick={() => setIsOpen(false)}>
          <section
            className="notification-panel"
            id="customer-notifications"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-notifications-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="notification-header">
              <div>
                <h2 id="customer-notifications-title">Notifications</h2>
                <p>{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p>
              </div>
              <button className="close-button notification-close" type="button" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </header>

            {unreadCount > 0 && (
              <button className="mark-notifications-read" type="button" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}

            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="notification-empty">You don&apos;t have any notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <button
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    type="button"
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <span className="notification-icon"><Icon name="bell" size={17} /></span>
                    <span className="notification-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'CrumblyX notice'}</small>
                    </span>
                    {!notification.read && <i className="notification-unread-dot" aria-label="Unread" />}
                  </button>
                ))
              )}
            </div>
            <p className="notification-footnote">New menu items and order status updates appear here.</p>
          </section>
        </div>
      )}
    </>
  )
}
