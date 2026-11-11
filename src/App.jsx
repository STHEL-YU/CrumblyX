import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import CustomerAuthScene from './components/customer_auth_scene.jsx'
import SplashScreen from './components/splashscreen.jsx'
import CustomerLogin from './pages/costumer_screen/auth/cos_login.jsx'
import CustomerSignup from './pages/costumer_screen/auth/cos_signup.jsx'
import CosHome from './pages/costumer_screen/cos_home.jsx'
import CosOrderType from './pages/costumer_screen/cos_order_type.jsx'
import CosTableScanner from './pages/costumer_screen/cos_table_scanner.jsx'
import CosTableBooking from './pages/costumer_screen/cos_table_booking.jsx'
import CosWelcome from './pages/costumer_screen/cos_welcome.jsx'
import StaffLogin from './pages/admin_screen/auth/staff_login.jsx'
import StaffAuthGate from './pages/admin_screen/auth/staff_auth_gate.jsx'
import StaffDashboard from './pages/admin_screen/staff_dashboard.jsx'
import StaffOrders from './pages/admin_screen/staff_order.jsx'
import StaffMenu from './pages/admin_screen/staff_menu.jsx'
import StaffStock from './pages/admin_screen/staff_stock.jsx'
import StaffTables from './pages/admin_screen/staff_tables.jsx'
import StaffCustomers from './pages/admin_screen/staff_costumer.jsx'
import StaffSales from './pages/admin_screen/staff_sales.jsx'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname.replace(/\/+$/, '') || '/'

  function completeAuthentication(customer) {
    sessionStorage.setItem('crumblyx-customer-id', customer.id)
    sessionStorage.setItem('crumblyx-customer-name', customer.name)
    sessionStorage.setItem('crumblyx-customer-email', customer.email)
    const returnTo = location.state?.returnTo
    const isInternalCustomerRoute = typeof returnTo === 'string'
      && returnTo.startsWith('/')
      && !returnTo.startsWith('//')
      && !returnTo.startsWith('/staff/')
    navigate(isInternalCustomerRoute ? returnTo : '/order-type', { replace: true })
  }

  async function completeStaffAuthentication(credentials) {
    const response = await fetch('/api/staff-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to sign in.')
    navigate('/staff/dashboard', { replace: true })
  }

  return (
    <div className={`app-shell ${currentPath.startsWith('/staff/') ? 'staff-shell' : ''}`}>
      <Routes>
        <Route path="/staff/login" element={<StaffLogin onSubmit={completeStaffAuthentication} />} />
        <Route path="/staff/dashboard" element={<StaffAuthGate><StaffDashboard /></StaffAuthGate>} />
        <Route path="/staff/orders" element={<StaffAuthGate><StaffOrders /></StaffAuthGate>} />
        <Route path="/staff/sales" element={<StaffAuthGate><StaffSales /></StaffAuthGate>} />
        <Route path="/staff/menu" element={<StaffAuthGate><StaffMenu /></StaffAuthGate>} />
        <Route path="/staff/stocks" element={<StaffAuthGate><StaffStock /></StaffAuthGate>} />
        <Route path="/staff/tables" element={<StaffAuthGate><StaffTables /></StaffAuthGate>} />
        <Route path="/staff/customers" element={<StaffAuthGate><StaffCustomers /></StaffAuthGate>} />
        <Route path="/book-table" element={<CustomerAuthScene><CosTableBooking /></CustomerAuthScene>} />
        <Route
          path="/"
          element={
            <CustomerAuthScene>
              <CosWelcome onContinue={() => navigate('/login')} />
            </CustomerAuthScene>
          }
        />
        <Route
          path="/splash"
          element={
            <CustomerAuthScene>
              <SplashRoute />
            </CustomerAuthScene>
          }
        />
        <Route
          path="/login"
          element={
            <CustomerAuthScene>
              <CustomerLogin
                onSubmit={completeAuthentication}
                onSwitch={() => navigate('/register', { state: location.state })}
              />
            </CustomerAuthScene>
          }
        />
        <Route
          path="/register"
          element={
            <CustomerAuthScene>
              <CustomerSignup
                onSubmit={completeAuthentication}
                onSwitch={() => navigate('/login', { state: location.state })}
              />
            </CustomerAuthScene>
          }
        />
        <Route
          path="/order-type"
          element={
            <CustomerOnly>
              <CustomerAuthScene>
                <CosOrderType
                  customer={{
                    id: sessionStorage.getItem('crumblyx-customer-id') || '',
                    name: sessionStorage.getItem('crumblyx-customer-name') || '',
                    email: sessionStorage.getItem('crumblyx-customer-email') || '',
                  }}
                  onDineIn={(destination) => navigate(
                    destination.type === 'booking'
                      ? `/book-table?id=${encodeURIComponent(destination.id)}`
                      : `/home?mode=dine-in&table=${encodeURIComponent(destination.tableName)}`,
                  )}
                  onTakeout={() => navigate('/home?mode=takeout')}
                />
              </CustomerAuthScene>
            </CustomerOnly>
          }
        />
        <Route
          path="/scan-table"
          element={
            <CustomerOnly>
              <CustomerAuthScene>
                <CosTableScanner
                  onTableFound={(destination) => navigate(
                    destination.type === 'booking'
                      ? `/book-table?id=${encodeURIComponent(destination.id)}`
                      : `/home?mode=dine-in&table=${encodeURIComponent(destination.tableName)}`,
                  )}
                  onBack={() => navigate('/order-type')}
                />
              </CustomerAuthScene>
            </CustomerOnly>
          }
        />
        <Route path="/home" element={<CustomerOnly><CosHome /></CustomerOnly>} />
        <Route path="*" element={<Navigate to={currentPath === '/menu' ? '/home' : '/'} replace />} />
      </Routes>
    </div>
  )
  
}

function CustomerOnly({ children }) {
  const location = useLocation()
  const hasCustomerSession = Boolean(
    sessionStorage.getItem('crumblyx-customer-id')
    && sessionStorage.getItem('crumblyx-customer-email'),
  )

  const returnTo = `${location.pathname}${location.search}${location.hash}`
  return hasCustomerSession
    ? children
    : <Navigate to="/login" state={{ returnTo }} replace />
}

function SplashRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 1700)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return <SplashScreen />
}
