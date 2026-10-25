import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/customer_ui.jsx'

export default function CustomerMessage({ isOpen, onClose, customerId }) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !customerId) return undefined
    const controller = new AbortController()

    async function loadMessages() {
      try {
        const response = await fetch(`/api/message/list?customerId=${encodeURIComponent(customerId)}`, {
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not load messages.')
        if (!controller.signal.aborted) {
          setMessages(Array.isArray(data.messages) ? data.messages : [])
          setError('')
          setLoading(false)
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message)
          setLoading(false)
        }
      }
    }

    setLoading(true)
    loadMessages()
    const timer = window.setInterval(loadMessages, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [customerId, isOpen])

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages])

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, message: text }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not send message.')
      setMessages((current) => [...current, data.message])
      setDraft('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="message-backdrop" onClick={onClose}>
      <section
        className="message-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-message-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="message-header">
          <span className="message-avatar"><Icon name="chat" size={20} /></span>
          <div className="message-heading">
            <h2 id="customer-message-title">CrumblyX Support</h2>
            <span><i /> Here to help</span>
          </div>
          <button className="close-button message-close" type="button" aria-label="Close messages" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="message-list" aria-live="polite">
          {!customerId && <p className="message-demo-note">Sign in to send a message to support.</p>}
          {loading && <p className="message-demo-note">Loading messages…</p>}
          {error && <p className="message-demo-note" role="alert">{error}</p>}
          {!loading && !error && messages.length === 0 && customerId && (
            <p className="message-demo-note">No messages yet. Send a message to start a conversation with support.</p>
          )}
          {messages.map((message) => (
            <article className={`message-bubble ${message.sender === 'customer' ? 'customer-message' : 'support-message'}`} key={message.id}>
              <p>{message.text}</p>
              {message.createdAt && (
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </time>
              )}
            </article>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-composer" onSubmit={sendMessage}>
          <label className="visually-hidden" htmlFor="customer-message-input">Write a message</label>
          <input
            id="customer-message-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write your message..."
            autoComplete="off"
            maxLength={2000}
            disabled={!customerId || sending}
          />
          <button type="submit" aria-label="Send message" disabled={!customerId || !draft.trim() || sending}>
            <Icon name="arrow" size={19} />
          </button>
        </form>
      </section>
    </div>
  )
}
