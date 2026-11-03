import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon } from './staff_admin_shared.jsx'
import { adminTw } from './staff_admin_tw.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'

export default function Sidebar({
  activeRoute,
  drawerOpen,
  onNavigate,
  onClose,
  profileOpen,
  onOpenProfile,
  onLogout,
}) {
  return (
    <>
      <button
        className={adminTw(`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`)}
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
      />
      <aside
        className={adminTw(`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`)}
        aria-label="Staff navigation"
      >
        <div className={adminTw('admin-brand')}>
          <Logo small />
          <span>CrumblyX</span>
          <button
            type="button"
            className={adminTw('admin-drawer-close')}
            aria-label="Close menu"
            onClick={onClose}
          >
            <DashboardIcon name="close" />
          </button>
        </div>
        <p className={adminTw('staff-sidebar-label')}>WORKSPACE</p>
        <nav className={adminTw('admin-nav')} aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.name}
              className={adminTw(`admin-nav-item ${activeRoute === item.name ? 'active' : ''}`)}
              aria-current={activeRoute === item.name ? 'page' : undefined}
              onClick={() => onNavigate(item.name)}
            >
              <DashboardIcon name={item.icon} />
              <span>{item.name}</span>
              {activeRoute === item.name && (
                <span className={adminTw('staff-sidebar-active-dot')} aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
        <div className={adminTw('admin-account')}>
          <div className={adminTw('admin-side-divider')} />
          <div className={adminTw('admin-user')}>
            <button
              type="button"
              className={adminTw('admin-avatar admin-avatar-trigger')}
              aria-label="View staff profile for John Doe"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={onOpenProfile}
            >
              JD
            </button>
            <span className={adminTw('admin-user-copy')}>
              <strong>John Doe</strong>
              <small>doe@example.com</small>
            </span>
            <button
              type="button"
              className={adminTw('admin-logout')}
              aria-label="Log out"
              title="Log out"
              onClick={onLogout}
            >
              <DashboardIcon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
