import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/customer_ui.jsx";
import { DashboardIcon, StaffProfileDialog } from "./staff_admin_shared.jsx";
import { adminTw } from "./staff_admin_tw.js";
import { useStaffProfile } from "./staff_profile.js";
import { STAFF_NAVIGATION } from "./staff_navigation.js";

const FILTERS = [
  { status: "new", label: "New" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

const STATUS_LABELS = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
};

// Full class strings so Tailwind can detect them.
const STATUS_STYLES = {
  new: {
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    accent: "border-l-amber-500",
    bar: "bg-amber-500",
  },
  preparing: {
    pill: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    accent: "border-l-sky-500",
    bar: "bg-sky-500",
  },
  ready: {
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    accent: "border-l-emerald-500",
    bar: "bg-emerald-500",
  },
  completed: {
    pill: "bg-stone-100 text-stone-700 ring-stone-200",
    dot: "bg-stone-400",
    accent: "border-l-stone-300",
    bar: "bg-stone-400",
  },
};

const ACTION_LABELS = {
  new: "Accept order",
  preparing: "Mark as ready",
  ready: "Complete order",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2";

function peso(value) {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function orderRequest(action, method = "GET", body, signal) {
  const response = await fetch(`/api/orders/${action}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Order request failed.");
  return data;
}

function normalizeOrder(order) {
  const createdAt = new Date(order.createdAt);
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 60000),
  );
  const timeAgo = Number.isNaN(createdAt.getTime())
    ? ""
    : elapsed < 1
      ? "Just now"
      : elapsed < 60
        ? `${elapsed} min ago`
        : `${Math.floor(elapsed / 60)} hr ago`;
  return {
    ...order,
    total: Number(order.total),
    timeAgo,
    items: order.items.map((item) => ({
      ...item,
      checked: Boolean(item.checked),
    })),
  };
}

function replaceOrder(orders, updatedOrder) {
  return orders.map((order) =>
    order.id === updatedOrder.id ? updatedOrder : order,
  );
}

function StatusPill({ status }) {
  const styles = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${status === "preparing" ? "motion-safe:animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function OrderCard({ order, onToggleItem, onAdvance, onViewDetails }) {
  const styles = STATUS_STYLES[order.status];
  const totalItems = order.items.length;
  const completedItems = order.items.filter((item) => item.checked).length;
  const progress = totalItems
    ? Math.round((completedItems / totalItems) * 100)
    : 0;
  const actionLabel = ACTION_LABELS[order.status];
  const locked = order.status === "ready" || order.status === "completed";
  const blocked = order.status === "preparing" && completedItems !== totalItems;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border border-l-4 border-stone-200 bg-white shadow-sm ${styles.accent}`}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold tracking-tight text-stone-900">
              #{order.id}
            </h3>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <DashboardIcon
                name={order.orderType === "Take out" ? "menu" : "orders"}
                size={15}
              />
              {order.orderType}
            </span>
            {order.timeAgo && (
              <>
                <span className="text-stone-300" aria-hidden="true">
                  •
                </span>
                <span>{order.timeAgo}</span>
              </>
            )}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-xs font-medium text-stone-500">
            Total
          </span>
          <strong className="text-lg font-bold tabular-nums text-stone-900">
            {peso(order.total)}
          </strong>
        </p>
      </div>

      <ul
        className="mt-4 flex-1 space-y-0.5 px-3"
        aria-label={`Items in order ${order.id}`}
      >
        {order.items.map((item, index) => (
          <li key={item.id}>
            <label
              className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors ${locked ? "cursor-default" : "cursor-pointer hover:bg-stone-50"}`}
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={item.checked}
                disabled={locked}
                onChange={() => onToggleItem(order.id, item.id)}
                aria-label={`${item.name}, item ${index + 1} of ${totalItems}`}
              />
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-stone-300 bg-white text-white transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-60"
                aria-hidden="true"
              >
                {item.checked && <DashboardIcon name="check" size={14} />}
              </span>
              <span
                className={`text-[15px] leading-snug transition-colors ${item.checked ? "text-stone-400 line-through" : "text-stone-800"}`}
              >
                {item.quantity > 1 && (
                  <b className="mr-1.5 font-semibold">{item.quantity}×</b>
                )}
                {item.name}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-stone-100 bg-stone-50/60 px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-stone-600">
            {completedItems} of {totalItems} items prepared
          </span>
          <span className="font-semibold tabular-nums text-stone-900">
            {progress}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-stone-200"
          role="progressbar"
          aria-label={`Order ${order.id} preparation progress`}
          aria-valuemin={0}
          aria-valuemax={totalItems}
          aria-valuenow={completedItems}
          aria-valuetext={`${completedItems} of ${totalItems} items prepared`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${styles.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 ${focusRing}`}
            onClick={() => onViewDetails(order)}
          >
            View details
          </button>
          {actionLabel && (
            <button
              type="button"
              className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none ${focusRing}`}
              disabled={blocked}
              onClick={() => onAdvance(order)}
            >
              {actionLabel}
              <DashboardIcon name="arrow" size={17} />
            </button>
          )}
        </div>
        {blocked && (
          <p className="mt-2 text-right text-xs text-stone-500">
            Check off every item to mark this order as ready.
          </p>
        )}
      </div>
    </article>
  );
}

function OrderDetailsDialog({ order, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.querySelector("button")?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;

      const focusable = [...dialog.querySelectorAll("button:not(:disabled)")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-order-dialog-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-stone-500">Order details</p>
            <h2
              id="staff-order-dialog-title"
              className="mt-0.5 text-2xl font-bold tracking-tight text-stone-900"
            >
              #{order.id}
            </h2>
          </div>
          <button
            type="button"
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 ${focusRing}`}
            aria-label="Close order details"
            onClick={onClose}
          >
            <DashboardIcon name="close" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <StatusPill status={order.status} />
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
              {order.orderType}
            </span>
            {order.timeAgo && <span>{order.timeAgo}</span>}
          </div>

          <section className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3" aria-label="Customer details">
            <h3 className="text-sm font-semibold text-stone-900">Customer</h3>
            <p className="mt-1 text-sm text-stone-700">{order.customerName || "Guest customer"}</p>
            <p className="text-sm text-stone-500">{order.customerEmail || "No email provided"}</p>
          </section>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-900">Items</h3>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]"
                >
                  <span className="text-stone-800">
                    <b className="mr-1.5 font-semibold">{item.quantity}×</b>
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.checked ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}
                  >
                    {item.checked ? "Prepared" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Order notes
            </h3>
            <p className="mt-1 text-sm text-stone-700">
              {order.notes || "No special instructions."}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-stone-100 pt-4">
            <span className="text-sm font-medium text-stone-600">Total</span>
            <strong className="text-xl font-bold tabular-nums text-stone-900">
              {peso(order.total)}
            </strong>
          </div>
        </div>

        <footer className="px-6 pb-6">
          <button
            type="button"
            className={`min-h-12 w-full rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 ${focusRing}`}
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div
      className="grid gap-4 xl:grid-cols-2"
      role="status"
      aria-label="Loading orders"
    >
      {[0, 1, 2, 3].map((key) => (
        <div
          key={key}
          className="h-72 rounded-2xl border border-stone-200 bg-white p-5 motion-safe:animate-pulse"
        >
          <div className="h-5 w-32 rounded bg-stone-200" />
          <div className="mt-3 h-4 w-48 rounded bg-stone-100" />
          <div className="mt-8 space-y-3">
            <div className="h-5 w-full rounded bg-stone-100" />
            <div className="h-5 w-5/6 rounded bg-stone-100" />
            <div className="h-5 w-2/3 rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { profileOpen, openProfile, closeProfile } = useStaffProfile();
  const [section, setSection] = useState("Orders");
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    orderRequest("list", "GET", undefined, controller.signal)
      .then((data) => {
        if (!Array.isArray(data.orders))
          throw new Error("Invalid orders response.");
        if (!controller.signal.aborted)
          setOrders(data.orders.map(normalizeOrder));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const counts = FILTERS.reduce((result, item) => {
    result[item.status] = orders.filter(
      (order) => order.status === item.status,
    ).length;
    return result;
  }, {});

  const visibleOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  async function toggleItem(orderId, itemId) {
    const order = orders.find((item) => item.id === orderId);
    const item = order?.items.find((entry) => entry.id === itemId);
    if (!order || !item) return;
    try {
      const updatedOrder = normalizeOrder(
        await orderRequest("update", "PUT", {
          id: orderId,
          itemId,
          checked: !item.checked,
        }),
      );
      setOrders((current) => replaceOrder(current, updatedOrder));
      setSelectedOrder((current) =>
        current?.id === updatedOrder.id ? updatedOrder : current,
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function advanceOrder(order) {
    const nextStatus = {
      new: "preparing",
      preparing: "ready",
      ready: "completed",
    }[order.status];
    if (!nextStatus) return;
    if (
      order.status === "preparing" &&
      order.items.some((item) => !item.checked)
    )
      return;
    try {
      const updatedOrder = normalizeOrder(
        await orderRequest("update", "PUT", {
          id: order.id,
          status: nextStatus,
        }),
      );
      setOrders((current) => replaceOrder(current, updatedOrder));
      setSelectedOrder((current) =>
        current?.id === updatedOrder.id ? updatedOrder : current,
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function refreshOrders() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  function logout() {
    if (window.confirm("Are you sure you want to log out?"))
      navigate("/staff/login");
  }

  function navigateSection(name) {
    setDrawerOpen(false);
    if (name === "Dashboard") {
      navigate("/staff/dashboard");
      return;
    }
    if (name === "Menu") {
      navigate("/staff/menu");
      return;
    }
    if (name === "Stocks") {
      navigate("/staff/stocks");
      return;
    }
    if (name === "Customers") {
      navigate("/staff/customers");
      return;
    }
    if (name === "Orders") {
      setSection("Orders");
      return;
    }
    setSection(name);
  }

  const listTitle =
    filter === "all" ? "All orders" : `${STATUS_LABELS[filter]} orders`;

  return (
    <div className={adminTw("admin-dashboard staff-orders-app")}>
      <button
        className={adminTw(`admin-drawer-scrim ${drawerOpen ? "visible" : ""}`)}
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={adminTw(`admin-sidebar ${drawerOpen ? "drawer-open" : ""}`)}
        aria-label="Staff navigation"
      >
        <div className={adminTw("admin-brand")}>
          <Logo small />
          <span>CrumblyX</span>
          <button
            type="button"
            className={adminTw("admin-drawer-close")}
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            <DashboardIcon name="close" />
          </button>
        </div>
        <div className={adminTw("admin-side-divider")} />
        <nav className={adminTw("admin-nav")} aria-label="Main navigation">
          {STAFF_NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.name}
              className={adminTw(
                `admin-nav-item ${section === item.name ? "active" : ""}`,
              )}
              aria-current={section === item.name ? "page" : undefined}
              onClick={() => navigateSection(item.name)}
            >
              <DashboardIcon name={item.icon} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className={adminTw("admin-account")}>
          <div className={adminTw("admin-side-divider")} />
          <div className={adminTw("admin-user")}>
            <button
              type="button"
              className={adminTw("admin-avatar admin-avatar-trigger")}
              aria-label="View staff profile for John Doe"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={openProfile}
            >
              JD
            </button>
            <span className={adminTw("admin-user-copy")}>
              <strong>John Doe</strong>
              <small>doe@example.com</small>
            </span>
            <button
              type="button"
              className={adminTw("admin-logout")}
              aria-label="Log out"
              title="Log out"
              onClick={logout}
            >
              <DashboardIcon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className={adminTw("admin-main staff-orders-main")}>
        <header className={adminTw("admin-topbar")}>
          <div className={adminTw("admin-title-group")}>
            <button
              type="button"
              className={adminTw("admin-hamburger")}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <DashboardIcon name="orders" size={23} />
            <h1>{section}</h1>
          </div>
          <div className={adminTw("admin-top-actions")}>
            <div className={adminTw("admin-chat-wrap")}>
              <button
                type="button"
                className={adminTw("admin-chat-button")}
                aria-label="Customer Chat, 2 unread messages"
                aria-expanded={chatOpen}
                onClick={() => setChatOpen((open) => !open)}
              >
                <DashboardIcon name="chat" size={18} />
                <span>Customer Chat</span>
                <b aria-hidden="true">2</b>
              </button>
              {chatOpen && (
                <div
                  className={adminTw("admin-chat-popover")}
                  role="dialog"
                  aria-label="Customer chat preview"
                >
                  <header>
                    <strong>Customer Chat</strong>
                    <button
                      type="button"
                      aria-label="Close chats"
                      onClick={() => setChatOpen(false)}
                    >
                      <DashboardIcon name="close" size={17} />
                    </button>
                  </header>
                  <p className={adminTw("staff-orders-chat-note")}>
                    2 unread customer messages
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              className={adminTw(
                "admin-avatar top-avatar admin-avatar-trigger",
              )}
              aria-label="View staff profile for John Doe"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={openProfile}
            >
              JD
            </button>
          </div>
        </header>

        {section === "Orders" ? (
          <div className={adminTw("staff-orders-content")}>
            <div className="mx-auto w-full max-w-6xl">
              {/* Toolbar */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <p
                  className="text-sm font-medium text-stone-600"
                  aria-live="polite"
                >
                  {orders.length} {orders.length === 1 ? "order" : "orders"}{" "}
                  today
                </p>
                <button
                  type="button"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-60 ${focusRing}`}
                  onClick={refreshOrders}
                  disabled={loading}
                >
                  <svg
                    className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {error && (
                <div
                  className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  role="alert"
                >
                  <p>{error}</p>
                  <button
                    type="button"
                    className={`shrink-0 font-semibold underline underline-offset-2 ${focusRing}`}
                    onClick={refreshOrders}
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Status summary (acts as filter) */}
              <section
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                aria-label="Order status summary"
              >
                {FILTERS.map((item) => {
                  const selected = filter === item.status;
                  return (
                    <button
                      type="button"
                      key={item.status}
                      aria-pressed={selected}
                      onClick={() =>
                        setFilter((current) =>
                          current === item.status ? "all" : item.status,
                        )
                      }
                      className={`flex min-h-20 items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left shadow-sm transition-colors ${focusRing} ${selected ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"}`}
                    >
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-stone-700">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[item.status].dot}`}
                          aria-hidden="true"
                        />
                        {item.label}
                      </span>
                      <strong className="text-3xl font-bold tabular-nums text-stone-900">
                        {counts[item.status]}
                      </strong>
                    </button>
                  );
                })}
              </section>

              {/* Order list */}
              <section
                className="mt-8"
                aria-labelledby="staff-order-list-title"
              >
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id="staff-order-list-title"
                      className="text-xl font-bold tracking-tight text-stone-900"
                    >
                      {listTitle}
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Check off each item as it’s prepared, then move the order
                      forward.
                    </p>
                  </div>
                  {filter !== "all" && (
                    <button
                      type="button"
                      className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 ${focusRing}`}
                      onClick={() => setFilter("all")}
                    >
                      Show all orders
                    </button>
                  )}
                </div>

                {loading && orders.length === 0 ? (
                  <OrdersSkeleton />
                ) : visibleOrders.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      <DashboardIcon name="orders" size={24} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-stone-900">
                      {filter === "all"
                        ? "No orders yet"
                        : `No ${STATUS_LABELS[filter].toLowerCase()} orders`}
                    </h3>
                    <p className="mt-1 max-w-xs text-sm text-stone-500">
                      {filter === "all"
                        ? "New customer orders will show up here as they come in."
                        : "Orders with this status will show up here."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {visibleOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onToggleItem={toggleItem}
                        onAdvance={advanceOrder}
                        onViewDetails={setSelectedOrder}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className={adminTw("staff-orders-content")}>
            <section className="mx-auto flex max-w-6xl flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
              <h2 className="text-base font-semibold text-stone-900">
                {section}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                This section isn’t available in the orders preview.
              </p>
            </section>
          </div>
        )}
      </main>
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  );
}
