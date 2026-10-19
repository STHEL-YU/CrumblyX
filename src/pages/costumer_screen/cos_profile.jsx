import { useEffect } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

export default function CosProfile({ customer, order, onClose, onLogout, onTrackOrder }) {

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="profile-backdrop" onClick={onClose}>
      <section
        className="profile-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-header">
          <h2 id="customer-profile-title">My Profile</h2>
          <button className="close-button profile-close" type="button" aria-label="Close profile" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="profile-details">
          <span className="profile-avatar"><Icon name="user" size={30} /></span>
          <h3>{customer.name || 'Customer'}</h3>
          <p className="profile-caption">Customer account</p>
          <dl>
            <div><dt>Name</dt><dd>{customer.name || 'Not provided'}</dd></div>
            <div><dt>Email</dt><dd>{customer.email || 'Not provided'}</dd></div>
          </dl>
        </div>
        {order && (
          <section className="profile-order" aria-labelledby="profile-order-title">
            <div className="profile-order-heading">
              <span className="profile-order-status"><i /> In progress</span>
              <strong>#{order.id}</strong>
            </div>
            <h3 id="profile-order-title">Active order</h3>
            <p>
              {order.mode === 'dine-in' ? `Dine in · Table ${order.tableNumber}` : 'Takeout'}
              {' · '}₱ {order.total}
            </p>
            <button type="button" onClick={onTrackOrder}>Track order</button>
          </section>
        )}
        <button className="profile-logout" type="button" onClick={onLogout}>
          <Icon name="arrow" size={17} />
          Log out
        </button>
      </section>
    </div>
  )
}
