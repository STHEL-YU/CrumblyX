import { Icon, Logo } from '../../components/customer_ui.jsx'

export default function CosOrderType({ onDineIn, onTakeout }) {
  return (
    <>
      <header className="auth-header">
        <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
      </header>
      <section className="order-type-card">
        <p className="eyebrow"><Icon name="leaf" size={15} /> YOUR ORDER</p>
        <h1>How would you like to enjoy your order?</h1>
        <p className="order-type-subtitle">Choose dine-in or takeout to continue.</p>
        <button className="order-type-option" type="button" onClick={onDineIn}>
          <span className="order-type-icon"><Icon name="qr" size={25} /></span>
          <span className="order-type-copy">
            <strong>Dine In</strong>
            <span>Scan the QR code at your table</span>
          </span>
          <Icon name="arrow" size={19} />
        </button>
        <button className="order-type-option" type="button" onClick={onTakeout}>
          <span className="order-type-icon"><Icon name="cup" size={25} /></span>
          <span className="order-type-copy">
            <strong>Take Out</strong>
            <span>Order ahead and pick it up</span>
          </span>
          <Icon name="arrow" size={19} />
        </button>
      </section>
      <p className="auth-wordmark">CrumblyX</p>
    </>
  )
}
