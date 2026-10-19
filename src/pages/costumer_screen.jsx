import { useEffect, useMemo, useState } from 'react'
import '../App.css'

const coffeePhoto =
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=85'

const products = [
  {
    id: 'matcha-cookie',
    name: 'Matcha Cookies',
    price: 50,
    category: 'Pastries',
    description: 'Buttery, soft-baked cookies with a delicate matcha finish.',
    image:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 'caramel-latte',
    name: 'Caramel Latte Macchiato',
    price: 150,
    category: 'Beverages',
    description: 'Espresso layered with velvety milk and house-made caramel.',
    image:
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1000&q=85',
    customizable: true,
  },
]

const addons = [
  { id: 'caramel', name: 'Extra Caramel Shot', price: 30 },
  { id: 'cream', name: 'Whipped Cream', price: 25 },
  { id: 'oat', name: 'Oat Milk Upgrade', price: 25 },
]

function Icon({ name, size = 20, className = '' }) {
  const shared = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }

  const paths = {
    cookie: <><path d="M20.3 13.2A8.5 8.5 0 0 1 10.8 3.7 8.5 8.5 0 1 0 20.3 13.2Z" /><path d="M15.3 4.2a3 3 0 0 0 4.5 3.5 3 3 0 0 0 2.1 4.1" /><circle cx="8.5" cy="11" r=".7" fill="currentColor" /><circle cx="12" cy="17" r=".7" fill="currentColor" /><circle cx="6.4" cy="15.2" r=".7" fill="currentColor" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.7-.8L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    cart: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v2M14 20h2M20 19v2M18 17h3" /></>,
    pastry: <><path d="M4 16.5c0-3.7 3.6-6.5 8-6.5s8 2.8 8 6.5c0 2-3.6 3.5-8 3.5s-8-1.5-8-3.5Z" /><path d="M6 10.5C6.6 8 9 6 12 6s5.4 2 6 4.5M9 6.7l-1-2M12 6V3.5M15 6.7l1-2" /></>,
    cup: <><path d="M5 8h12l-1 12H6L5 8ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 5c0-1 1-1.4 1-2.5M12 5c0-1 1-1.4 1-2.5" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.4 0 10 6 10 6a16 16 0 0 1-3.2 3.7M6.2 6.3C3.5 8 2 12 2 12s3.6 6 10 6c1 0 1.9-.2 2.8-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    google: <><path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.7h4.8a4.2 4.2 0 0 1-1.8 2.7v2.3h3c1.7-1.6 2.5-4 2.5-6.7Z" /><path d="M12 21c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.5-1.8.8-2.9.8a5.6 5.6 0 0 1-5.3-3.9h-3v2.4A9 9 0 0 0 12 21Z" /><path d="M6.7 13.5a5.3 5.3 0 0 1 0-3V8.1h-3a9 9 0 0 0 0 7.8l3-2.4Z" /><path d="M12 6.6c1.3 0 2.5.5 3.4 1.4L18 5.4A8.8 8.8 0 0 0 12 3a9 9 0 0 0-8.3 5.1l3 2.4A5.6 5.6 0 0 1 12 6.6Z" /></>,
    apple: <path d="M16.7 12.8c0-2.3 1.8-3.4 1.9-3.5a4.2 4.2 0 0 0-3.3-1.8c-1.4-.2-2.7.8-3.4.8s-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7c1.3 0 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4 4 0 0 1-2.7-3.5ZM14.5 6a4 4 0 0 0 .9-3 4.2 4.2 0 0 0-2.7 1.4 3.8 3.8 0 0 0-.9 2.9 3.5 3.5 0 0 0 2.7-1.3Z" />,
    facebook: <path d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V10H7v3h3v8h4Z" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M5 20c3-5 6-7 12-10" /></>,
  }

  return <svg {...shared}>{paths[name] || paths.cup}</svg>
}

function Logo({ small = false }) {
  return (
    <span className={`logo-mark ${small ? 'logo-mark-small' : ''}`} aria-label="CrumblyX cookie logo">
      <Icon name="cookie" size={small ? 21 : 31} />
      <span className="logo-spoon" />
    </span>
  )
}

