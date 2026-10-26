import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/customer_ui.jsx";

export default function CustomerMessage({ isOpen, onClose, customerId }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Load and poll messages
  useEffect(() => {
    if (!isOpen || !customerId) return undefined;
    const controller = new AbortController();

    async function loadMessages(isInitial = false) {
      if (isInitial) setLoading(true);
      try {
        const response = await fetch(
          `/api/message/list?customerId=${encodeURIComponent(customerId)}`,
          {
            signal: controller.signal,
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "Could not load messages.");
        if (!controller.signal.aborted) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setError("");
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted && isInitial) {
          setLoading(false);
        }
      }
    }

    loadMessages(true);
    const timer = window.setInterval(() => loadMessages(false), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [customerId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/message/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, message: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Could not send message.");
      setMessages((current) => [...current, data.message]);
      setDraft("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <section
        className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-[#FAF6EE] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden border border-amber-900/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-message-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#FAF6EE] border-b border-amber-900/10">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#5D4037] text-white flex items-center justify-center shadow-xs">
              <Icon name="chat" size={20} />
            </span>
            <div>
              <h2
                id="customer-message-title"
                className="font-semibold text-stone-800 text-sm sm:text-base"
              >
                CrumblyX Support
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{" "}
                Here to help
              </span>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-amber-900/5 hover:bg-amber-900/10 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
            type="button"
            aria-label="Close messages"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {/* Message List */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF6EE]"
          aria-live="polite"
        >
          {!customerId && (
            <p className="text-center text-xs text-stone-500 py-4 bg-amber-900/5 rounded-xl px-3">
              Sign in to send a message to support.
            </p>
          )}
          {loading && <ChatLoader />}
          {error && (
            <p
              className="text-center text-xs text-red-600 bg-red-50 p-3 rounded-xl"
              role="alert"
            >
              {error}
            </p>
          )}
          {!loading && !error && messages.length === 0 && customerId && (
            <p className="text-center text-xs text-stone-500 py-6 px-4 bg-amber-900/5 rounded-2xl">
              No messages yet. Send a message to start a conversation with
              support.
            </p>
          )}
          {!loading &&
            messages.map((message) => {
              const isCustomer = message.sender === "customer";
              return (
                <article
                  className={`flex flex-col max-w-[80%] px-4 py-2.5 rounded-2xl shadow-xs ${
                    isCustomer
                      ? "ml-auto bg-[#E2EED9] text-stone-800 rounded-tr-sm"
                      : "mr-auto bg-white text-stone-800 rounded-tl-sm border border-amber-900/5"
                  }`}
                  key={message.id}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  {message.createdAt && (
                    <time
                      dateTime={message.createdAt}
                      className="text-[10px] text-stone-400 mt-1 self-end"
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </article>
              );
            })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <form
          className="p-3 bg-[#FAF6EE] border-t border-amber-900/10 flex items-center gap-2"
          onSubmit={sendMessage}
        >
          <label className="sr-only" htmlFor="customer-message-input">
            Write a message
          </label>
          <input
            ref={inputRef}
            id="customer-message-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write your message..."
            autoComplete="off"
            maxLength={2000}
            disabled={!customerId || sending}
            className="flex-1 bg-white border border-amber-900/20 rounded-full px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/20 disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!customerId || !draft.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#B8A890] hover:bg-[#A6957C] text-white flex items-center justify-center disabled:opacity-40 transition-colors shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Icon name="arrow" size={19} />
          </button>
        </form>
      </section>
    </div>
  );
}

function ChatLoader() {
  return (
    <div
      className="mr-auto bg-white text-stone-800 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-xs border border-amber-900/5 flex items-center gap-1.5 w-fit"
      aria-label="Loading messages"
    >
      <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.32s]" />
      <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.16s]" />
      <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" />
    </div>
  );
}
