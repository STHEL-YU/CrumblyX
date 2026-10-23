import { useEffect, useRef } from 'react'

import { adminTw } from './staff_admin_tw.js'

function DashboardIcon({ name, size = 19 }) {
  const iconPaths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    orders: <><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r=".5" fill="currentColor" /><circle cx="7" cy="12" r=".5" fill="currentColor" /><circle cx="7" cy="18" r=".5" fill="currentColor" /></>,
    stocks: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" /><path d="m3.5 7.8 8.5 4.4 8.5-4.4M12 12.2V21M7.5 5.2l9 4.6" /></>,
    customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.7M17 14a6 6 0 0 1 4.5 5.8" /></>,
    userPlus: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" /></>,
    userSlash: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M4 4l16 16" /></>,
    person: <><circle cx="12" cy="8" r="4" fill="currentColor" stroke="none" /><path d="M4 21a8 8 0 0 1 16 0Z" fill="currentColor" stroke="none" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.7-.8L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.8" /><path d="M3 4v6M1.5 7h3M4.5 4v6M21 4c-2 2-2.5 4.2-2.5 7H21M21 4v16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></>,
    warning: <><path d="m10.3 4.6-8 14A1.6 1.6 0 0 0 3.7 21h16.6a1.6 1.6 0 0 0 1.4-2.4l-8-14a1.9 1.9 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    boxOpen: <><path d="m3 8 9-5 9 5-9 5-9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
    alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name] || iconPaths.dashboard}</svg>
}

function StaffProfileDialog({ onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const closeButton = dialog?.querySelector('[aria-label="Close staff profile"]')
    closeButton?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button:not(:disabled)')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={adminTw("staff-profile-backdrop fixed inset-0 z-[60] grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm")} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className={adminTw("staff-profile-dialog max-h-[min(90dvh,660px)] w-full max-w-[420px] overflow-auto rounded-3xl border border-amber-100 bg-[#fffaf3] p-6 text-amber-950 shadow-2xl")} role="dialog" aria-modal="true" aria-labelledby="staff-profile-title">
        <header className={adminTw("flex items-start justify-between gap-4 border-b border-amber-100 pb-4")}>
          <div><span className={adminTw("text-[9px] font-extrabold tracking-[1.25px] text-amber-900/60")}>CRUMBLYX ACCOUNT</span><h2 id="staff-profile-title" className={adminTw("mt-1 text-2xl font-extrabold text-amber-950")}>Staff Profile</h2></div>
          <button className={adminTw("grid size-9 shrink-0 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 active:scale-95")} type="button" aria-label="Close staff profile" onClick={onClose}><DashboardIcon name="close" size={18} /></button>
        </header>
        <div className={adminTw("staff-profile-identity flex items-center gap-4 py-5")}>
          <span className={adminTw("staff-profile-avatar grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-amber-100 bg-gradient-to-br from-amber-800 to-amber-300 text-lg font-extrabold text-white shadow-md")} aria-hidden="true">JD</span>
          <div><h3 className={adminTw("text-lg font-extrabold")}>John Doe</h3><p className={adminTw("mt-1 inline-flex min-h-6 items-center rounded-full bg-green-100 px-3 text-xs font-extrabold text-green-900")}>Administrator</p></div>
        </div>
        <dl className={adminTw("grid border-t border-amber-100")}>
          <div className={adminTw("grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-3 border-b border-amber-100 py-3")}><dt className={adminTw("text-xs font-bold text-amber-900/60")}>Email address</dt><dd className={adminTw("m-0 break-words text-right text-xs font-extrabold")}>doe@example.com</dd></div>
          <div className={adminTw("grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-3 border-b border-amber-100 py-3")}><dt className={adminTw("text-xs font-bold text-amber-900/60")}>Account role</dt><dd className={adminTw("m-0 break-words text-right text-xs font-extrabold")}>Staff administrator</dd></div>
          <div className={adminTw("grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-3 border-b border-amber-100 py-3")}><dt className={adminTw("text-xs font-bold text-amber-900/60")}>Access</dt><dd className={adminTw("m-0 break-words text-right text-xs font-extrabold")}>CrumblyX Admin Dashboard</dd></div>
          <div className={adminTw("grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-3 border-b border-amber-100 py-3")}><dt className={adminTw("text-xs font-bold text-amber-900/60")}>Account status</dt><dd className={adminTw("m-0 flex justify-end text-right text-xs font-extrabold")}><span className={adminTw("staff-profile-active inline-flex items-center gap-1.5 text-green-900")}><i className={adminTw("size-2 rounded-full bg-lime-600")} aria-hidden="true" />Active</span></dd></div>
        </dl>
        <button className={adminTw("staff-profile-done mt-4 min-h-10 w-full rounded-xl bg-amber-900 text-sm font-extrabold text-white transition hover:bg-amber-950 active:scale-[.99]")} type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  )
}

export { DashboardIcon, StaffProfileDialog }
