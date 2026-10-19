import { useEffect } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

const trackingSteps = [
  { title: 'Order placed', description: 'Your order has been saved in this session.' },
  { title: 'Accepted by staff', description: 'Waiting for the shop to accept your order.' },
  { title: 'Preparing', description: 'The kitchen will start preparing your items.' },
  { title: 'Ready', description: 'Your order is ready for pickup or table delivery.' },
]

export default function CosOrderTracking({ order, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="tracking-backdrop" onClick={onClose}>
      <section
        className="tracking-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-tracking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="tracking-header">
          <span className="tracking-success-icon"><Icon name="cart" size={24} /></span>
          <button className="close-button tracking-close" type="button" aria-label="Close order tracking" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
          <h2 id="order-tracking-title">Order placed</h2>
          <p>Order #{order.id}</p>
        </header>

        <div className="tracking-content">
          <div className="tracking-summary">
            <span>{order.mode === 'dine-in' ? `Dine in · Table ${order.tableNumber}` : 'Takeout'}</span>
            <strong>₱ {order.total}</strong>
          </div>
          <div className="tracking-items">
            {order.items.map((item) => (
              <div className="tracking-item" key={item.id}>
                <span>{item.quantity} × {item.name}</span>
                <strong>₱ {item.price * item.quantity}</strong>
                {item.customization && <small>{item.customization}</small>}
              </div>
            ))}
          </div>

          <ol className="tracking-steps" aria-label="Order status">
            {trackingSteps.map((step, index) => (
              <li className={index === 0 ? 'current' : ''} key={step.title}>
                <span className="tracking-step-marker">{index === 0 ? <Icon name="check" size={13} /> : index + 1}</span>
                <span className="tracking-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
              </li>
            ))}
          </ol>

          <p className="tracking-note">
            This is a local order preview. Live kitchen and staff status updates aren&apos;t connected yet.
          </p>
        </div>
        <button className="tracking-done" type="button" onClick={onClose}>Back to menu</button>
      </section>
    </div>
  )
}
