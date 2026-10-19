import { Est } from './customer_ui.jsx'

const coffeePhoto =
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=85'

export default function CustomerAuthScene({ children }) {
  return (
    <div className="auth-scene">
      <div className="scene-photo" style={{ backgroundImage: `url("${coffeePhoto}")` }} />
      <div className="scene-shade" />
      <Est />
      {children}
    </div>
  )
}
