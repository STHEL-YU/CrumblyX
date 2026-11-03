import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../../components/customer_ui.jsx";
import CustomerMessage from "./customer_message.jsx";
import CustomerNotifications from "./customer_notifications.jsx";
import CosProfile from "./cos_profile.jsx";
import CosOrderTracking from "./cos_order_tracking.jsx";

const fallbackImages = {
  Pastry:
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85",
  Beverages:
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1000&q=85",
  Meal: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=85",
  Meals:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=85",
};

async function fetchJson(path, signal) {
  const response = await fetch(path, { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load menu.");
  return data;
}

function nameKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}

function getAvailableProducts(menuItems, stockRecords) {
  const stocksById = new Map(stockRecords.map((record) => [record.id, record]));
  const stocksByName = new Map(
    stockRecords.map((record) => [nameKey(record.name), record]),
  );

  return menuItems
    .filter((item) => item.available)
    .filter((item) => {
      const stock =
        stocksById.get(item.id) || stocksByName.get(nameKey(item.name));
      return stock?.quantity == null || Number(stock.quantity) > 0;
    })
    .map((item) => ({
      ...item,
      price: Number(item.price),
      category:
        item.category === "Pastry"
          ? "Pastries"
          : item.category === "Meal"
            ? "Meals"
            : item.category,
      description: item.description || "",
      image:
        item.image || fallbackImages[item.category] || fallbackImages.Pastry,
      customizable: true,
      isBeverage: item.category === "Beverages",
      isMeal: item.category === "Meal" || item.category === "Meals",
    }));
}

const addons = [
  { id: "caramel", name: "Extra Caramel Shot", price: 30 },
  { id: "cream", name: "Whipped Cream", price: 25 },
  { id: "oat", name: "Oat Milk Upgrade", price: 25 },
];

export default function CosHome() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All Items");
  const [products, setProducts] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCartItemIds, setSelectedCartItemIds] = useState(
    () => new Set(),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [trackedOrdersLoaded, setTrackedOrdersLoaded] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [customer, setCustomer] = useState(() => ({
    id: sessionStorage.getItem("crumblyx-customer-id") || "",
    name: sessionStorage.getItem("crumblyx-customer-name") || "",
    email: sessionStorage.getItem("crumblyx-customer-email") || "",
  }));
  const [dismissedOrderIds, setDismissedOrderIds] = useState(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(
          `crumblyx-dismissed-orders-${sessionStorage.getItem("crumblyx-customer-id") || ""}`,
        ) || "[]",
      );
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });
  const orderSwipeStartX = useRef(null);
  const [trackedOrdersError, setTrackedOrdersError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [coffeeType, setCoffeeType] = useState("ICED");
  const [cupSize, setCupSize] = useState("MEDIUM");
  const [sugar, setSugar] = useState("50%");
  const [pastrySize, setPastrySize] = useState("REGULAR");
  const [spice, setSpice] = useState("NOT SPICY");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [orderMode] = useState(
    () => new URLSearchParams(window.location.search).get("mode") || "takeout",
  );
  const [tableNumber] = useState(() =>
    new URLSearchParams(window.location.search).get("table"),
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchJson("/api/menu/list", controller.signal),
      fetchJson("/api/stocks/list", controller.signal),
    ])
      .then(([menuItems, stockRecords]) => {
        if (!Array.isArray(menuItems) || !Array.isArray(stockRecords)) {
          throw new Error("The menu response was invalid.");
        }
        setProducts(getAvailableProducts(menuItems, stockRecords));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMenuError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMenuLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!customer.id) return;
    const controller = new AbortController();

    async function refreshTrackedOrders() {
      try {
        const response = await fetch(
          `/api/orders/list?customerId=${encodeURIComponent(customer.id)}`,
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "Could not refresh your orders.");
        if (!Array.isArray(data.orders))
          throw new Error("The orders response was invalid.");
        if (!controller.signal.aborted) {
          setTrackedOrders(data.orders);
          setTrackedOrdersLoaded(true);
          setTrackedOrdersError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setTrackedOrdersError(error.message);
      }
    }

    refreshTrackedOrders();
    const timer = window.setInterval(refreshTrackedOrders, 3000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [customer.id]);

  const visibleProducts = useMemo(
    () =>
      category === "All Items"
        ? products
        : products.filter((product) => product.category === category),
    [category, products],
  );
  const categoryOptions = ["All Items", "Pastries", "Meals", "Beverages"];
  const addonTotal = selectedAddons.reduce(
    (sum, addonId) =>
      sum + (addons.find((addon) => addon.id === addonId)?.price || 0),
    0,
  );
  const sizeAdjustment =
    cupSize === "SMALL" ? -20 : cupSize === "LARGE" ? 30 : 0;
  const unitTotal = selected
    ? Math.max(
        0,
        selected.price +
          (selected.isBeverage ? addonTotal + sizeAdjustment : 0),
      )
    : 0;
  const orderTotal = unitTotal * quantity;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeTrackedOrders = trackedOrders.filter(
    (order) => order.status !== "completed",
  );
  const visibleTrackedOrders = trackedOrders.filter(
    (order) => !dismissedOrderIds.has(order.id),
  );
  const overlayOpen =
    Boolean(selected) ||
    cartOpen ||
    messageOpen ||
    profileOpen ||
    Boolean(trackingOrder) ||
    ordersOpen;

  function startItem(product) {
    setSelected(product);
    setQuantity(1);
    setCoffeeType("ICED");
    setCupSize("MEDIUM");
    setSugar("50%");
    setPastrySize("REGULAR");
    setSpice("NOT SPICY");
    setSelectedAddons([]);
    setInstruction("");
  }

  function addToCart() {
    if (!selected) return;
    let customization = "";
    let customizationData = null;

    if (selected.isBeverage) {
      customization = [
        coffeeType.toLowerCase(),
        cupSize.toLowerCase(),
        `${sugar} sugar`,
        ...selectedAddons.map(
          (addonId) => addons.find((addon) => addon.id === addonId)?.name,
        ),
        instruction.trim(),
      ]
        .filter(Boolean)
        .join(", ");
      customizationData = {
        coffeeType,
        cupSize,
        sugar,
        addonIds: selectedAddons,
      };
    } else {
      customization = [
        pastrySize.toLowerCase(),
        spice.toLowerCase(),
        instruction.trim(),
      ]
        .filter(Boolean)
        .join(", ");
    }

    const existingItem = cart.find(
      (item) =>
        item.productId === selected.id &&
        item.price === unitTotal &&
        item.customization === customization,
    );

    if (existingItem) {
      setCart((items) =>
        items.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      );
      setSelectedCartItemIds((ids) => new Set([...ids, existingItem.id]));
    } else {
      const newItem = {
        id: `${selected.id}-${Date.now()}`,
        productId: selected.id,
        name: selected.name,
        quantity,
        price: unitTotal,
        image: selected.image,
        customization,
        customizationData,
      };
      setCart((items) => [...items, newItem]);
      setSelectedCartItemIds((ids) => new Set([...ids, newItem.id]));
    }
    setSelected(null);
  }

  async function placeOrder() {
    const itemsToOrder = cart.filter((item) =>
      selectedCartItemIds.has(item.id),
    );
    if (itemsToOrder.length === 0 || orderSubmitting) return;

    let orderNotes = "";
    if (orderMode !== "dine-in") {
      try {
        const takeoutDetails = JSON.parse(
          sessionStorage.getItem("crumblyx-takeout-details") || "null",
        );
        if (!takeoutDetails?.address || !takeoutDetails?.phone) {
          setOrderError(
            "Please enter your takeout address and phone number before ordering.",
          );
          return;
        }
        orderNotes = [
          `Takeout contact: ${takeoutDetails.name || customer.name}`,
          `Email: ${takeoutDetails.email || customer.email}`,
          `Phone: ${takeoutDetails.phone}`,
          `Address: ${takeoutDetails.address}`,
          takeoutDetails.landmark ? `Landmark: ${takeoutDetails.landmark}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch {
        setOrderError(
          "Takeout details are invalid. Please choose Take Out again.",
        );
        return;
      }
    }

    setOrderSubmitting(true);
    setOrderError("");
    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: orderMode === "dine-in" ? "dine-in" : "takeout",
          tableNumber,
          customerName: customer.name,
          customerEmail: customer.email,
          notes: orderNotes,
          items: itemsToOrder.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
            customizationData: item.customizationData,
          })),
        }),
      });
      const newOrder = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(newOrder.error || "Could not place your order.");

      setTrackedOrders((orders) => [
        newOrder,
        ...orders.filter((order) => order.id !== newOrder.id),
      ]);
      setTrackingOrder(newOrder);
      const orderedIds = new Set(itemsToOrder.map((item) => item.id));
      const remainingItems = cart.filter((item) => !orderedIds.has(item.id));
      setCart(remainingItems);
      setSelectedCartItemIds(new Set(remainingItems.map((item) => item.id)));
      setCartOpen(false);
    } catch (error) {
      setOrderError(error.message);
    } finally {
      setOrderSubmitting(false);
    }
  }

  function toggleCartItemSelection(itemId) {
    setSelectedCartItemIds((ids) => {
      const nextIds = new Set(ids);
      if (nextIds.has(itemId)) nextIds.delete(itemId);
      else nextIds.add(itemId);
      return nextIds;
    });
  }

  function removeCartItem(itemId) {
    setCart((items) => items.filter((item) => item.id !== itemId));
    setSelectedCartItemIds((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(itemId);
      return nextIds;
    });
  }

  function changeCartItemQuantity(itemId, change) {
    setCart((items) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item,
      ),
    );
  }

  function toggleAddon(id) {
    setSelectedAddons((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }

  function setCategoryAndScroll(nextCategory) {
    setCategory(nextCategory);
    document
      .querySelector(".menu-scroll")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openOrders() {
    setOrdersOpen(true);
  }

  function dismissCompletedOrder(order) {
    if (order.status !== "completed") return;
    const nextIds = new Set(dismissedOrderIds);
    nextIds.add(order.id);
    setDismissedOrderIds(nextIds);
    sessionStorage.setItem(
      `crumblyx-dismissed-orders-${customer.id}`,
      JSON.stringify([...nextIds]),
    );
  }

  function finishOrderSwipe(order, event) {
    if (order.status !== "completed" || orderSwipeStartX.current == null) return;
    const distance = event.changedTouches[0].clientX - orderSwipeStartX.current;
    orderSwipeStartX.current = null;
    if (Math.abs(distance) >= 80) dismissCompletedOrder(order);
  }

  function logout() {
    sessionStorage.removeItem("crumblyx-customer-id");
    sessionStorage.removeItem("crumblyx-customer-name");
    sessionStorage.removeItem("crumblyx-customer-email");
    sessionStorage.removeItem("crumblyx-takeout-details");
    navigate("/login", { replace: true });
  }

  const navItems = [
    {
      key: "menu",
      label: "Menu",
      icon: <NavSvg name="home" />,
      active: true,
      onClick: () => setCategoryAndScroll("All Items"),
    },
    {
      key: "orders",
      label: "Orders",
      icon: <NavSvg name="receipt" />,
      badge: activeTrackedOrders.length,
      dot: activeTrackedOrders.length > 0,
      onClick: openOrders,
    },
    {
      key: "cart",
      label: "Cart",
      icon: <Icon name="cart" size={22} />,
      badge: cartCount,
      onClick: () => setCartOpen(true),
    },
    {
      key: "messages",
      label: "Messages",
      icon: <Icon name="chat" size={22} />,
      onClick: () => setMessageOpen(true),
    },
    {
      key: "profile",
      label: "Profile",
      icon: <Icon name="user" size={22} />,
      onClick: () => setProfileOpen(true),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes cx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cx-nav-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .cx-rise { animation: cx-rise .55s cubic-bezier(.2,.8,.2,1) both; }
        .cx-nav-in { animation: cx-nav-in .5s cubic-bezier(.2,.8,.2,1) both; }
        .menu-scroll::-webkit-scrollbar, .category-row::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .cx-rise, .cx-nav-in { animation: none !important; } }
      `}</style>

      <div className="menu-screen font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] antialiased">
        <header className="menu-header flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            className="header-brand inline-flex cursor-pointer items-center gap-2.5 border-0 text-[1.05rem] font-extrabold tracking-[-0.01em] transition active:scale-95"
            onClick={() => setCategoryAndScroll("All Items")}
            aria-label="CrumblyX home"
          >
            <Logo small />
            <span>CrumblyX</span>
          </button>
          <div className="header-actions flex items-center gap-2">
            <CustomerNotifications
              customerId={customer.id}
              orders={trackedOrders}
              ordersLoaded={trackedOrdersLoaded}
            />
          </div>
        </header>

        <div className="menu-scroll">
          <div className="menu-content mx-auto w-full max-w-[720px] px-4 pb-[120px] sm:px-6">
            <section className="table-banner cx-rise flex items-center gap-3.5 rounded-[20px] border border-[color-mix(in_srgb,currentColor_14%,transparent)] px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              <span className="qr-icon grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-[color-mix(in_srgb,currentColor_14%,transparent)]">
                <Icon name={orderMode === "dine-in" ? "qr" : "cup"} size={25} />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="text-[0.95rem] font-bold tracking-[-0.01em]">
                  {orderMode === "dine-in"
                    ? "Dine In Ordering Active"
                    : "Takeout Ordering"}
                </strong>
                <p className="m-0 mt-0.5 text-[0.8rem] font-medium leading-snug opacity-70">
                  {orderMode === "dine-in" && tableNumber
                    ? `You’re seated at Table ${tableNumber}. Your order will be brought directly to you.`
                    : "Place your order and pick it up when it’s ready."}
                </p>
              </div>
              <span className="online-dot relative h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />
              </span>
            </section>

            <section
              className="menu-intro cx-rise mt-7"
              style={{ animationDelay: "0.08s" }}
            >
              <p className="eyebrow m-0 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.2em] opacity-70">
                <Icon name="leaf" size={15} /> Fresh Daily
              </p>
              <h1 className="m-0 mt-2 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.4rem]">
                Our Menu
              </h1>
              <p className="m-0 mt-1.5 max-w-[420px] text-[0.92rem] font-medium leading-relaxed opacity-70">
                Handcrafted pastries and specialty drinks, made with love every
                morning
              </p>
            </section>

            <nav
              className="category-row cx-rise -mx-4 mt-6 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
              style={{ animationDelay: "0.16s", scrollbarWidth: "none" }}
              aria-label="Menu categories"
            >
              {categoryOptions.map((item) => (
                <button
                  className={`category-chip ${category === item ? "selected" : ""} inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-[0.85rem] font-bold transition active:scale-95 ${category === item ? "shadow-[0_8px_20px_rgba(0,0,0,0.14)]" : "hover:-translate-y-0.5"}`}
                  key={item}
                  onClick={() => setCategoryAndScroll(item)}
                >
                  <Icon
                    name={
                      item === "All Items"
                        ? "leaf"
                        : item === "Pastries" || item === "Meals"
                          ? "pastry"
                          : "cup"
                    }
                    size={16}
                  />
                  {item}
                </button>
              ))}
            </nav>

            <div className="product-list mt-6 flex flex-col gap-3">
              {menuLoading && <MenuSkeleton />}
              {!menuLoading && menuError && (
                <p
                  className="m-0 rounded-xl border border-[color-mix(in_srgb,currentColor_20%,transparent)] px-4 py-3 text-[0.88rem] font-medium"
                  role="alert"
                >
                  Could not load menu: {menuError}
                </p>
              )}
              {!menuLoading && !menuError && visibleProducts.length === 0 && (
                <p className="m-0 py-10 text-center text-[0.9rem] font-medium opacity-65">
                  {products.length === 0
                    ? "No menu items are currently available."
                    : "No items in this category are currently available."}
                </p>
              )}
              {!menuLoading &&
                visibleProducts.map((product, index) => (
                  <article
                    className="product-card cx-rise group flex items-stretch gap-3 rounded-[22px] border border-[color-mix(in_srgb,currentColor_12%,transparent)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(0,0,0,0.1)]"
                    style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
                    key={product.id}
                  >
                    <div className="relative h-[104px] w-[104px] shrink-0 self-start overflow-hidden rounded-[16px] sm:h-[116px] sm:w-[116px]">
                      <button
                        className="product-photo-wrap !static !m-0 !block !h-full !w-full !rounded-none !border-0 !p-0 cursor-pointer"
                        onClick={() => startItem(product)}
                        aria-label={`View ${product.name}`}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-photo !h-full !w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                      {product.customizable && (
                        <span className="custom-badge pointer-events-none !absolute !left-1.5 !top-1.5 z-10 whitespace-nowrap !px-2 !py-1 !text-[0.55rem]">
                          <i /> Customizable
                        </span>
                      )}
                    </div>

                    <div className="product-details flex min-w-0 flex-1 flex-col justify-between">
                      <div className="product-card-heading">
                        <h2 className="m-0 min-w-0 flex-1 text-[0.92rem] font-bold leading-snug tracking-[-0.01em] sm:text-[1rem]">
                          {product.name}
                        </h2>
                        <button
                          className="product-info-button"
                          type="button"
                          onClick={() => startItem(product)}
                          aria-label={`View ${product.name} details`}
                          title="View details"
                        >
                          i
                        </button>
                      </div>
                      {product.description && (
                        <p className="detail-description product-card-description">
                          {product.description}
                        </p>
                      )}
                      <div className="product-card-footer">
                        <strong className="product-card-price">
                          ₱ {product.price}
                        </strong>
                        <button
                          className="add-order-button product-card-add"
                          type="button"
                          onClick={() => startItem(product)}
                          aria-label={`Add ${product.name} to order`}
                        >
                          <Icon name="cart" size={15} />
                          Add
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </div>

      {!overlayOpen && (
        <nav
          aria-label="Main navigation"
          className="cx-nav-in fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]"
        >
          <ul className="m-0 flex w-full max-w-[440px] list-none items-center justify-between gap-1 rounded-[28px] border border-[color-mix(in_srgb,currentColor_12%,transparent)] bg-white/85 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl">
            {navItems.map((item) => (
              <li className="flex-1" key={item.key}>
                <button
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={`relative flex w-full cursor-pointer flex-col items-center gap-1 rounded-[20px] border-0 px-1 py-2.5 transition active:scale-90 ${
                    item.active
                      ? "bg-[#8a4b2a] text-white shadow-[0_8px_18px_rgba(138,75,42,0.35)]"
                      : "bg-transparent opacity-70 hover:bg-[color-mix(in_srgb,currentColor_7%,transparent)] hover:opacity-100"
                  }`}
                >
                  <span className="relative grid h-[22px] place-items-center">
                    {item.icon}
                    {item.badge > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#8a4b2a] px-1 text-[0.62rem] font-extrabold leading-none text-white ring-2 ring-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[0.66rem] font-bold tracking-[0.01em]">
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {selected && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <section
            className={`item-sheet ${selected.customizable ? "custom-sheet" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-scroll">
              <div className="detail-photo-wrap">
                <img src={selected.image} alt={selected.name} />
                <button
                  className="close-button"
                  aria-label="Close item details"
                  onClick={() => setSelected(null)}
                >
                  <Icon name="close" size={20} />
                </button>
                {selected.customizable && (
                  <span className="custom-badge detail-badge">
                    <i />
                    {selected.name}
                  </span>
                )}
              </div>
              <div className="detail-content">
                <div className="detail-title-line">
                  <h2>{selected.name}</h2>
                  <strong>₱ {selected.price}</strong>
                </div>
                {selected.description && (
                  <p className="detail-description">
                    <strong>Description:</strong> {selected.description}
                  </p>
                )}
                {selected.customizable && (
                  <div className="custom-options">
                    {selected.isBeverage ? (
                      <>
                        <OptionGroup
                          label="TYPE OF COFFEE"
                          options={["ICED", "HOT"]}
                          value={coffeeType}
                          onChange={setCoffeeType}
                        />
                        <OptionGroup
                          label="CUP SIZE"
                          options={["SMALL", "MEDIUM", "LARGE"]}
                          value={cupSize}
                          onChange={setCupSize}
                        />
                        <OptionGroup
                          label="SUGAR LEVEL"
                          options={["0%", "25%", "50%", "75%", "100%"]}
                          value={sugar}
                          onChange={setSugar}
                        />
                        <fieldset className="addon-group">
                          <legend>ADD ONS</legend>
                          {addons.map((addon) => (
                            <label className="addon-row" key={addon.id}>
                              <input
                                type="checkbox"
                                checked={selectedAddons.includes(addon.id)}
                                onChange={() => toggleAddon(addon.id)}
                              />
                              <span>{addon.name}</span>
                              <strong>+ ₱ {addon.price}</strong>
                            </label>
                          ))}
                        </fieldset>
                      </>
                    ) : (
                      <>
                        <OptionGroup
                          label="SIZE"
                          options={["SMALL", "REGULAR", "LARGE"]}
                          value={pastrySize}
                          onChange={setPastrySize}
                        />
                        <OptionGroup
                          label="SPICE LEVEL"
                          options={["NOT SPICY", "SPICY"]}
                          value={spice}
                          onChange={setSpice}
                        />
                      </>
                    )}
                    <label className="instruction-field">
                      <span>SPECIAL INSTRUCTION</span>
                      <textarea
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        placeholder={
                          selected.isBeverage
                            ? "E.g. no sugar on top, extra hot, allergy notes..."
                            : selected.isMeal
                              ? "E.g. no onions, extra rice, allergy notes..."
                              : "E.g. warm it up, cut in half, allergy notes..."
                        }
                        rows={3}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="sheet-action-bar">
              <div className="quantity-stepper">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={17} />
                </button>
                <span>{quantity}</span>
                <button
                  onClick={() => setQuantity((value) => value + 1)}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={17} />
                </button>
              </div>
              <button className="add-cart-button" onClick={addToCart}>
                Add ₱ {orderTotal} to Cart
              </button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-header">
              <h2>Your cart</h2>
              <button
                className="close-button drawer-close"
                aria-label="Close cart"
                onClick={() => setCartOpen(false)}
              >
                <Icon name="close" size={20} />
              </button>
            </header>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-cart-icon">
                  <Icon name="cart" size={32} />
                </span>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items from our menu</p>
                <button onClick={() => setCartOpen(false)}>Browse Menu</button>
              </div>
            ) : (
              <div className="filled-cart">
                {orderError && (
                  <p className="cart-order-error" role="alert">
                    {orderError}
                  </p>
                )}
                <div className="cart-items">
                  {cart.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <label
                        className="cart-item-select"
                        aria-label={`Select ${item.name} to order`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCartItemIds.has(item.id)}
                          onChange={() => toggleCartItemSelection(item.id)}
                        />
                      </label>
                      <img src={item.image} alt="" />
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <p>
                          ₱ {item.price} each
                          {item.customization && (
                            <small>{item.customization}</small>
                          )}
                        </p>
                        <div
                          className="cart-quantity-stepper"
                          aria-label={`${item.name} quantity`}
                        >
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name} quantity`}
                            disabled={orderSubmitting || item.quantity <= 1}
                            onClick={() => changeCartItemQuantity(item.id, -1)}
                          >
                            <Icon name="minus" size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name} quantity`}
                            disabled={orderSubmitting}
                            onClick={() => changeCartItemQuantity(item.id, 1)}
                          >
                            <Icon name="plus" size={14} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="remove-cart-item"
                        type="button"
                        aria-label={`Remove ${item.name} from cart`}
                        onClick={() => removeCartItem(item.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Selected total</span>
                  <strong>
                    ₱{" "}
                    {cart
                      .filter((item) => selectedCartItemIds.has(item.id))
                      .reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0,
                      )}
                  </strong>
                </div>
                <button
                  className="order-now-button"
                  onClick={placeOrder}
                  disabled={
                    orderSubmitting ||
                    !cart.some((item) => selectedCartItemIds.has(item.id))
                  }
                >
                  {orderSubmitting
                    ? "Placing order…"
                    : `Order Selected (${cart.filter((item) => selectedCartItemIds.has(item.id)).length})`}
                </button>
                <button
                  className="browse-button"
                  onClick={() => setCartOpen(false)}
                >
                  Browse Menu
                </button>
              </div>
            )}
            <p className="drawer-footnote">
              CrumblyX · Freshly baked, just for you
            </p>
          </aside>
        </div>
      )}

      {ordersOpen && (
        <div className="orders-backdrop" onClick={() => setOrdersOpen(false)}>
          <section
            className="orders-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Your orders"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="profile-header">
              <h2>My Orders</h2>
              <button
                className="close-button profile-close"
                type="button"
                aria-label="Close orders"
                onClick={() => setOrdersOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="orders-list">
              {!trackedOrdersLoaded && !trackedOrdersError && (
                <p className="profile-orders-empty" role="status">
                  Loading your orders…
                </p>
              )}
              {trackedOrdersError && (
                <p className="profile-orders-error" role="alert">
                  Could not load your orders: {trackedOrdersError}
                </p>
              )}
              {trackedOrdersLoaded &&
                !trackedOrdersError &&
                visibleTrackedOrders.length === 0 && (
                  <p className="profile-orders-empty">
                    {trackedOrders.length === 0
                      ? "You haven’t placed any orders yet."
                      : "All orders have been removed from this list."}
                  </p>
                )}
              {visibleTrackedOrders.map((order) => (
                <article
                  className={`profile-order ${order.status === "completed" ? "profile-order--dismissible" : ""}`}
                  key={order.id}
                  onTouchStart={
                    order.status === "completed"
                      ? (event) => {
                          orderSwipeStartX.current = event.touches[0].clientX;
                        }
                      : undefined
                  }
                  onTouchEnd={
                    order.status === "completed"
                      ? (event) => finishOrderSwipe(order, event)
                      : undefined
                  }
                >
                  <div className="profile-order-heading">
                    <span
                      className={`profile-order-status profile-order-status--${order.status}`}
                    >
                      <i />
                      {{
                        new: "Order placed",
                        preparing: "Preparing",
                        ready: "Ready",
                        completed: "Completed",
                      }[order.status] || "Order placed"}
                    </span>
                    <strong>#{order.id}</strong>
                  </div>
                  <h4>Order</h4>
                  <p>
                    {order.mode === "dine-in"
                      ? `Dine in · Table ${order.tableNumber}`
                      : "Takeout"}
                    {" · "}₱ {Number(order.total).toFixed(2)}
                    {order.createdAt && (
                      <>
                        <br />
                        {new Date(order.createdAt).toLocaleString()}
                      </>
                    )}
                  </p>
                  <ul className="profile-order-items">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <strong>
                          {order.status === "completed"
                            ? "Completed"
                            : item.checked
                              ? "Prepared"
                              : order.status === "new"
                                ? "Queued"
                                : "Preparing"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  {order.status === "completed" && (
                    <small className="profile-order-swipe-hint">
                      Swipe to remove
                    </small>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersOpen(false);
                      setTrackingOrder(order);
                    }}
                  >
                    Track order
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      <CustomerMessage
        isOpen={messageOpen}
        onClose={() => setMessageOpen(false)}
        customerId={customer.id}
      />
      {profileOpen && (
        <CosProfile
          customer={customer}
          onClose={() => setProfileOpen(false)}
          onCustomerUpdated={(updatedCustomer) => {
            setCustomer((current) => ({ ...current, ...updatedCustomer }));
            sessionStorage.setItem(
              "crumblyx-customer-name",
              updatedCustomer.name,
            );
          }}
          onLogout={logout}
        />
      )}
      {trackingOrder && (
        <CosOrderTracking
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </>
  );
}

function NavSvg({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function MenuSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((n) => (
        <div className="product-card skeleton-card" key={n}>
          <div className="product-photo-wrap skeleton-photo" />
          <div className="product-details">
            <div className="product-title-line">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-price" />
            </div>
            <div className="skeleton-line skeleton-desc" />
            <div className="skeleton-line skeleton-desc short" />
            <div className="skeleton-line skeleton-button" />
          </div>
        </div>
      ))}
    </>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="option-group">
      <legend>{label}</legend>
      <div className="option-pills">
        {options.map((option) => (
          <button
            type="button"
            className={value === option ? "active" : ""}
            onClick={() => onChange(option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
