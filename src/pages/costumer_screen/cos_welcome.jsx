import { Logo } from '../../components/customer_ui.jsx'

export default function CosWelcome({ onContinue }) {
  return (
    <section className="welcome-screen">
      <div className="welcome-brand">
        <Logo />
        <p className="welcome-name">CrumblyX</p>
        <p className="welcome-subtitle">Pastries &amp; Specialty Coffee</p>
      </div>
      <p className="welcome-tagline">
        Order at your table, customize your drink, and chat with our staff — all in one place.
      </p>
      <div className="feature-grid">
        {['QR Table Ordering', 'Drink Customization', 'Live Chat', 'Takeout & Delivery'].map(
          (feature) => <span className="feature-pill" key={feature}>{feature}</span>,
        )}
      </div>
      <p className="welcome-footer">Freshly baked every morning · Open daily 7 AM – 9 PM</p>
      <button className="skip-link" onClick={onContinue}>Skip now</button>
      <div className="pagination-dots"><i className="active" /><i /><i /></div>
    </section>
  )
}
