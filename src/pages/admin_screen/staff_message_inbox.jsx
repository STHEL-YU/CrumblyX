import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DashboardIcon, StaffSpinner } from './staff_admin_shared.jsx'
import { adminTw } from './staff_admin_tw.js'

const ORDER_STATUS_LABELS = {
  new: 'Order placed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
}

async function messageRequest(action, method = 'GET', body, signal) {
  const response = await fetch(`/api/message/${action}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Message request failed.')
  return data
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function StaffMessageInbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const conversationsRef = useRef(conversations)
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)
  const selectedConversation = conversations.find((conversation) => conversation.customerId === selectedCustomerId)

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    const controller = new AbortController()
    let refreshing = false

    async function refreshConversations() {
      if (refreshing) return
      refreshing = true
      try {
        const data = await messageRequest('conversations', 'GET', undefined, controller.signal)
        if (!Array.isArray(data.conversations)) throw new Error('Invalid conversations response.')
        if (!controller.signal.aborted) {
          setConversations(data.conversations.map((conversation) => ({
            ...conversation,
            unreadCount: Number(conversation.unreadCount) || 0,
          })))
          setSelectedCustomerId((current) => current || data.conversations[0]?.customerId || '')
          setError('')
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message)
        }
      } finally {
        refreshing = false
        if (!controller.signal.aborted) setLoadingConversations(false)
      }
    }

    refreshConversations()
    const timer = window.setInterval(refreshConversations, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !selectedCustomerId) {
      return undefined
    }
    const controller = new AbortController()
    let refreshing = false

    async function refreshMessages() {
      if (refreshing) return
      refreshing = true
      try {
        const data = await messageRequest(
          `list?customerId=${encodeURIComponent(selectedCustomerId)}`,
          'GET',
          undefined,
          controller.signal,
        )
        if (!Array.isArray(data.messages)) throw new Error('Invalid messages response.')
        if (!controller.signal.aborted) {
          setMessages(data.messages)
          const hasUnread = conversationsRef.current.some(
            (conversation) => conversation.customerId === selectedCustomerId && conversation.unreadCount > 0,
          )
          if (hasUnread) {
            await messageRequest('read', 'PUT', { customerId: selectedCustomerId, readerType: 'staff' }, controller.signal)
            setConversations((current) => current.map((conversation) => (
              conversation.customerId === selectedCustomerId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )))
          }
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message)
        }
      } finally {
        refreshing = false
        if (!controller.signal.aborted) setLoadingMessages(false)
      }
    }

    refreshMessages()
    const timer = window.setInterval(refreshMessages, 4000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [isOpen, selectedCustomerId])

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages])

  useEffect(() => {
    if (!isOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  async function sendReply(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !selectedCustomerId || sending) return

    setSending(true)
    setError('')
    try {
      const data = await messageRequest('send', 'POST', {
        customerId: selectedCustomerId,
        senderType: 'staff',
        message: text,
      })
      setMessages((current) => [...current, data.message])
      setDraft('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={adminTw('admin-chat-button')}
        aria-label={`Customer inbox${unreadCount ? `, ${unreadCount} unread messages` : ''}`}
        aria-expanded={isOpen}
        onClick={() => {
          setLoadingMessages(true)
          setMessages([])
          setIsOpen(true)
        }}
      >
        <DashboardIcon name="chat" size={18} />
        <span>Customer Chat</span>
        {unreadCount > 0 && <b>{unreadCount}</b>}
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-stone-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <section className="grid h-[min(760px,calc(100dvh-24px))] min-h-0 w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-48px))] md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]" role="dialog" aria-modal="true" aria-label="Customer message inbox">
            <aside className={`min-h-0 flex-col border-b border-stone-200 md:flex md:border-b-0 md:border-r ${selectedCustomerId ? 'hidden' : 'flex'}`}>
              <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-stone-200 px-5">
                <div>
                  <h2 className="m-0 text-lg font-bold tracking-tight text-stone-900">Customer inbox</h2>
                  <p className="m-0 mt-0.5 text-sm text-stone-500">{conversations.length} conversations</p>
                </div>
                <button className="grid size-10 place-items-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900" type="button" aria-label="Close inbox" onClick={() => setIsOpen(false)}><DashboardIcon name="close" size={19} /></button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loadingConversations && conversations.length === 0 && <p className="px-4 py-5 text-sm text-stone-500">Loading conversations…</p>}
                {!loadingConversations && conversations.length === 0 && <p className="px-4 py-5 text-sm text-stone-500">No customer messages yet.</p>}
                {conversations.map((conversation) => (
                  <button
                    className={`w-full border-b border-stone-100 px-5 py-4 text-left transition hover:bg-stone-50 ${selectedCustomerId === conversation.customerId ? 'bg-amber-50' : 'bg-white'}`}
                    type="button"
                    key={conversation.customerId}
                    onClick={() => {
                      setLoadingMessages(true)
                      setMessages([])
                      setSelectedCustomerId(conversation.customerId)
                    }}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <strong className="truncate text-sm font-bold text-stone-900">{conversation.name || 'Customer'}</strong>
                      {conversation.unreadCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-stone-500">{conversation.email}</span>
                    <span className="mt-2 block truncate text-xs text-stone-600">{conversation.preview}</span>
                    {conversation.orderId
                      ? <span className="mt-2 block text-[10px] font-semibold text-amber-900">Order #{conversation.orderId} · {ORDER_STATUS_LABELS[conversation.orderStatus] || conversation.orderStatus}{conversation.orderMode === 'dine-in' && conversation.tableNumber ? ` · Table ${conversation.tableNumber}` : ''}</span>
                      : <span className="mt-2 block text-[10px] text-stone-400">No linked order</span>}
                  </button>
                ))}
              </div>
            </aside>

            <div className={`min-h-0 flex-col ${selectedCustomerId ? 'flex' : 'hidden md:flex'}`}>
              <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-stone-200 px-5">
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-base font-bold tracking-tight text-stone-900">{selectedConversation?.name || 'Select a conversation'}</h2>
                  <p className="m-0 mt-0.5 truncate text-sm text-stone-500">{selectedConversation?.email || 'Customer messages and order details'}</p>
                </div>
                {selectedConversation?.orderId && <span className="hidden shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 sm:inline">#{selectedConversation.orderId} · {ORDER_STATUS_LABELS[selectedConversation.orderStatus] || selectedConversation.orderStatus}</span>}
                <div className="flex shrink-0 items-center gap-1">
                  <button className="grid size-10 place-items-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 [&_svg]:rotate-180 md:hidden" type="button" aria-label="Back to conversations" onClick={() => setSelectedCustomerId('')}><DashboardIcon name="arrow" size={18} /></button>
                  <button className="grid size-10 place-items-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900" type="button" aria-label="Close inbox" onClick={() => setIsOpen(false)}><DashboardIcon name="close" size={19} /></button>
                </div>
              </header>
              {selectedConversation?.orderId && <p className="m-0 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 sm:hidden">Order #{selectedConversation.orderId} · {ORDER_STATUS_LABELS[selectedConversation.orderStatus] || selectedConversation.orderStatus}{selectedConversation.orderMode === 'dine-in' && selectedConversation.tableNumber ? ` · Table ${selectedConversation.tableNumber}` : ''}</p>}

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-stone-50 p-5 sm:p-6" aria-live="polite">
                {error && <p className="m-0 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p>}
                {loadingMessages && selectedCustomerId && <p className="text-sm text-stone-500">Loading messages…</p>}
                {!loadingMessages && selectedConversation && messages.length === 0 && <p className="m-auto text-sm text-stone-500">No messages in this conversation.</p>}
                {messages.map((message) => (
                  <article className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${message.sender === 'staff' ? 'self-end rounded-br-sm bg-amber-800 text-white' : 'self-start rounded-bl-sm border border-stone-200 bg-white text-stone-800'}`} key={message.id}>
                    <p className="m-0 whitespace-pre-wrap break-words text-sm">{message.text}</p>
                    <time className={`mt-1 block text-right text-[10px] ${message.sender === 'staff' ? 'text-amber-100' : 'text-stone-400'}`} dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                  </article>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="flex shrink-0 gap-2 border-t border-stone-200 bg-white p-4 sm:p-5" onSubmit={sendReply}>
                <label className="sr-only" htmlFor="staff-message-reply">Reply to customer</label>
                <input id="staff-message-reply" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Reply to customer…" disabled={!selectedConversation || sending} />
                <button className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-800 text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50" type="submit" aria-label={sending ? 'Sending reply' : 'Send reply'} aria-busy={sending} disabled={!selectedConversation || !draft.trim() || sending}>{sending ? <StaffSpinner /> : <DashboardIcon name="arrow" size={18} />}</button>
              </form>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}