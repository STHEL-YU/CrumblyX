import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/customer_ui.jsx'
import { DashboardIcon, StaffProfileDialog } from './staff_admin_shared.jsx'
import { useStaffProfile } from './staff_profile.js'
import { STAFF_NAVIGATION } from './staff_navigation.js'
import './staff_dashboard.css'

const DASHBOARD_DATA = {
  sales: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today'],
    series: [
      { name: 'Pastries', color: '#c4a06a', values: [34, 40, 29, 48, 37, 55, 46, 61] },
      { name: 'Coffee', color: '#91a65d', values: [26, 22, 35, 27, 42, 31, 38, 29] },
      { name: 'Other', color: '#f5ce91', values: [15, 19, 12, 16, 13, 14, 14, 10] },
    ],
  },
  resources: [
    { label: 'Ingredients', value: 256, color: '#c49a45' },
    { label: 'Packaging', value: 45, color: '#c4a06a' },
    { label: 'Equipment', value: 95, color: '#a97442' },
    { label: 'Staff tasks', value: 112, color: '#77964d' },
    { label: 'Other', value: 200, color: '#b5c77a' },
  ],
  customers: {
    old: [44, 28, 28],
    new: [31, 25, 44],
  },
  budget: {
    labels: ['Ingredients', 'Payroll', 'Rent', 'Utilities', 'Other'],
    lastMonth: [680, 490, 810, 310, 420],
    current: [745, 540, 810, 270, 495],
  },
  customerChange: [
    { label: 'Mon', value: 42 },
    { label: 'Tue', value: -22 },
    { label: 'Wed', value: 64 },
    { label: 'Thu', value: 18 },
    { label: 'Fri', value: -35 },
    { label: 'Sat', value: 82 },
    { label: 'Sun', value: 51 },
  ],
  chatMessages: [
    { name: 'Mia Santos', message: 'Can I reserve a table for two?', time: '2 min ago' },
    { name: 'Ethan Cruz', message: 'Is the matcha cookie available today?', time: '8 min ago' },
  ],
}

const palette = {
  coffee: '#6b4423',
  tan: '#c4a06a',
  olive: '#91a65d',
  peach: '#f5ce91',
  green: '#4caf50',
  blue: '#4db3f5',
  red: '#f0455a',
  grid: '#e8e4dc',
  muted: '#9b9389',
}

