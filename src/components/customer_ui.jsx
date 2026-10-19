export function Icon({ name, size = 20, className = '' }) {
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
    check: <path d="m5 12 4 4L19 6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.4 0 10 6 10 6a16 16 0 0 1-3.2 3.7M6.2 6.3C3.5 8 2 12 2 12s3.6 6 10 6c1 0 1.9-.2 2.8-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    google: <><path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.7h4.8a4.2 4.2 0 0 1-1.8 2.7v2.3h3c1.7-1.6 2.5-4 2.5-6.7Z" /><path d="M12 21c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.5-1.8.8-2.9.8a5.6 5.6 0 0 1-5.3-3.9h-3v2.4A9 9 0 0 0 12 21Z" /><path d="M6.7 13.5a5.3 5.3 0 0 1 0-3V8.1h-3a9 9 0 0 0 0 7.8l3-2.4Z" /><path d="M12 6.6c1.3 0 2.5.5 3.4 1.4L18 5.4A8.8 8.8 0 0 0 12 3a9 9 0 0 0-8.3 5.1l3 2.4A5.6 5.6 0 0 1 12 6.6Z" /></>,
    apple: <path d="M16.7 12.8c0-2.3 1.8-3.4 1.9-3.5a4.2 4.2 0 0 0-3.3-1.8c-1.4-.2-2.7.8-3.4.8s-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7c1.3 0 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4 4 0 0 1-2.7-3.5ZM14.5 6a4 4 0 0 0 .9-3 4.2 4.2 0 0 0-2.7 1.4 3.8 3.8 0 0 0-.9 2.9 3.5 3.5 0 0 0 2.7-1.3Z" />,
    facebook: <path d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V10H7v3h3v8h4Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M5 20c3-5 6-7 12-10" /></>,
  }

  return <svg {...shared}>{paths[name] || paths.cup}</svg>
}

export function Logo({ small = false }) {
  return (
    <span className={`logo-mark ${small ? 'logo-mark-small' : ''}`} aria-label="CrumblyX cookie logo">
      <Icon name="cookie" size={small ? 21 : 31} />
      <span className="logo-spoon" />
    </span>
  )
}

export function Est() {
  return <span className="est-label">EST. 2026</span>
}