function Est() {
  return <span className="est-label">EST. 2026</span>
}

export default function CustomerScreen() {
  const [screen, setScreen] = useState('welcome')
  const [category, setCategory] = useState('All Items')
  const [selected, setSelected] = useState(null)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [coffeeType, setCoffeeType] = useState('ICED')
  const [cupSize, setCupSize] = useState('MEDIUM')
  const [sugar, setSugar] = useState('50%')
  const [selectedAddons, setSelectedAddons] = useState([])
  const [instruction, setInstruction] = useState('')
  const [showPasswords, setShowPasswords] = useState({})
  const [rememberMe, setRememberMe] = useState(true)
  const [tableNumber] = useState(() => new URLSearchParams(window.location.search).get('table') || '3')

  useEffect(() => {
    if (screen !== 'splash') return undefined
    const timer = window.setTimeout(() => setScreen('signin'), 1700)
    return () => window.clearTimeout(timer)
  }, [screen])

  const visibleProducts = useMemo(() => {
    if (category === 'All Items') return products
    return products.filter((product) => product.category === category)
  }, [category])
  const categoryOptions = ['All Items', 'Pastries', 'Beverages']
  const orderedCategories = categoryOptions.includes(category)
    ? [category, ...categoryOptions.filter((item) => item !== category)]
    : categoryOptions
  const addonTotal = selectedAddons.reduce(
    (sum, addonId) => sum + (addons.find((addon) => addon.id === addonId)?.price || 0),
    0,
  )
  const sizeAdjustment = cupSize === 'SMALL' ? -20 : cupSize === 'LARGE' ? 30 : 0
  const unitTotal = selected
    ? Math.max(0, selected.price + (selected.customizable ? addonTotal + sizeAdjustment : 0))
    : 0
  const orderTotal = unitTotal * quantity
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  function startItem(product) {
    setSelected(product)
    setQuantity(1)
    setCoffeeType('ICED')
    setCupSize('MEDIUM')
    setSugar('50%')
    setSelectedAddons([])
    setInstruction('')
  }

  function addToCart() {
    if (!selected) return
    setCart((items) => [
      ...items,
      {
        id: `${selected.id}-${Date.now()}`,
        name: selected.name,
        quantity,
        price: unitTotal,
        image: selected.image,
        customization: selected.customizable
          ? [
              coffeeType.toLowerCase(),
              cupSize.toLowerCase(),
              `${sugar} sugar`,
              ...selectedAddons.map((addonId) => addons.find((addon) => addon.id === addonId)?.name),
              instruction.trim(),
            ].filter(Boolean).join(', ')
          : '',
      },
    ])
    setSelected(null)
  }

  function toggleAddon(id) {
    setSelectedAddons((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    )
  }

  function togglePassword(name) {
    setShowPasswords((values) => ({ ...values, [name]: !values[name] }))
  }

  function setCategoryAndScroll(nextCategory) {
    setCategory(nextCategory)
    document.querySelector('.menu-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app-shell">
      {(screen === 'welcome' || screen === 'splash' || screen === 'signin' || screen === 'signup') && (
        <div className="auth-scene">
          <div className="scene-photo" style={{ backgroundImage: `url("${coffeePhoto}")` }} />
          <div className="scene-shade" />
          <Est />

          {screen === 'welcome' && (
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
              <button className="skip-link" onClick={() => setScreen('splash')}>Skip now</button>
              <div className="pagination-dots"><i className="active" /><i /><i /></div>
            </section>
          )}

          {screen === 'splash' && (
            <section className="splash-screen">
              <Logo />
              <p>CrumblyX</p>
            </section>
          )}

          {(screen === 'signin' || screen === 'signup') && (
            <>
              <header className="auth-header">
                <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
              </header>
              <section className={`auth-card ${screen === 'signup' ? 'signup-card' : ''}`}>
                <h1>{screen === 'signin' ? 'Welcome Back!' : 'Create an account'}</h1>
                <p className="auth-subtitle">{screen === 'signin' ? 'Sign In to continue' : 'Sign Up to continue'}</p>
                <form onSubmit={(event) => { event.preventDefault(); setScreen('menu') }}>
                  {screen === 'signup' && (
                    <label className="auth-field">
                      <span>Username:</span>
                      <input type="text" placeholder="Choose a username" autoComplete="username" required />
                    </label>
                  )}
                  <label className="auth-field">
                    <span>Email:</span>
                    <input type="email" placeholder="Jonhdoe@example.com" autoComplete="email" required />
                  </label>
                  {['Password', ...(screen === 'signup' ? ['Confirm Password'] : [])].map((field) => (
                    <label className="auth-field" key={field}>
                      <span>{field}:</span>
                      <span className="password-input-wrap">
                        <input
                          type={showPasswords[field] ? 'text' : 'password'}
                          placeholder={field === 'Password' ? 'Enter your password' : 'Confirm your password'}
                          autoComplete={field === 'Password' ? (screen === 'signup' ? 'new-password' : 'current-password') : 'new-password'}
                          required
                        />
                        <button className="password-toggle" type="button" aria-label={`Toggle ${field.toLowerCase()} visibility`} onClick={() => togglePassword(field)}>
                          <Icon name={showPasswords[field] ? 'eyeOff' : 'eye'} size={18} />
                        </button>
                      </span>
                    </label>
                  ))}
                  <button className="auth-submit" type="submit">{screen === 'signin' ? 'Sign In' : 'Sign Up'}</button>
                </form>
                {screen === 'signin' && (
                  <div className="auth-options">
                    <label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>Remember Me</span></label>
                    <button className="text-link" type="button">Forgot password?</button>
                  </div>
                )}
                <p className="auth-switch">
                  {screen === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button className="text-link" onClick={() => setScreen(screen === 'signin' ? 'signup' : 'signin')}>
                    {screen === 'signin' ? 'Sign up' : 'Sign In'}
                  </button>
                </p>
                <div className="social-divider"><span />{screen === 'signin' ? 'or sign in with' : 'or sign up with'}<span /></div>
                <div className="social-buttons">
                  {['google', 'apple', 'facebook'].map((social) => (
                    <button type="button" aria-label={`Continue with ${social}`} key={social}><Icon name={social} size={19} /></button>
                  ))}
                </div>
              </section>
              <p className="auth-wordmark">CrumblyX</p>
            </>
          )}
        </div>
      )}

      {screen === 'menu' && (
        <div className="menu-screen">
          <header className="menu-header">
            <button className="header-brand" onClick={() => setScreen('menu')} aria-label="CrumblyX home">
              <Logo small /><span>CrumblyX</span>
            </button>
            <div className="header-actions">
              <button className="header-icon" aria-label="Live chat"><Icon name="chat" /></button>
              <button className="header-icon" aria-label="Notifications"><Icon name="bell" /></button>
              <button className="header-icon cart-trigger" aria-label={`Open cart, ${cartCount} items`} onClick={() => setCartOpen(true)}>
                <Icon name="cart" />
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </button>
            </div>
          </header>
          <div className="menu-scroll">
            <div className="menu-content">
              <section className="table-banner">
                <span className="qr-icon"><Icon name="qr" size={25} /></span>
                <div><strong>QR Table Ordering Active</strong><p>You&apos;re seated at Table {tableNumber}. Your order will be brought directly to you.</p></div>
                <span className="online-dot" />
              </section>

              <section className="menu-intro">
                <p className="eyebrow"><Icon name="leaf" size={15} /> FRESH DAILY</p>
                <h1>Our Menu</h1>
                <p>Handcrafted pastries and specialty drinks, made with love every morning</p>
              </section>

              <nav className="category-row" aria-label="Menu categories">
                {orderedCategories.map((item) => (
                  <button
                    className={`category-chip ${category === item ? 'selected' : ''}`}
                    key={item}
                    onClick={() => setCategoryAndScroll(item)}
                  >
                    <Icon name={item === 'All Items' ? 'leaf' : item === 'Pastries' ? 'pastry' : 'cup'} size={16} />
                    {item}
                  </button>
                ))}
              </nav>

              <div className="product-list">
                {visibleProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <button className="product-photo-wrap" onClick={() => startItem(product)} aria-label={`View ${product.name}`}>
                      <img src={product.image} alt={product.name} className="product-photo" />
                      {product.customizable && <span className="custom-badge"><i /> Customizable</span>}
                    </button>
                    <div className="product-details">
                      <div className="product-title-line"><h2>{product.name}</h2><strong>₱ {product.price}</strong></div>
                      <p>{product.description}</p>
                      <button className="add-order-button" onClick={() => startItem(product)}><Icon name="plus" size={17} /> Add to order</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && screen === 'menu' && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <section className={`item-sheet ${selected.customizable ? 'custom-sheet' : ''}`} role="dialog" aria-modal="true" aria-label={`${selected.name} details`} onClick={(event) => event.stopPropagation()}>
            <div className="sheet-scroll">
              <div className="detail-photo-wrap">
                <img src={selected.image} alt={selected.name} />
                <button className="close-button" aria-label="Close item details" onClick={() => setSelected(null)}><Icon name="close" size={20} /></button>
                {selected.customizable && <span className="custom-badge detail-badge"><i /> Customizable</span>}
              </div>
              <div className="detail-content">
                <div className="detail-title-line"><h2>{selected.name}</h2><strong>₱ {selected.price}</strong></div>
                <p className="detail-description">{selected.description}</p>
                {selected.customizable && (
                  <div className="custom-options">
                    <OptionGroup label="TYPE OF COFFEE" options={['ICED', 'HOT']} value={coffeeType} onChange={setCoffeeType} />
                    <OptionGroup label="CUP SIZE" options={['SMALL', 'MEDIUM', 'LARGE']} value={cupSize} onChange={setCupSize} />
                    <OptionGroup label="SUGAR LEVEL" options={['0%', '25%', '50%', '75%', '100%']} value={sugar} onChange={setSugar} />
                    <fieldset className="addon-group">
                      <legend>ADD ONS</legend>
                      {addons.map((addon) => (
                        <label className="addon-row" key={addon.id}>
                          <input type="checkbox" checked={selectedAddons.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                          <span>{addon.name}</span><strong>+ ₱ {addon.price}</strong>
                        </label>
                      ))}
                    </fieldset>
                    <label className="instruction-field"><span>SPECIAL INSTRUCTION</span><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="E.g. no sugar on top, extra hot, allergy notes..." rows={3} /></label>
                  </div>
                )}
              </div>
            </div>
            <div className="sheet-action-bar">
              <div className="quantity-stepper">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Icon name="minus" size={17} /></button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity"><Icon name="plus" size={17} /></button>
              </div>
              <button className="add-cart-button" onClick={addToCart}>Add ₱ {orderTotal} to Cart</button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && screen === 'menu' && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your cart" onClick={(event) => event.stopPropagation()}>
            <header className="drawer-header"><h2>Your cart</h2><button className="close-button drawer-close" aria-label="Close cart" onClick={() => setCartOpen(false)}><Icon name="close" size={20} /></button></header>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-cart-icon"><Icon name="cart" size={32} /></span>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items from our menu</p>
                <button onClick={() => setCartOpen(false)}>Browse Menu</button>
              </div>
            ) : (
              <div className="filled-cart">
                <div className="cart-items">
                  {cart.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <img src={item.image} alt="" />
                      <div><strong>{item.name}</strong><p>{item.quantity} × ₱ {item.price}{item.customization && <small>{item.customization}</small>}</p></div>
                    </article>
                  ))}
                </div>
                <div className="cart-total"><span>Total</span><strong>₱ {cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</strong></div>
                <button className="browse-button" onClick={() => setCartOpen(false)}>Browse Menu</button>
              </div>
            )}
            <p className="drawer-footnote">CrumblyX · Freshly baked, just for you</p>
          </aside>
        </div>
      )}
    </main>
  )
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="option-group">
      <legend>{label}</legend>
      <div className="option-pills">
        {options.map((option) => (
          <button type="button" className={value === option ? 'active' : ''} onClick={() => onChange(option)} key={option}>{option}</button>
        ))}
      </div>
    </fieldset>
  )
}
