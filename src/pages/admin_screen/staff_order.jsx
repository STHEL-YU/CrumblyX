import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardIcon, StaffProfileDialog, StaffSpinner } from "./staff_admin_shared.jsx";
import { logoutStaff } from "./auth/staff_auth_client.js";
import Sidebar from "./staff_sidebar.jsx";
import StaffMessageInbox from "./staff_message_inbox.jsx";
import { adminTw } from "./staff_admin_tw.js";
import { useStaffProfile } from "./staff_profile.js";

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
    bar: "bg-amber-500",
  },
  preparing: {
    pill: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  ready: {
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  completed: {
    pill: "bg-stone-100 text-stone-700 ring-stone-200",
    dot: "bg-stone-400",
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

function CustomizationList({ customization }) {
  const options = customization
    ? customization.split(",").map((option) => option.trim()).filter(Boolean)
    : [];
  if (options.length === 0) return null;

  return (
    <div className="mt-1 text-xs leading-relaxed text-stone-500">
      <span>Options / add-ons:</span>
      <ul className="list-disc pl-4">
        {options.map((option, index) => (
          <li key={`${option}-${index}`}>{option}</li>
        ))}
      </ul>
    </div>
  );
}

function OrderNotes({ order, className = "" }) {
  const instructions = order.items.filter((item) => item.specialInstruction);

  return (
    <section className={`rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 ${className}`}>
      <h3 className="text-sm font-semibold text-stone-900">Order notes</h3>
      {order.notes && (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">
          {order.notes}
        </p>
      )}
      {instructions.length > 0 && (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-stone-700">
          {instructions.map((item) => (
            <li key={item.id}>
              {item.name} ({item.quantity}×): {item.specialInstruction}
            </li>
          ))}
        </ul>
      )}
      {!order.notes && instructions.length === 0 && (
        <p className="mt-1 text-sm text-stone-700">No order notes.</p>
      )}
    </section>
  );
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
        : elapsed < 1440
          ? `${Math.floor(elapsed / 60)} hr ago`
          : `${Math.floor(elapsed / 1440)} day${Math.floor(elapsed / 1440) === 1 ? "" : "s"} ago`;
  return {
    ...order,
    total: Number(order.total),
    timeAgo,
    items: order.items.map((item) => ({
      ...item,
      specialInstruction: item.specialInstruction || "",
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

function OrderCard({ order, onToggleItem, onSelect, onArchive, onRestore, onPermanentDelete, archived, pendingAction, selected }) {
  const totalItems = order.items.length;
  const completedItems = order.items.filter((item) => item.checked).length;
  const progress = totalItems
    ? Math.round((completedItems / totalItems) * 100)
    : 0;
  const locked = order.status === "ready" || order.status === "completed";

  return (
    <article
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_#30200b0a] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_#30200b14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${selected ? "ring-1 ring-stone-300" : ""}`}
      tabIndex={0}
      aria-label={`Select order ${order.id}, ${STATUS_LABELS[order.status]} status`}
      onClick={() => onSelect(order)}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onSelect(order);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-extrabold tracking-tight text-stone-900">
              {order.customerName || "Guest order"}
            </h3>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1 break-all text-xs text-stone-500">
            {order.customerEmail || "No email provided"}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
              <DashboardIcon
                name={order.orderType === "Take out" ? "menu" : "orders"}
                size={15}
              />
              {order.orderType}
            </span>
            <span className="text-xs font-medium text-stone-500">
              Order #{String(order.id).slice(0, 8)}
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
                disabled={locked || Boolean(pendingAction)}
                onChange={() => onToggleItem(order.id, item.id)}
                aria-label={`${item.name}, item ${index + 1} of ${totalItems}`}
              />
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-stone-300 bg-white text-white transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-60"
                aria-hidden="true"
              >
                {pendingAction === `item:${order.id}:${item.id}`
                  ? <StaffSpinner className="size-3 border-stone-500 border-r-transparent" />
                  : item.checked && <DashboardIcon name="check" size={14} />}
              </span>
              {item.image ? (
                <img
                  className="size-11 shrink-0 rounded-lg bg-stone-100 object-cover"
                  src={item.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700" aria-hidden="true">
                  <DashboardIcon name="menu" size={18} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[15px] leading-snug transition-colors ${item.checked ? "text-stone-400 line-through" : "text-stone-800"}`}
                >
                  {item.quantity > 1 && (
                    <b className="mr-1.5 font-semibold">{item.quantity}×</b>
                  )}
                  {item.name}
                </span>
                <CustomizationList customization={item.customization} />
              </span>
              <span className="shrink-0 text-right text-xs font-medium tabular-nums text-stone-600">
                {peso(Number(item.price) * Number(item.quantity))}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-stone-100 bg-stone-50/60 px-5 py-4">
        <OrderNotes order={order} className="mb-4 bg-white" />
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
            className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #c48a43 0%, #e7b45d 52%, #8fa35c 100%)",
            }}
          />
        </div>
        {order.status === "completed" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${archived ? "border-stone-300 bg-white text-stone-700 hover:bg-stone-100" : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"} ${focusRing}`}
              disabled={Boolean(pendingAction)}
              onClick={(event) => {
                event.stopPropagation();
                if (archived) onRestore(order);
                else onArchive(order);
              }}
            >
              {pendingAction === `${archived ? "restore" : "archive"}:${order.id}`
                ? <StaffSpinner className="size-3" />
                : <DashboardIcon name={archived ? "restore" : "archive"} size={15} />}
              {archived ? "Restore order" : "Move to archive"}
            </button>
            {archived && (
              <button
                type="button"
                className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                disabled={Boolean(pendingAction)}
                onClick={(event) => {
                  event.stopPropagation();
                  onPermanentDelete(order);
                }}
              >
                {pendingAction === `delete:${order.id}` ? <StaffSpinner className="size-3" /> : <DashboardIcon name="trash" size={15} />}
                Permanently delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function OrderDetailsPanel({ order, onClose, onAdvance, onArchive, onRestore, onPermanentDelete, archived, pendingAction, className = "" }) {
  const actionLabel = ACTION_LABELS[order.status];
  const completedItems = order.items.filter((item) => item.checked).length;
  const blocked =
    order.status === "preparing" && completedItems !== order.items.length;

  return (
      <section className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`} aria-labelledby="staff-order-panel-title">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-stone-400">Incoming order</p>
            <h2 id="staff-order-panel-title" className="mt-1 text-xl font-extrabold tracking-tight text-stone-900">
              Order summary
            </h2>
          </div>
          <button
            type="button"
            className={`grid size-9 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 ${focusRing}`}
            aria-label="Clear selected order"
            onClick={onClose}
          >
            <DashboardIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <StatusPill status={order.status} />
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
              {order.orderType}
            </span>
            {order.timeAgo && <span className="ml-auto text-xs text-stone-400">{order.timeAgo}</span>}
          </div>

          <section className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3" aria-label="Customer details">
            <h3 className="text-sm font-semibold text-stone-900">Customer</h3>
            <p className="mt-1 text-sm text-stone-700">{order.customerName || "Guest customer"}</p>
            <p className="text-sm text-stone-500">{order.customerEmail || "No email provided"}</p>
          </section>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Items</h3>
              <span className="text-xs text-stone-500">{order.items.length} items</span>
            </div>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-3 text-sm"
                >
                  {item.image ? (
                    <img
                      className="size-14 shrink-0 rounded-lg bg-stone-100 object-cover"
                      src={item.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700" aria-hidden="true">
                      <DashboardIcon name="menu" size={20} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-800">
                      <b className="mr-1.5 font-semibold">{item.quantity}×</b>
                      {item.name}
                    </p>
                    <CustomizationList customization={item.customization} />
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.checked ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}
                    >
                      {item.checked ? "Prepared" : "Pending"}
                    </span>
                    <p className="mt-1 text-xs font-medium tabular-nums text-stone-600">
                      {peso(Number(item.price) * Number(item.quantity))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <OrderNotes order={order} />

          <div className="flex items-center justify-between border-t border-stone-100 pt-4">
            <span className="text-sm font-medium text-stone-600">Total</span>
            <strong className="text-xl font-bold tabular-nums text-stone-900">
              {peso(order.total)}
            </strong>
          </div>
          {actionLabel && (
            <div className="border-t border-stone-100 pt-4">
              <button
                type="button"
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6b4423] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#54351c] hover:shadow-md disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none ${focusRing}`}
                disabled={blocked || Boolean(pendingAction)}
                aria-busy={pendingAction === `order:${order.id}`}
                onClick={() => onAdvance(order)}
              >
                {pendingAction === `order:${order.id}`
                  ? <><StaffSpinner />Updating…</>
                  : actionLabel}
                <DashboardIcon name="arrow" size={17} />
              </button>
              {blocked && (
                <p className="mt-2 text-center text-xs text-stone-500">
                  Check off every item to mark this order as ready.
                </p>
              )}
            </div>
          )}
          {order.status === "completed" && (
            <div className="border-t border-stone-100 pt-4">
              <button
                type="button"
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${archived ? "border-stone-300 bg-white text-stone-700 hover:bg-stone-100" : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"} ${focusRing}`}
                disabled={Boolean(pendingAction)}
                onClick={() => archived ? onRestore(order) : onArchive(order)}
              >
                {pendingAction === `${archived ? "restore" : "archive"}:${order.id}`
                  ? <><StaffSpinner />Updating archive…</>
                  : <><DashboardIcon name={archived ? "restore" : "archive"} size={16} />{archived ? "Restore order" : "Move to archive"}</>}
              </button>
              {archived && (
                <button
                  type="button"
                  className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                  disabled={Boolean(pendingAction)}
                  onClick={() => onPermanentDelete(order)}
                >
                  {pendingAction === `delete:${order.id}` ? <><StaffSpinner />Deleting…</> : <><DashboardIcon name="trash" size={16} />Permanently delete order</>}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
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
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [orderView, setOrderView] = useState("active");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [compactViewport, setCompactViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1276px)").matches,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profileOpen, openProfile, closeProfile } = useStaffProfile();
  const [section, setSection] = useState("Orders");
  const navigate = useNavigate();
  const isOrderModalOpen = compactViewport && Boolean(selectedOrder);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1276px)");
    const updateViewport = () => setCompactViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isOrderModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedOrder(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOrderModalOpen]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      orderRequest("list", "GET", undefined, controller.signal),
      orderRequest("archive", "GET", undefined, controller.signal),
    ])
      .then(([data, archiveData]) => {
        if (!Array.isArray(data.orders) || !Array.isArray(archiveData.orders))
          throw new Error("Invalid orders response.");
        if (!controller.signal.aborted) {
          setOrders(data.orders.map(normalizeOrder));
          setArchivedOrders(archiveData.orders.map(normalizeOrder));
        }
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

  const displayOrders = orderView === "archive" ? archivedOrders : orders;
  const visibleOrders =
    filter === "all"
      ? displayOrders
      : displayOrders.filter((order) => order.status === filter);

  async function toggleItem(orderId, itemId) {
    if (pendingAction) return;
    const order = orders.find((item) => item.id === orderId);
    const item = order?.items.find((entry) => entry.id === itemId);
    if (!order || !item) return;
    setPendingAction(`item:${orderId}:${itemId}`);
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
    } finally {
      setPendingAction("");
    }
  }

  async function advanceOrder(order) {
    if (pendingAction) return;
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
    setPendingAction(`order:${order.id}`);
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
    } finally {
      setPendingAction("");
    }
  }

  async function moveOrderToArchive(order, archived) {
    if (pendingAction) return;
    setPendingAction(`${archived ? "archive" : "restore"}:${order.id}`);
    try {
      const updatedOrder = normalizeOrder(
        await orderRequest(archived ? "archive" : "restore", "POST", { id: order.id }),
      );
      if (archived) {
        setOrders((current) => current.filter((item) => item.id !== order.id));
        setArchivedOrders((current) => [updatedOrder, ...current.filter((item) => item.id !== order.id)]);
      } else {
        setArchivedOrders((current) => current.filter((item) => item.id !== order.id));
        setOrders((current) => [updatedOrder, ...current.filter((item) => item.id !== order.id)]);
      }
      setSelectedOrder((current) => current?.id === order.id ? null : current);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingAction("");
    }
  }

  async function permanentlyDeleteOrder(order) {
    if (pendingAction) return
    const confirmed = window.confirm(
      `Permanently delete order ${order.id}? This cannot be undone.`,
    )
    if (!confirmed) return

    setPendingAction(`delete:${order.id}`)
    try {
      await orderRequest("permanent-delete", "POST", { id: order.id })
      setArchivedOrders((current) => current.filter((item) => item.id !== order.id))
      setSelectedOrder((current) => current?.id === order.id ? null : current)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPendingAction("")
    }
  }

  function refreshOrders() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  async function logout() {
    if (!window.confirm("Are you sure you want to log out?")) return
    try {
      await logoutStaff()
      navigate("/staff/login", { replace: true })
    } catch (error) {
      window.alert(error.message)
    }
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
    if (name === "Sales") {
      navigate("/staff/sales");
      return;
    }
    if (name === "Stocks") {
      navigate("/staff/stocks");
      return;
    }
    if (name === "Tables") {
      navigate("/staff/tables");
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

  const listTitle = orderView === "archive"
    ? "Archived orders"
    : filter === "all" ? "All orders" : `${STATUS_LABELS[filter]} orders`;
  const searchedOrders = visibleOrders.filter((order) => {
    const term = search.trim().toLocaleLowerCase();
    return !term || `${order.id} ${order.customerName || ""} ${order.orderType}`.toLocaleLowerCase().includes(term);
  });

  return (
    <div className={adminTw("admin-dashboard staff-orders-app")}>
      <Sidebar
        activeRoute={section}
        drawerOpen={drawerOpen}
        onNavigate={navigateSection}
        onClose={() => setDrawerOpen(false)}
        profileOpen={profileOpen}
        onOpenProfile={openProfile}
        onLogout={logout}
      />

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
            <StaffMessageInbox />
            <button
              type="button"
              className={adminTw(
                "admin-avatar top-avatar admin-avatar-trigger",
              )}
              aria-label="View staff profile for Crumblyx Staff"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={openProfile}
            >
              CS
            </button>
          </div>
        </header>

        {section === "Orders" ? (
          <div className={adminTw("staff-orders-content")}>
            <div className="grid min-h-full gap-5 min-[1277px]:grid-cols-[minmax(0,7fr)_minmax(310px,3fr)]">
              <section className="min-w-0" aria-labelledby="staff-order-list-title">
                <nav className="mb-5 inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm" aria-label="Order views">
                  <button
                    type="button"
                    aria-pressed={orderView === "active"}
                    onClick={() => { setOrderView("active"); setFilter("all"); setSelectedOrder(null); }}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${orderView === "active" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-50"}`}
                  >
                    Active orders <span className="text-xs opacity-70">{orders.length}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={orderView === "archive"}
                    onClick={() => { setOrderView("archive"); setFilter("all"); setSelectedOrder(null); }}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${orderView === "archive" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-50"}`}
                  >
                    <DashboardIcon name="archive" size={15} />Archive <span className="text-xs opacity-70">{archivedOrders.length}</span>
                  </button>
                </nav>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-stone-400 shadow-sm focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 sm:max-w-lg">
                    <DashboardIcon name="search" size={17} />
                    <span className="sr-only">Search orders by ID, customer, or order type</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search orders…"
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </label>
                  <button
                    type="button"
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md disabled:opacity-60 ${focusRing}`}
                    onClick={refreshOrders}
                    disabled={loading}
                    aria-busy={loading}
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

                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 id="staff-order-list-title" className="text-lg font-bold tracking-tight text-stone-900">
                    {listTitle}
                  </h2>
                  <p className="text-xs font-medium text-stone-500" aria-live="polite">
                    {searchedOrders.length} of {displayOrders.length} orders
                  </p>
                </div>

                {orderView === "active" && <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter orders by status">
                  <button
                    type="button"
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${filter === "all" ? "border-stone-900 bg-stone-900 text-white shadow-sm" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                  >
                    Show all <span className="opacity-70">{orders.length}</span>
                  </button>
                  {FILTERS.map((item) => (
                    <button
                      type="button"
                      key={item.status}
                      aria-pressed={filter === item.status}
                      onClick={() => setFilter((current) => current === item.status ? "all" : item.status)}
                      className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${filter === item.status ? "border-amber-300 bg-amber-50 text-amber-950 shadow-sm" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                    >
                      <span className={`size-1.5 rounded-full ${STATUS_STYLES[item.status].dot}`} aria-hidden="true" />
                      {item.label} <span className="text-stone-400">{counts[item.status]}</span>
                    </button>
                  ))}
                </nav>}

                {error && (
                  <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                    <p>{error}</p>
                    <button
                      type="button"
                      className={`shrink-0 font-semibold underline underline-offset-2 ${focusRing}`}
                      onClick={refreshOrders}
                      disabled={loading}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {loading && displayOrders.length === 0 ? (
                  <OrdersSkeleton />
                ) : searchedOrders.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      <DashboardIcon name="orders" size={24} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-stone-900">
                      {search
                        ? "No matching orders"
                        : orderView === "archive"
                          ? "No archived orders"
                          : filter === "all"
                            ? "No orders yet"
                            : `No ${STATUS_LABELS[filter].toLowerCase()} orders`}
                    </h3>
                    <p className="mt-1 max-w-xs text-sm text-stone-500">
                      {search
                        ? "Try another order ID, customer name, or order type."
                        : orderView === "archive"
                          ? "Completed orders you archive will be kept here. You can restore them at any time."
                          : filter === "all"
                            ? "New customer orders will show up here as they come in."
                            : "Orders with this status will show up here."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 2xl:grid-cols-2">
                    {searchedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onToggleItem={toggleItem}
                        onSelect={setSelectedOrder}
                        onArchive={(order) => moveOrderToArchive(order, true)}
                        onRestore={(order) => moveOrderToArchive(order, false)}
                        onPermanentDelete={permanentlyDeleteOrder}
                        archived={orderView === "archive"}
                        pendingAction={pendingAction}
                        selected={selectedOrder?.id === order.id}
                      />
                    ))}
                  </div>
                )}
              </section>

              <aside
                className={
                  compactViewport
                    ? isOrderModalOpen
                      ? "fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
                      : "hidden"
                    : "flex min-h-[420px] min-w-0 flex-col min-[1277px]:sticky min-[1277px]:top-0 min-[1277px]:h-[calc(100dvh-10.5rem)]"
                }
                aria-label="Selected order details"
                role={isOrderModalOpen ? "dialog" : undefined}
                aria-modal={isOrderModalOpen ? "true" : undefined}
                onClick={(event) => {
                  if (isOrderModalOpen && event.target === event.currentTarget) {
                    setSelectedOrder(null);
                  }
                }}
              >
                {selectedOrder ? (
                  <OrderDetailsPanel
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onAdvance={advanceOrder}
                    onArchive={(order) => moveOrderToArchive(order, true)}
                    onRestore={(order) => moveOrderToArchive(order, false)}
                    onPermanentDelete={permanentlyDeleteOrder}
                    archived={orderView === "archive"}
                    pendingAction={pendingAction}
                    className={
                      isOrderModalOpen
                        ? "h-[min(90dvh,48rem)] w-full max-w-xl flex-none"
                        : ""
                    }
                  />
                ) : (
                  <section className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-stone-100 text-stone-500">
                      <DashboardIcon name="orders" size={23} />
                    </span>
                    <h2 className="mt-4 text-base font-bold text-stone-900">Order summary</h2>
                    <p className="mt-1 max-w-xs text-sm text-stone-500">
                      Select an order card to see its customer, items, and notes here.
                    </p>
                  </section>
                )}
              </aside>
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
      {profileOpen && <StaffProfileDialog onClose={closeProfile} />}
    </div>
  );
}
