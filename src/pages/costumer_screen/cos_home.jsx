import { useEffect, useMemo, useState } from "react";
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
  const [customer] = useState(() => ({
    id: sessionStorage.getItem("crumblyx-customer-id") || "",
    name: sessionStorage.getItem("crumblyx-customer-name") || "",
    email: sessionStorage.getItem("crumblyx-customer-email") || "",
  }));
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
    const timer = window.setInterval(refreshTrackedOrders, 10000);
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
      customizationData = { pastrySize, spice };
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

      setTrackedOrders((orders) => [...orders, newOrder]);
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

  function logout() {
    sessionStorage.removeItem("crumblyx-customer-id");
    sessionStorage.removeItem("crumblyx-customer-name");
    sessionStorage.removeItem("crumblyx-customer-email");
    navigate("/login", { replace: true });
  }

  return (
    <>
      <div className="menu-screen">
        <header className="menu-header">
          <button
            className="header-brand"
            onClick={() => setCategoryAndScroll("All Items")}
            aria-label="CrumblyX home"
          >
            <Logo small />
            <span>CrumblyX</span>
          </button>
          <div className="header-actions">
            <button
              className="header-icon"
              aria-label="Message CrumblyX staff"
              onClick={() => setMessageOpen(true)}
            >
              <Icon name="chat" />
            </button>
            <CustomerNotifications
              customerId={customer.id}
              orders={trackedOrders}
              ordersLoaded={trackedOrdersLoaded}
            />
            <button
              className="header-icon cart-trigger"
              aria-label={`Open cart, ${cartCount} items`}
              onClick={() => setCartOpen(true)}
            >
              <Icon name="cart" />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
            <button
              className={`header-icon profile-trigger ${trackedOrders.length ? "has-active-order" : ""}`}
              aria-label={
                trackedOrders.length
                  ? "View customer profile, orders in progress"
                  : "View customer profile"
              }
              onClick={() => setProfileOpen(true)}
            >
              <Icon name="user" />
              {trackedOrders.length > 0 && (
                <span className="profile-order-indicator" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        <div className="menu-scroll">
          <div className="menu-content">
            <section className="table-banner">
              <span className="qr-icon">
                <Icon name={orderMode === "dine-in" ? "qr" : "cup"} size={25} />
              </span>
              <div>
                <strong>
                  {orderMode === "dine-in"
                    ? "Dine In Ordering Active"
                    : "Takeout Ordering"}
                </strong>
                <p>
                  {orderMode === "dine-in" && tableNumber
                    ? `You’re seated at Table ${tableNumber}. Your order will be brought directly to you.`
                    : "Place your order and pick it up when it’s ready."}
                </p>
              </div>
              <span className="online-dot" />
            </section>

            <section className="menu-intro">
              <p className="eyebrow">
                <Icon name="leaf" size={15} /> FRESH DAILY
              </p>
              <h1>Our Menu</h1>
              <p>
                Handcrafted pastries and specialty drinks, made with love every
                morning
              </p>
            </section>

            <nav className="category-row" aria-label="Menu categories">
              {categoryOptions.map((item) => (
                <button
                  className={`category-chip ${category === item ? "selected" : ""}`}
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

            <div className="product-list">
              {menuLoading && <MenuSkeleton />}
              {!menuLoading && menuError && (
                <p role="alert">Could not load menu: {menuError}</p>
              )}
              {!menuLoading && !menuError && visibleProducts.length === 0 && (
                <p>
                  {products.length === 0
                    ? "No menu items are currently available."
                    : "No items in this category are currently available."}
                </p>
              )}
              {!menuLoading &&
                visibleProducts.map((product) => (
                  <article
                    className="product-card animate-fade-in"
                    key={product.id}
                  >
                    <div className="relative shrink-0">
                      <button
                        className="product-photo-wrap"
                        onClick={() => startItem(product)}
                        aria-label={`View ${product.name}`}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-photo"
                          loading="lazy"
                        />
                        {product.customizable && (
                          <span className="custom-badge">
                            <i /> Customizable
                          </span>
                        )}
                      </button>

                      <button
                        className="absolute left-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#8a4b2a] text-white shadow-md transition hover:bg-[#6f3a1f] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a4b2a]"
                        onClick={() => startItem(product)}
                        aria-label={`Add ${product.name} to order`}
                        title="Add to order"
                      >
                        <Icon name="cart" size={17} />
                      </button>
                    </div>

                    <div className="product-details">
                      <div className="product-title-line">
                        <h2>{product.name}</h2>
                        <strong>₱ {product.price}</strong>
                      </div>
                      <p>{product.description}</p>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </div>

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
                    <i /> Customizable
                  </span>
                )}
              </div>
              <div className="detail-content">
                <div className="detail-title-line">
                  <h2>{selected.name}</h2>
                  <strong>₱ {selected.price}</strong>
                </div>
                <p className="detail-description">{selected.description}</p>
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
                          {item.quantity} × ₱ {item.price}
                          {item.customization && (
                            <small>{item.customization}</small>
                          )}
                        </p>
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

      <CustomerMessage
        isOpen={messageOpen}
        onClose={() => setMessageOpen(false)}
        customerId={customer.id}
      />
      {profileOpen && (
        <CosProfile
          customer={customer}
          orders={trackedOrders}
          ordersError={trackedOrdersError}
          onClose={() => setProfileOpen(false)}
          onTrackOrder={(order) => {
            setProfileOpen(false);
            setTrackingOrder(order);
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