function ChartCard({ title, className = '', children }) {
  return (
    <section className={`dashboard-card ${className}`} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function SalesChart() {
  const chartWidth = 370
  const chartHeight = 188
  const left = 32
  const top = 12
  const bottom = 27
  const plotHeight = chartHeight - top - bottom
  const plotWidth = chartWidth - left - 4
  const barWidth = 22
  const gap = (plotWidth - barWidth * DASHBOARD_DATA.sales.labels.length) / (DASHBOARD_DATA.sales.labels.length - 1)
  const ticks = [0, 25, 50, 75, 100]
  return (
    <div className="chart-layout sales-layout">
      <div className="svg-chart-wrap">
        <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Stacked sales by day from zero to one hundred">
          {ticks.map((tick) => {
            const y = top + plotHeight - tick / 100 * plotHeight
            return <g key={tick}><line x1={left} x2={chartWidth} y1={y} y2={y} stroke={palette.grid} strokeDasharray="3 4" /><text x={left - 8} y={y + 3} textAnchor="end" className="chart-axis-label">{tick}</text></g>
          })}
          {DASHBOARD_DATA.sales.labels.map((label, index) => {
            let bottomValue = 0
            const x = left + index * (barWidth + gap)
            return (
              <g key={label}>
                {DASHBOARD_DATA.sales.series.map((series) => {
                  const value = series.values[index]
                  const height = value / 100 * plotHeight
                  const y = top + plotHeight - (bottomValue + value) / 100 * plotHeight
                  bottomValue += value
                  return <rect className="chart-bar-animated" key={series.name} x={x} y={y} width={barWidth} height={height} rx="3" fill={series.color}><title>{`${label}: ${series.name}, ${value}`}</title></rect>
                })}
                <text x={x + barWidth / 2} y={chartHeight - 7} textAnchor="middle" className="chart-axis-label">{label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <ul className="chart-legend">
        {DASHBOARD_DATA.sales.series.map((series) => <li key={series.name}><i style={{ background: series.color }} />{series.name}</li>)}
      </ul>
    </div>
  )
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = { x: cx + radius * Math.cos(startAngle), y: cy + radius * Math.sin(startAngle) }
  const end = { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) }
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function ResourcesChart() {
  const total = DASHBOARD_DATA.resources.reduce((sum, item) => sum + item.value, 0)
  const slices = DASHBOARD_DATA.resources.reduce((result, item) => {
    const endAngle = result.angle + item.value / total * Math.PI * 2
    result.slices.push({ ...item, startAngle: result.angle, endAngle })
    result.angle = endAngle
    return result
  }, { angle: -Math.PI / 2, slices: [] }).slices
  return (
    <div className="resources-layout">
      <div className="resource-pie-wrap">
        <svg className="resource-pie" viewBox="0 0 180 180" role="img" aria-label="Resources and tasks distribution">
          {slices.map((item) => {
            const path = describeArc(90, 90, 78, item.startAngle, item.endAngle)
            return <path key={item.label} d={path} fill={item.color} stroke="#fff" strokeWidth="2"><title>{`${item.label}: ${item.value}`}</title><animate attributeName="opacity" from="0" to="1" dur=".55s" fill="freeze" /></path>
          })}
          <circle cx="90" cy="90" r="43" fill="#fffefa" />
          <text x="90" y="86" textAnchor="middle" className="pie-total">{total}</text>
          <text x="90" y="103" textAnchor="middle" className="pie-caption">resources</text>
        </svg>
      </div>
      <ul className="resource-legend">
        {DASHBOARD_DATA.resources.map((item) => <li key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value}</strong></li>)}
      </ul>
    </div>
  )
}

function CustomerSegments({ data, label }) {
  return (
    <div className="customer-segments" role="img" aria-label={`${label}: ${data.join('%, ')}%`}>
      {data.map((segment, index) => <span key={index} style={{ width: `${segment}%` }} />)}
    </div>
  )
}

function BudgetChart() {
  const width = 370
  const height = 188
  const left = 36
  const top = 13
  const bottom = 31
  const plotHeight = height - top - bottom
  const plotWidth = width - left - 5
  const groupWidth = plotWidth / DASHBOARD_DATA.budget.labels.length
  const barWidth = 17
  const ticks = [0, 250, 500, 750, 1000]
  return (
    <div className="svg-chart-wrap">
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Budget comparison in dollars from zero to one thousand">
        {ticks.map((tick) => {
          const y = top + plotHeight - tick / 1000 * plotHeight
          return <g key={tick}><line x1={left} x2={width} y1={y} y2={y} stroke={palette.grid} strokeDasharray="3 4" /><text x={left - 7} y={y + 3} textAnchor="end" className="chart-axis-label">{tick}</text></g>
        })}
        {DASHBOARD_DATA.budget.labels.map((label, index) => {
          const center = left + groupWidth * (index + .5)
          const last = DASHBOARD_DATA.budget.lastMonth[index]
          const current = DASHBOARD_DATA.budget.current[index]
          return <g key={label}>
            <rect className="chart-bar-animated" x={center - barWidth - 2} y={top + plotHeight - last / 1000 * plotHeight} width={barWidth} height={last / 1000 * plotHeight} rx="3" fill={palette.tan}><title>{`Last month ${label}: ${last}`}</title></rect>
            <rect className="chart-bar-animated" x={center + 2} y={top + plotHeight - current / 1000 * plotHeight} width={barWidth} height={current / 1000 * plotHeight} rx="3" fill={palette.green}><title>{`Current ${label}: ${current}`}</title></rect>
            <text x={center} y={height - 8} textAnchor="middle" className="chart-axis-label">{label}</text>
          </g>
        })}
      </svg>
    </div>
  )
}

function ChangeChart() {
  const width = 370
  const height = 188
  const left = 34
  const right = 5
  const top = 12
  const bottom = 26
  const min = -50
  const max = 100
  const plotHeight = height - top - bottom
  const plotWidth = width - left - right
  const y = (value) => top + (max - value) / (max - min) * plotHeight
  const zeroY = y(0)
  const gap = plotWidth / DASHBOARD_DATA.customerChange.length
  return (
    <div className="svg-chart-wrap">
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily new customer change from minus fifty to one hundred">
        {[-50, 0, 50, 100].map((tick) => <g key={tick}><line x1={left} x2={width} y1={y(tick)} y2={y(tick)} stroke={palette.grid} strokeDasharray={tick === 0 ? '0' : '3 4'} strokeWidth={tick === 0 ? 1.5 : 1} /><text x={left - 7} y={y(tick) + 3} textAnchor="end" className="chart-axis-label">{tick}</text></g>)}
        {DASHBOARD_DATA.customerChange.map((item, index) => {
          const x = left + gap * (index + .5)
          const positive = item.value >= 0
          const endY = y(item.value)
          const barY = positive ? endY : zeroY
          const barHeight = Math.max(2, Math.abs(zeroY - endY))
          return <g key={item.label}>
            <rect className="chart-bar-animated" x={x - 6} y={barY} width="12" height={barHeight} rx="4" fill={positive ? palette.blue : palette.red}><title>{`${item.label}: ${item.value > 0 ? '+' : ''}${item.value} customers`}</title></rect>
            <path d={positive ? `M ${x} ${endY - 5} l -4 6 h 8 Z` : `M ${x} ${endY + 5} l -4 -6 h 8 Z`} fill={positive ? palette.blue : palette.red} />
            <text x={x} y={height - 6} textAnchor="middle" className="chart-axis-label">{item.label}</text>
          </g>
        })}
      </svg>
    </div>
  )
}

function ScaffoldPanel({ section }) {
  const details = {
    Orders: ['Order management', 'Incoming orders and their preparation status will be available here.'],
    Menu: ['Menu management', 'Manage bakery items, drinks, pricing, and availability from this section.'],
    Stocks: ['Stock management', 'Review ingredient levels and update bakery inventory here.'],
    Customers: ['Customer directory', 'Customer activity and account details will be available here.'],
  }
  const [title, description] = details[section]
  return <section className="admin-scaffold"><span className="admin-scaffold-icon"><DashboardIcon name={navigation.find((item) => item.name === section)?.icon} size={25} /></span><h2>{title}</h2><p>{description}</p><span className="admin-coming-soon">Dashboard preview</span></section>
}

export default function StaffDashboard() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { profileOpen, openProfile, closeProfile } = useStaffProfile()
  const navigate = useNavigate()

  function logout() {
    if (window.confirm('Are you sure you want to log out?')) navigate('/staff/login')
  }

  function choosePage(page) {
    if (page === 'Orders') {
      navigate('/staff/orders')
      return
    }
    if (page === 'Menu') {
      navigate('/staff/menu')
      return
    }
    if (page === 'Stocks') {
      navigate('/staff/stocks')
      return
    }
    if (page === 'Customers') {
      navigate('/staff/customers')
      return
    }
    setActivePage(page)
    setDrawerOpen(false)
  }

  return (
    <div className="admin-dashboard">
      <button className={`admin-drawer-scrim ${drawerOpen ? 'visible' : ''}`} type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
      <aside className={`admin-sidebar ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Staff navigation">
        <div className="admin-brand">
          <Logo small />
          <span>CrumblyX</span>
          <button type="button" className="admin-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><DashboardIcon name="close" /></button>
        </div>
        <div className="admin-side-divider" />
        <nav className="admin-nav" aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`admin-nav-item ${activePage === item.name ? 'active' : ''}`}
              aria-current={activePage === item.name ? 'page' : undefined}
              onClick={() => choosePage(item.name)}
            >
              <DashboardIcon name={item.icon} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <div className="admin-side-divider" />
          <div className="admin-user">
            <button type="button" className="admin-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
            <span className="admin-user-copy"><strong>John Doe</strong><small>doe@example.com</small></span>
            <button type="button" className="admin-logout" aria-label="Log out" title="Log out" onClick={logout}><DashboardIcon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-title-group">
            <button type="button" className="admin-hamburger" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
              <span /><span /><span />
            </button>
            <DashboardIcon name="dashboard" size={23} />
            <h1>{activePage}</h1>
          </div>
          <div className="admin-top-actions">
            <div className="admin-chat-wrap">
              <button type="button" className="admin-chat-button" aria-label="Customer Chat, 2 unread messages" aria-expanded={chatOpen} onClick={() => setChatOpen((open) => !open)}>
                <DashboardIcon name="chat" size={18} /><span>Customer Chat</span><b aria-hidden="true">2</b>
              </button>
              {chatOpen && <div className="admin-chat-popover" role="dialog" aria-label="Recent customer chats">
                <header><strong>Recent chats</strong><button type="button" aria-label="Close chats" onClick={() => setChatOpen(false)}><DashboardIcon name="close" size={17} /></button></header>
                {DASHBOARD_DATA.chatMessages.map((item) => <article key={item.name}><span className="chat-avatar">{item.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{item.name}</strong><p>{item.message}</p><small>{item.time}</small></div></article>)}
                <p className="chat-preview-note">Sample dashboard preview</p>
              </div>}
            </div>
            <button type="button" className="admin-avatar top-avatar admin-avatar-trigger" aria-label="View staff profile for John Doe" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={openProfile}>JD</button>
          </div>
        </header>
        {activePage === 'Dashboard' ? (
          <div className="admin-content">
            <div className="dashboard-grid">
              <ChartCard title="Sales" className="sales-card"><SalesChart /></ChartCard>
              <ChartCard title="Resources and Tasks"><ResourcesChart /></ChartCard>
              <ChartCard title="OLD CUSTOMERS" className="customer-segment-card"><CustomerSegments label="Old customers" data={DASHBOARD_DATA.customers.old} /><div className="segment-caption"><span><i /> Returning</span><span>{DASHBOARD_DATA.customers.old[0]}%</span></div></ChartCard>
              <ChartCard title="NEW CUSTOMERS" className="customer-segment-card new-customer-segments"><CustomerSegments label="New customers" data={DASHBOARD_DATA.customers.new} /><div className="segment-caption"><span><i /> First-time</span><span>{DASHBOARD_DATA.customers.new[0]}%</span></div></ChartCard>
              <ChartCard title="Budget"><BudgetChart /><ul className="budget-legend"><li><i />Last month</li><li><i />Current</li></ul></ChartCard>
              <ChartCard title="New Customers"><ChangeChart /></ChartCard>
            </div>
          </div>
        ) : (
          <div className="admin-content scaffold-content"><ScaffoldPanel section={activePage} /></div>
        )}
      </main>
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  )
}