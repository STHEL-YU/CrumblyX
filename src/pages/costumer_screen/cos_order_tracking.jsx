import { useEffect, useState } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

const trackingSteps = [
  { title: 'Order placed', description: 'Your order has been sent to the café.' },
  { title: 'Preparing', description: 'The kitchen will start preparing your items.' },
  { title: 'Ready', description: 'Your order is ready for pickup or table delivery.' },
  { title: 'Completed', description: 'Your order has been completed. Thank you!' },
]

export default function CosOrderTracking({ order, onClose }) {
  const [currentOrder, setCurrentOrder] = useState(order)
  const [trackingError, setTrackingError] = useState('')

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    async function refreshOrder() {
      try {
        const response = await fetch(`/api/orders/get?id=${encodeURIComponent(order.id)}`, { signal: controller.signal })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not refresh order status.')
        if (!controller.signal.aborted) {
          setCurrentOrder(data)
          setTrackingError('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setTrackingError(error.message)
      }
    }

    refreshOrder()
    const timer = window.setInterval(refreshOrder, 10000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [order.id])

  const currentStep = { new: 0, preparing: 1, ready: 2, completed: 3 }[currentOrder.status] ?? 0

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
          <p>Order #{currentOrder.id}</p>
        </header>

        <div className="tracking-content">
          <div className="tracking-summary">
            <span>{currentOrder.mode === 'dine-in' ? `Dine in · Table ${currentOrder.tableNumber}` : 'Takeout'}</span>
            <strong>₱ {Number(currentOrder.total).toFixed(2)}</strong>
          </div>
          <div className="tracking-items">
            {currentOrder.items.map((item) => (
              <div className="tracking-item" key={item.id}>
                <span>{item.quantity} × {item.name}</span>
                <strong>₱ {(Number(item.price) * item.quantity).toFixed(2)}</strong>
                {item.customization && <small>{item.customization}</small>}
              </div>
            ))}
          </div>

          <ol className="tracking-steps" aria-label="Order status">
            {trackingSteps.map((step, index) => (
              <li className={index <= currentStep ? 'current' : ''} key={step.title}>
                <span className="tracking-step-marker">{index <= currentStep ? <Icon name="check" size={13} /> : index + 1}</span>
                <span className="tracking-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
              </li>
            ))}
          </ol>

          {trackingError
            ? <p className="tracking-note" role="status">Order saved. Status refresh failed: {trackingError}</p>
            : <p className="tracking-note">Order status updates automatically while this window is open.</p>}
        </div>
        <button className="tracking-done" type="button" onClick={onClose}>Back to menu</button>
      </section>
    </div>
  )
}
