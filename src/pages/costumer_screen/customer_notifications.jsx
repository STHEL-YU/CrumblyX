import { useEffect, useState } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

const initialNotifications = [
  {
    id: 'table-ordering',
    title: 'Table ordering is ready',
    message: 'You can browse the menu and place an order for your table.',
    read: false,
  },
  {
    id: 'welcome',
    title: 'Welcome to CrumblyX',
    message: 'Fresh pastries and specialty drinks are waiting for you.',
    read: false,
  },
]

export default function CustomerNotifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = notifications.filter((notification) => !notification.read).length

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
                      <small>CrumblyX notice</small>
                    </span>
                    {!notification.read && <i className="notification-unread-dot" aria-label="Unread" />}
                  </button>
                ))
              )}
            </div>
            <p className="notification-footnote">These are app notices. Live order and staff updates aren&apos;t connected yet.</p>
          </section>
        </div>
      )}
    </>
  )
}
