'use strict';

/* ============================================================================
 * FoodieGo OFDS - Online Food Ordering System
 * Vanilla JavaScript (no frameworks, no build tools, no backend).
 *
 * FILE LAYOUT
 *   Section 1: Constants and food catalogue
 *   Section 2: FACTORY METHOD design pattern (Order / Creators / getOrderCreator)
 *   Section 3: Pure helper functions (safe to unit-test in Node.js)
 *   Section 4: Application state + localStorage persistence
 *   Section 5: DOM references and rendering
 *   Section 6: Event wiring and application boot
 * ==========================================================================*/

/* ---------------------------------------------------------------------------
 * SECTION 1: CONSTANTS AND FOOD CATALOGUE
 * -------------------------------------------------------------------------*/
const FREE_DELIVERY_THRESHOLD = 499; // rupees
const DELIVERY_FEE = 40;             // rupees, charged when subtotal < 499 (delivery only)
const MAX_QTY_PER_ITEM = 20;
const MAX_ORDER_HISTORY = 25;

const STORAGE_KEYS = Object.freeze({
  cart: 'ofds_fa2_fresh_cart',
  orders: 'ofds_fa2_fresh_orders',
  session: 'ofds_fa2_fresh_session'
});

const FOOD_ITEMS = Object.freeze([
  { id: 'f01', name: 'Margherita Pizza',            category: 'Pizza',        price: 220, emoji: '\u{1F355}', description: 'Classic wood-fired pizza with mozzarella, tomato sauce and fresh basil.', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=70&auto=format&fit=crop' },
  { id: 'f02', name: 'Farmhouse Paneer Pizza',     category: 'Pizza',        price: 320, emoji: '\u{1F355}', description: 'Loaded pizza with paneer, capsicum, onion and a extra-cheese pull.', image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&q=70&auto=format&fit=crop' },
  { id: 'f03', name: 'Classic Veg Burger',         category: 'Burger',       price: 180, emoji: '\u{1F354}', description: 'Crispy vegetable patty, lettuce, tomato and house sauce in a soft bun.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=70&auto=format&fit=crop' },
  { id: 'f04', name: 'Cheese Loaded Burger',       category: 'Burger',       price: 220, emoji: '\u{1F354}', description: 'Double cheese, grilled patty and caramelised onion for the cheese lovers.', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=70&auto=format&fit=crop' },
  { id: 'f05', name: 'Paneer Butter Masala',       category: 'Indian',       price: 280, emoji: '\u{1F35B}', description: 'Soft paneer cubes simmered in a rich, creamy tomato-butter gravy.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=70&auto=format&fit=crop' },
  { id: 'f06', name: 'Hyderabadi Chicken Biryani', category: 'Indian',       price: 320, emoji: '\u{1F35A}', description: 'Fragrant basmati rice layered with spiced chicken, saffron and fried onions.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=70&auto=format&fit=crop' },
  { id: 'f07', name: 'Veg Hakka Noodles',          category: 'Chinese',      price: 190, emoji: '\u{1F35C}', description: 'Wok-tossed noodles with crunchy vegetables and smoky soy-garlic sauce.', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=70&auto=format&fit=crop' },
  { id: 'f08', name: 'Chilli Chicken Dry',         category: 'Chinese',      price: 240, emoji: '\u{1F356}', description: 'Crispy chicken tossed with chillies, garlic, capsicum and spring onion.', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&q=70&auto=format&fit=crop' },
  { id: 'f09', name: 'Creamy Alfredo Pasta',       category: 'Continental',  price: 260, emoji: '\u{1F35D}', description: 'Penne bathed in a silky parmesan-cream sauce with herbs and mushrooms.', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=70&auto=format&fit=crop' },
  { id: 'f10', name: 'Crispy French Fries',        category: 'Snacks',       price: 120, emoji: '\u{1F35F}', description: 'Golden, double-fried potato fries sprinkled with peri-peri masala.', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=70&auto=format&fit=crop' },
  { id: 'f11', name: 'Chicken Tikka Roll',         category: 'Snacks',       price: 160, emoji: '\u{1F32E}', description: 'Smoky chicken tikka, onions and mint mayo rolled in a soft paratha.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=70&auto=format&fit=crop' },
  { id: 'f12', name: 'Chocolate Brownie Sundae',   category: 'Desserts',     price: 150, emoji: '\u{1F368}', description: 'Warm chocolate brownie topped with vanilla ice cream and hot fudge.', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=70&auto=format&fit=crop' },
  { id: 'f13', name: 'Fresh Lime Lemonade',        category: 'Beverages',    price: 90,  emoji: '\u{1F964}', description: 'Chilled mint lemonade with a hint of black salt. Perfect refresher.', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=70&auto=format&fit=crop' },
  { id: 'f14', name: 'Masala Chai',                category: 'Beverages',    price: 40,  emoji: '\u{1F375}', description: 'Slow-simmered Indian tea with ginger, cardamom and milk.', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=70&auto=format&fit=crop' }
]);

/* ---------------------------------------------------------------------------
 * SECTION 2: FACTORY METHOD DESIGN PATTERN
 *
 * GoF roles mapped to this application:
 *
 *   Product (abstract) ...... : the plain "order" object structure produced
 *                               by every creator (see buildBaseOrder below).
 *   Concrete Products ....... : a Delivery Order (has deliveryAddress + fee)
 *                               and a Takeaway Order (no address, fee = 0).
 *   Creator (abstract) ...... : OrderCreator - declares createOrder(), the
 *                               factory method, plus the hooks getDeliveryFee()
 *                               and requiresAddress() that subclasses override.
 *   Concrete Creators ....... : DeliveryOrderCreator and TakeawayOrderCreator.
 *   Client .................. : the checkout flow, which calls
 *                               getOrderCreator(orderType) and then uses only
 *                               the base OrderCreator interface - it never
 *                               needs to know which concrete creator it got.
 *
 * WHY THIS MATTERS HERE: the checkout code is written once against
 * OrderCreator. Adding a new order type (e.g. "Scheduled Delivery") means
 * writing ONE new creator class and ONE new case in getOrderCreator(); the
 * cart, totals display, validation and checkout logic stay untouched -
 * that is the whole point of the Factory Method pattern.
 * -------------------------------------------------------------------------*/

/**
 * Creator (abstract base class).
 * Declares the factory method createOrder(). Subclasses override the
 * template-method hooks getOrderType(), getDeliveryFee() and requiresAddress().
 */
class OrderCreator {

  /** Product type identifier. Must be overridden. */
  getOrderType() {
    throw new Error('Concrete OrderCreator must implement getOrderType()');
  }

  /**
   * Delivery fee for a given food subtotal.
   * Takeaway overrides this to always return 0.
   */
  getDeliveryFee(subtotal) {
    throw new Error('Concrete OrderCreator must implement getDeliveryFee()');
  }

  /** Whether the checkout must collect a delivery address. */
  requiresAddress() {
    return false;
  }

  /**
   * THE FACTORY METHOD.
   * Builds and returns a complete order object with a consistent structure.
   * @param {Object} params
   * @param {Array}  params.cartItems     - priced cart lines [{id,name,price,qty,lineTotal}]
   * @param {Object} params.customer      - {name, phone}
   * @param {number} params.subtotal      - numeric food subtotal
   * @param {string} [params.deliveryAddress] - required for delivery creators
   * @returns {Object} the created order (the Product)
   */
  createOrder(params) {
    const subtotal = Number(params.subtotal) || 0;
    const deliveryFee = this.getDeliveryFee(subtotal);

    const order = {
      id: generateOrderId(),
      orderType: this.getOrderType(),
      customer: {
        name: String(params.customer && params.customer.name || '').trim(),
        phone: String(params.customer && params.customer.phone || '').trim()
      },
      items: (params.cartItems || []).map(function (line) {
        return {
          id: String(line.id),
          name: String(line.name),
          price: Number(line.price) || 0,
          qty: Number(line.qty) || 0,
          lineTotal: Number(line.lineTotal) || (Number(line.price) || 0) * (Number(line.qty) || 0)
        };
      }),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: subtotal + deliveryFee,
      placedAt: new Date().toISOString()
    };

    // Template-method hook: subclasses attach type-specific data here.
    this.decorate(order, params.deliveryAddress);
    return order;
  }

  /** Hook for subclasses to add type-specific fields to the order. */
  decorate(order, deliveryAddress) { /* base adds nothing */ }
}

/**
 * Concrete Creator - Home Delivery orders.
 * Requires a delivery address.
 * Fee rule: subtotal < 499 -> 40 rupees, subtotal >= 499 -> FREE (0).
 */
class DeliveryOrderCreator extends OrderCreator {
  getOrderType() {
    return 'delivery';
  }
  getDeliveryFee(subtotal) {
    return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  }
  requiresAddress() {
    return true;
  }
  decorate(order, deliveryAddress) {
    order.deliveryAddress = String(deliveryAddress || '').trim();
  }
}

/**
 * Concrete Creator - Self Pickup (takeaway) orders.
 * Never requires a delivery address and never charges a delivery fee.
 */
class TakeawayOrderCreator extends OrderCreator {
  getOrderType() {
    return 'takeaway';
  }
  getDeliveryFee() {
    return 0;
  }
  requiresAddress() {
    return false;
  }
  decorate(order /*, deliveryAddress */) {
    order.deliveryAddress = null; // pickup orders never carry an address
  }
}

/**
 * The "factory selector" used by the client (checkout flow).
 * Returns the correct Concrete Creator for the chosen order type.
 */
function getOrderCreator(orderType) {
  switch (orderType) {
    case 'delivery':
      return new DeliveryOrderCreator();
    case 'takeaway':
      return new TakeawayOrderCreator();
    default:
      throw new Error('Unsupported order type: ' + orderType);
  }
}

/* ---------------------------------------------------------------------------
 * SECTION 3: PURE HELPER FUNCTIONS (Node-testable, no DOM access)
 * -------------------------------------------------------------------------*/

/** Generates a short unique order id such as "TG-1a2b3c-482". */
function generateOrderId() {
  const rand = Math.floor(Math.random() * 900 + 100);
  return 'TG-' + Date.now().toString(36) + '-' + rand;
}

/** Formats a number as Indian rupee currency for display ONLY. */
function formatINR(value) {
  const n = Number(value);
  if (!isFinite(n)) return '\u20B90';
  const rounded = Math.round(n * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const whole = parts[0];
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = sign ? whole.slice(1) : whole;
  let lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  if (rest) {
    lastThree = ',' + lastThree;
  }
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const decimals = parts[1] === '00' ? '' : '.' + parts[1];
  return sign + '\u20B9' + formatted + decimals;
}

/**
 * Resolves raw cart entries [{id,qty}] into priced cart lines using the
 * catalogue. Unknown ids and invalid quantities are silently dropped.
 */
function computeCartLines(cart, catalogue) {
  if (!Array.isArray(cart)) return [];
  const byId = {};
  catalogue.forEach(function (item) { byId[item.id] = item; });
  const lines = [];
  cart.forEach(function (entry) {
    if (!entry || typeof entry !== 'object') return;
    const product = byId[entry.id];
    if (!product) return;
    const qty = Math.floor(Number(entry.qty));
    if (!isFinite(qty) || qty <= 0) return;
    lines.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: qty,
      lineTotal: product.price * qty
    });
  });
  return lines;
}

/**
 * Calculates subtotal, delivery fee and grand total from NUMERIC prices.
 * The delivery fee is obtained through the Factory Method creator, so the
 * fee rule lives in exactly one place in the whole application.
 */
function calculateTotals(cartLines, orderType) {
  const subtotal = (Array.isArray(cartLines) ? cartLines : []).reduce(function (sum, line) {
    return sum + (Number(line.price) || 0) * (Number(line.qty) || 0);
  }, 0);
  const creator = getOrderCreator(orderType);
  const deliveryFee = subtotal > 0 ? creator.getDeliveryFee(subtotal) : 0;
  return {
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    grandTotal: subtotal + deliveryFee
  };
}

/**
 * Validates the checkout inputs. Returns an array of human-readable error
 * messages (empty array == valid).
 */
function validateCheckout(input) {
  const errors = [];
  const data = input || {};

  if (!data.hasItems) {
    errors.push('Your cart is empty. Add some food items before checking out.');
  }

  const name = String(data.name || '').trim();
  if (name.length < 2) {
    errors.push('Please enter a valid customer name (at least 2 characters).');
  }

  const phoneDigits = String(data.phone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(phoneDigits)) {
    errors.push('Please enter a valid 10-digit phone number.');
  }

  if (data.orderType !== 'delivery' && data.orderType !== 'takeaway') {
    errors.push('Please select a valid order type.');
  } else if (data.orderType === 'delivery') {
    const address = String(data.address || '').trim();
    if (address.length < 5) {
      errors.push('A delivery address is required for Home Delivery (minimum 5 characters).');
    }
  }

  return errors;
}

/** Safe JSON.parse that returns the fallback on any failure. */
function safeParseJSON(raw, fallback) {
  if (typeof raw !== 'string' || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/** Cleans persisted cart data. Anything invalid becomes an empty cart. */
function sanitizeCart(raw) {
  const parsed = Array.isArray(raw) ? raw : safeParseJSON(raw, []);
  if (!Array.isArray(parsed)) return [];
  const validIds = {};
  FOOD_ITEMS.forEach(function (item) { validIds[item.id] = true; });
  const seen = {};
  const clean = [];
  parsed.forEach(function (entry) {
    if (!entry || typeof entry !== 'object') return;
    const id = String(entry.id || '');
    if (!validIds[id] || seen[id]) return;
    const qty = Math.floor(Number(entry.qty));
    if (!isFinite(qty) || qty <= 0) return;
    seen[id] = true;
    clean.push({ id: id, qty: Math.min(qty, MAX_QTY_PER_ITEM) });
  });
  return clean;
}

/** Cleans persisted order-history data. Anything invalid is dropped. */
function sanitizeOrders(raw) {
  const parsed = Array.isArray(raw) ? raw : safeParseJSON(raw, []);
  if (!Array.isArray(parsed)) return [];
  const clean = [];
  parsed.forEach(function (order) {
    if (!order || typeof order !== 'object') return;
    if (order.orderType !== 'delivery' && order.orderType !== 'takeaway') return;
    if (!Array.isArray(order.items)) return;
    const subtotal = Number(order.subtotal);
    const deliveryFee = Number(order.deliveryFee);
    const total = Number(order.total);
    if (!isFinite(subtotal) || !isFinite(deliveryFee) || !isFinite(total)) return;
    clean.push({
      id: String(order.id || generateOrderId()),
      orderType: order.orderType,
      customer: {
        name: String(order.customer && order.customer.name || 'Customer'),
        phone: String(order.customer && order.customer.phone || '')
      },
      deliveryAddress: order.orderType === 'delivery' ? String(order.deliveryAddress || '') : null,
      items: order.items.map(function (line) {
        return {
          id: String(line && line.id || ''),
          name: String(line && line.name || 'Item'),
          price: Number(line && line.price) || 0,
          qty: Number(line && line.qty) || 0,
          lineTotal: Number(line && line.lineTotal) || 0
        };
      }),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      placedAt: typeof order.placedAt === 'string' ? order.placedAt : new Date().toISOString()
    });
  });
  return clean.slice(0, MAX_ORDER_HISTORY);
}

/** Cleans persisted demo-session data. */
function sanitizeSession(raw) {
  const parsed = typeof raw === 'object' && raw !== null ? raw : safeParseJSON(raw, null);
  if (!parsed || typeof parsed !== 'object') return null;
  const name = String(parsed.name || '').trim();
  const phone = String(parsed.phone || '').replace(/\D/g, '');
  if (name.length < 2 || !/^\d{10}$/.test(phone)) return null;
  return { name: name, phone: phone };
}

/** Builds a data-URI SVG fallback image with a gradient and the food emoji. */
function buildEmojiFallback(emoji, name) {
  const safeEmoji = (emoji || '\u{1F354}').replace(/[<>&"]/g, '');
  const safeName = String(name || 'Food').replace(/[<>&"]/g, '').slice(0, 24);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ff8a3d"/><stop offset="100%" stop-color="#e91e63"/>' +
    '</linearGradient></defs>' +
    '<rect width="600" height="400" fill="url(#g)"/>' +
    '<text x="300" y="195" font-size="120" text-anchor="middle">' + safeEmoji + '</text>' +
    '<text x="300" y="290" font-size="28" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff" text-anchor="middle" opacity="0.95">' + safeName + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---------------------------------------------------------------------------
 * SECTION 4: APPLICATION STATE AND PERSISTENCE
 * -------------------------------------------------------------------------*/

const state = {
  cart: [],            // [{id, qty}]
  orderHistory: [],    // order snapshots
  session: null,       // {name, phone} demo customer
  search: '',
  category: 'All',
  isPlacingOrder: false
};

function loadPersistedState() {
  state.cart = sanitizeCart(readStorage(STORAGE_KEYS.cart));
  state.orderHistory = sanitizeOrders(readStorage(STORAGE_KEYS.orders));
  state.session = sanitizeSession(readStorage(STORAGE_KEYS.session));
}

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) { /* storage may be unavailable (private mode) - app still works */ }
}

function saveCart() {
  writeStorage(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function saveOrders() {
  writeStorage(STORAGE_KEYS.orders, JSON.stringify(state.orderHistory));
}

function saveSession() {
  if (state.session) {
    writeStorage(STORAGE_KEYS.session, JSON.stringify(state.session));
  } else {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.session);
    } catch (e) { /* ignore */ }
  }
}

/* ---------------------------------------------------------------------------
 * SECTION 5: DOM REFERENCES AND RENDERING
 * -------------------------------------------------------------------------*/

let dom = {}; // populated in initApp() after DOMContentLoaded

function cacheDom() {
  dom = {
    navToggle: document.getElementById('navToggle'),
    mainNav: document.getElementById('mainNav'),
    cartCountBadge: document.getElementById('cartCountBadge'),
    authBtn: document.getElementById('authBtn'),
    searchInput: document.getElementById('searchInput'),
    categoryFilters: document.getElementById('categoryFilters'),
    menuStatus: document.getElementById('menuStatus'),
    foodGrid: document.getElementById('foodGrid'),
    cartEmptyMsg: document.getElementById('cartEmptyMsg'),
    cartItems: document.getElementById('cartItems'),
    checkoutForm: document.getElementById('checkoutForm'),
    coName: document.getElementById('coName'),
    coPhone: document.getElementById('coPhone'),
    coOrderType: document.getElementById('coOrderType'),
    checkoutOrderTypeField: document.getElementById('checkoutOrderTypeField'),
    checkoutAddressField: document.getElementById('checkoutAddressField'),
    coAddress: document.getElementById('coAddress'),
    sumSubtotal: document.getElementById('sumSubtotal'),
    sumDeliveryFee: document.getElementById('sumDeliveryFee'),
    sumGrandTotal: document.getElementById('sumGrandTotal'),
    feeHint: document.getElementById('feeHint'),
    checkoutFeedback: document.getElementById('checkoutFeedback'),
    placeOrderBtn: document.getElementById('placeOrderBtn'),
    confirmation: document.getElementById('confirmation'),
    confirmationDetails: document.getElementById('confirmationDetails'),
    newOrderBtn: document.getElementById('newOrderBtn'),
    orderHistoryEmpty: document.getElementById('orderHistoryEmpty'),
    orderHistoryList: document.getElementById('orderHistoryList'),
    loginModal: document.getElementById('loginModal'),
    loginModalClose: document.getElementById('loginModalClose'),
    loginForm: document.getElementById('loginForm'),
    loginName: document.getElementById('loginName'),
    loginPhone: document.getElementById('loginPhone'),
    loginFeedback: document.getElementById('loginFeedback'),
    toast: document.getElementById('toast')
  };
}

/* ---- small DOM helpers (safe text only, no innerHTML for user data) ------*/

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function cartCount() {
  return state.cart.reduce(function (sum, entry) { return sum + entry.qty; }, 0);
}

let toastTimer = null;
function showToast(message, type) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  dom.toast.className = 'toast toast-' + (type || 'info');
  // force reflow so the entry animation replays
  void dom.toast.offsetWidth;
  dom.toast.classList.add('toast-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    dom.toast.classList.remove('toast-visible');
    setTimeout(function () { dom.toast.hidden = true; }, 250);
  }, 2600);
}

function showCheckoutFeedback(message, type) {
  dom.checkoutFeedback.textContent = message || '';
  dom.checkoutFeedback.className = 'feedback' + (type ? ' feedback-' + type : '');
}

/* ---- menu rendering ------------------------------------------------------*/

function getFilteredItems() {
  const query = state.search.trim().toLowerCase();
  return FOOD_ITEMS.filter(function (item) {
    const matchesCategory = state.category === 'All' || item.category === state.category;
    const matchesSearch = query === '' || item.name.toLowerCase().indexOf(query) !== -1;
    return matchesCategory && matchesSearch;
  });
}

function renderCategoryFilters() {
  const categories = ['All'];
  FOOD_ITEMS.forEach(function (item) {
    if (categories.indexOf(item.category) === -1) categories.push(item.category);
  });
  clearChildren(dom.categoryFilters);
  categories.forEach(function (cat) {
    const btn = el('button', 'chip' + (state.category === cat ? ' chip-active' : ''), cat);
    btn.type = 'button';
    btn.dataset.category = cat;
    btn.setAttribute('aria-pressed', state.category === cat ? 'true' : 'false');
    dom.categoryFilters.appendChild(btn);
  });
}

function renderMenu() {
  const items = getFilteredItems();
  clearChildren(dom.foodGrid);

  if (items.length === 0) {
    dom.menuStatus.textContent = 'No items match your search. Try a different name or category.';
    const empty = el('div', 'food-empty');
    empty.appendChild(el('strong', '', 'No dishes found'));
    empty.appendChild(el('p', '', 'Try a different search term, or pick another category.'));
    dom.foodGrid.appendChild(empty);
    return;
  }
  dom.menuStatus.textContent = 'Showing ' + items.length + ' of ' + FOOD_ITEMS.length + ' items';

  items.forEach(function (item) {
    const card = el('article', 'food-card');

    const imgWrap = el('div', 'food-img-wrap');
    const img = document.createElement('img');
    img.className = 'food-img';
    img.alt = item.name;
    img.loading = 'lazy';
    img.src = item.image;
    img.addEventListener('error', function handleError() {
      img.removeEventListener('error', handleError);
      img.src = buildEmojiFallback(item.emoji, item.name); // graceful offline fallback
      img.classList.add('food-img-fallback');
    });
    imgWrap.appendChild(img);
    const catBadge = el('span', 'food-cat', item.category);
    imgWrap.appendChild(catBadge);

    const body = el('div', 'food-body');
    body.appendChild(el('h3', 'food-name', item.name));
    body.appendChild(el('p', 'food-desc', item.description));

    const foot = el('div', 'food-foot');
    foot.appendChild(el('span', 'food-price', formatINR(item.price)));

    const addBtn = el('button', 'btn btn-primary btn-sm', 'Add to Cart');
    addBtn.type = 'button';
    addBtn.dataset.action = 'add';
    addBtn.dataset.id = item.id;
    addBtn.setAttribute('aria-label', 'Add ' + item.name + ' to cart');
    foot.appendChild(addBtn);

    body.appendChild(foot);
    card.appendChild(imgWrap);
    card.appendChild(body);
    dom.foodGrid.appendChild(card);
  });
}

/* ---- cart rendering ------------------------------------------------------*/

function renderCart() {
  const lines = computeCartLines(state.cart, FOOD_ITEMS);
  clearChildren(dom.cartItems);

  dom.cartEmptyMsg.hidden = lines.length > 0;
  dom.cartItems.hidden = lines.length === 0;
  dom.cartCountBadge.textContent = 'Cart (' + cartCount() + ')';

  lines.forEach(function (line) {
    const li = el('li', 'cart-item');
    li.dataset.id = line.id;

    const info = el('div', 'cart-item-info');
    info.appendChild(el('span', 'cart-item-name', line.name));
    info.appendChild(el('span', 'cart-item-price', formatINR(line.price) + ' each'));

    const controls = el('div', 'cart-item-controls');

    const decBtn = el('button', 'qty-btn', '\u2212');
    decBtn.type = 'button';
    decBtn.dataset.action = 'dec';
    decBtn.dataset.id = line.id;
    decBtn.setAttribute('aria-label', 'Decrease quantity of ' + line.name);

    const qty = el('span', 'qty-value', String(line.qty));
    qty.setAttribute('aria-live', 'polite');

    const incBtn = el('button', 'qty-btn', '+');
    incBtn.type = 'button';
    incBtn.dataset.action = 'inc';
    incBtn.dataset.id = line.id;
    incBtn.setAttribute('aria-label', 'Increase quantity of ' + line.name);

    const removeBtn = el('button', 'remove-btn', 'Remove');
    removeBtn.type = 'button';
    removeBtn.dataset.action = 'remove';
    removeBtn.dataset.id = line.id;
    removeBtn.setAttribute('aria-label', 'Remove ' + line.name + ' from cart');

    controls.appendChild(decBtn);
    controls.appendChild(qty);
    controls.appendChild(incBtn);
    controls.appendChild(removeBtn);

    li.appendChild(info);
    li.appendChild(controls);
    dom.cartItems.appendChild(li);
  });
}

/* ---- summary / order-type UI --------------------------------------------*/

/**
 * Keeps the address field, its required state, the delivery fee and the
 * grand total perfectly in sync with the currently selected order type.
 */
function syncOrderTypeUI() {
  const orderType = dom.coOrderType.value;
  const isDelivery = orderType === 'delivery';
  dom.checkoutAddressField.hidden = !isDelivery;
  dom.coAddress.required = isDelivery; // takeaway never validates the address
  if (!isDelivery) {
    dom.coAddress.classList.remove('input-invalid');
  }
  renderSummary();
}

function renderSummary() {
  const lines = computeCartLines(state.cart, FOOD_ITEMS);
  const orderType = dom.coOrderType.value;
  const totals = calculateTotals(lines, orderType);

  dom.sumSubtotal.textContent = formatINR(totals.subtotal);
  dom.sumDeliveryFee.textContent = formatINR(totals.deliveryFee);
  dom.sumGrandTotal.textContent = formatINR(totals.grandTotal);

  let hint = '';
  if (orderType === 'takeaway') {
    hint = 'Self Pickup selected \u2014 delivery fee is always \u20B90.';
  } else if (totals.subtotal === 0) {
    hint = 'Home Delivery: flat \u20B940 below \u20B9499 subtotal. Free delivery on \u20B9499 and above.';
  } else if (totals.deliveryFee > 0) {
    hint = 'Add ' + formatINR(FREE_DELIVERY_THRESHOLD - totals.subtotal) + ' more to unlock FREE delivery.';
  } else {
    hint = 'You have qualified for FREE delivery!';
  }
  dom.feeHint.textContent = hint;
}

/* ---- confirmation and history -------------------------------------------*/

function buildSummaryBlock(order) {
  const box = el('div', 'order-summary-block');
  const rows = [
    ['Order Type', order.orderType === 'delivery' ? 'Home Delivery' : 'Self Pickup']
  ];
  if (order.orderType === 'delivery') {
    rows.push(['Delivery Address', order.deliveryAddress || '\u2014']);
  }
  rows.push(['Subtotal', formatINR(order.subtotal)]);
  rows.push(['Delivery Fee', formatINR(order.deliveryFee)]);
  rows.push(['Grand Total', formatINR(order.total)]);

  rows.forEach(function (pair) {
    const row = el('div', 'summary-row');
    row.appendChild(el('span', '', pair[0]));
    const val = el('strong', '', pair[1]);
    row.appendChild(val);
    box.appendChild(row);
  });
  return box;
}

function showConfirmation(order) {
  clearChildren(dom.confirmationDetails);

  dom.confirmationDetails.appendChild(el('p', 'confirm-id', 'Order ID: ' + order.id));
  dom.confirmationDetails.appendChild(el('p', 'confirm-when', 'Placed on: ' + new Date(order.placedAt).toLocaleString()));

  const itemsBox = el('div', 'confirm-items');
  order.items.forEach(function (line) {
    itemsBox.appendChild(el('p', 'confirm-item', line.qty + ' \u00D7 ' + line.name + ' \u2014 ' + formatINR(line.lineTotal)));
  });
  dom.confirmationDetails.appendChild(itemsBox);

  dom.confirmationDetails.appendChild(buildSummaryBlock(order));

  const cust = el('p', 'confirm-cust', 'Customer: ' + order.customer.name + ' (' + order.customer.phone + ')');
  dom.confirmationDetails.appendChild(cust);

  dom.confirmation.hidden = false;
}

function renderOrderHistory() {
  clearChildren(dom.orderHistoryList);
  dom.orderHistoryEmpty.hidden = state.orderHistory.length > 0;

  state.orderHistory.forEach(function (order) {
    const card = el('article', 'order-card');

    const head = el('div', 'order-card-head');
    head.appendChild(el('span', 'order-id', order.id));
    const badge = el('span', 'order-type-badge ' + (order.orderType === 'delivery' ? 'badge-delivery' : 'badge-takeaway'),
      order.orderType === 'delivery' ? 'Home Delivery' : 'Self Pickup');
    head.appendChild(badge);
    card.appendChild(head);

    card.appendChild(el('p', 'order-meta', new Date(order.placedAt).toLocaleString() + ' \u00B7 ' + order.customer.name));

    if (order.orderType === 'delivery') {
      card.appendChild(el('p', 'order-address', 'Address: ' + (order.deliveryAddress || '\u2014')));
    }

    const list = el('ul', 'order-items');
    order.items.forEach(function (line) {
      list.appendChild(el('li', '', line.qty + ' \u00D7 ' + line.name + ' (' + formatINR(line.lineTotal) + ')'));
    });
    card.appendChild(list);

    card.appendChild(buildSummaryBlock(order));
    dom.orderHistoryList.appendChild(card);
  });
}

/* ---- auth (demo session) -------------------------------------------------*/

function renderAuth() {
  if (state.session) {
    dom.authBtn.textContent = 'Logout (' + state.session.name.split(' ')[0] + ')';
    dom.authBtn.setAttribute('aria-label', 'Logout demo session for ' + state.session.name);
  } else {
    dom.authBtn.textContent = 'Login';
    dom.authBtn.setAttribute('aria-label', 'Login demo customer');
  }
}

function openLoginModal() {
  dom.loginFeedback.textContent = '';
  dom.loginFeedback.className = 'feedback';
  dom.loginModal.hidden = false;
  dom.loginName.focus();
}

function closeLoginModal() {
  dom.loginModal.hidden = true;
}

function prefillCheckoutFromSession() {
  if (state.session) {
    dom.coName.value = state.session.name;
    dom.coPhone.value = state.session.phone;
  }
}

/* ---- master render -------------------------------------------------------*/

function renderAll() {
  renderCategoryFilters();
  renderMenu();
  renderCart();
  renderSummary();
  renderOrderHistory();
  renderAuth();
}

/* ---------------------------------------------------------------------------
 * SECTION 6: EVENT WIRING AND BOOT
 * -------------------------------------------------------------------------*/

function addToCart(id) {
  const existing = state.cart.find(function (entry) { return entry.id === id; });
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, MAX_QTY_PER_ITEM);
  } else {
    state.cart.push({ id: id, qty: 1 });
  }
  saveCart();
  renderCart();
  renderSummary();
  const product = FOOD_ITEMS.find(function (item) { return item.id === id; });
  showToast((product ? product.name : 'Item') + ' added to cart!', 'success');
}

function changeQty(id, delta) {
  const entry = state.cart.find(function (e) { return e.id === id; });
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) {
    state.cart = state.cart.filter(function (e) { return e.id !== id; });
  } else if (entry.qty > MAX_QTY_PER_ITEM) {
    entry.qty = MAX_QTY_PER_ITEM;
  }
  saveCart();
  renderCart();
  renderSummary();
}

function removeItem(id) {
  state.cart = state.cart.filter(function (e) { return e.id !== id; });
  saveCart();
  renderCart();
  renderSummary();
  showToast('Item removed from cart.', 'info');
}

function handleCheckoutSubmit(event) {
  event.preventDefault();

  // Guard against accidental duplicate orders from repeated clicks.
  if (state.isPlacingOrder) return;

  const orderType = dom.coOrderType.value;
  const name = dom.coName.value.trim();
  const phone = dom.coPhone.value.trim();
  const address = dom.coAddress.value.trim();
  const lines = computeCartLines(state.cart, FOOD_ITEMS);

  const errors = validateCheckout({
    hasItems: lines.length > 0,
    name: name,
    phone: phone,
    orderType: orderType,
    address: address
  });

  if (errors.length > 0) {
    showCheckoutFeedback(errors[0], 'error');
    showToast(errors[0], 'error');
    if (orderType === 'delivery' && address.length < 5) {
      dom.coAddress.classList.add('input-invalid');
      dom.coAddress.focus();
    }
    return;
  }

  state.isPlacingOrder = true;
  dom.placeOrderBtn.disabled = true;
  showCheckoutFeedback('Placing your order\u2026', 'info');

  try {
    // ---- FACTORY METHOD IN ACTION -------------------------------------
    // The checkout asks the factory for the right creator and uses only
    // the base OrderCreator interface - it never branches on order type.
    const creator = getOrderCreator(orderType);
    const totals = calculateTotals(lines, orderType);

    const order = creator.createOrder({
      cartItems: lines,
      customer: { name: name, phone: phone },
      subtotal: totals.subtotal,
      deliveryAddress: address
    });
    // -------------------------------------------------------------------

    state.orderHistory.unshift(order);
    if (state.orderHistory.length > MAX_ORDER_HISTORY) {
      state.orderHistory.length = MAX_ORDER_HISTORY;
    }
    saveOrders();

    state.cart = [];
    saveCart();

    dom.checkoutForm.reset();          // back to default order type (delivery)
    dom.coAddress.classList.remove('input-invalid');
    syncOrderTypeUI();                 // no stale totals / visibility
    renderCart();
    renderOrderHistory();
    showConfirmation(order);
    showCheckoutFeedback('Order placed successfully! Order ID: ' + order.id, 'success');
    showToast('Order placed successfully!', 'success');

    dom.confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showCheckoutFeedback(err.message || 'Something went wrong while placing the order.', 'error');
    showToast(err.message || 'Something went wrong.', 'error');
  } finally {
    state.isPlacingOrder = false;
    dom.placeOrderBtn.disabled = false;
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const name = dom.loginName.value.trim();
  const phone = dom.loginPhone.value.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (name.length < 2) {
    dom.loginFeedback.textContent = 'Please enter a valid name (at least 2 characters).';
    dom.loginFeedback.className = 'feedback feedback-error';
    return;
  }
  if (!/^\d{10}$/.test(phoneDigits)) {
    dom.loginFeedback.textContent = 'Please enter a valid 10-digit phone number.';
    dom.loginFeedback.className = 'feedback feedback-error';
    return;
  }

  state.session = { name: name, phone: phoneDigits };
  saveSession();
  renderAuth();
  prefillCheckoutFromSession();
  closeLoginModal();
  showToast('Welcome, ' + name + '! You are logged in (demo session).', 'success');
}

function closeMobileNav() {
  dom.mainNav.classList.remove('nav-open');
  dom.navToggle.setAttribute('aria-expanded', 'false');
}

/**
 * Keeps the CSS scroll offset used for section navigation in sync with the
 * real (possibly wrapped) height of the sticky header, so a jump to
 * #cart-section never hides the heading behind the header.
 */
function syncHeaderOffset() {
  if (typeof document === 'undefined') return;
  const header = document.querySelector('.site-header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-offset', (header.offsetHeight + 12) + 'px');
}

function wireEvents() {
  // Mobile navigation
  dom.navToggle.addEventListener('click', function () {
    const open = dom.mainNav.classList.toggle('nav-open');
    dom.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncHeaderOffset(); // the header grows while the menu is open
  });
  dom.mainNav.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') {
      closeMobileNav();
      syncHeaderOffset(); // header shrinks again before the anchor jump
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && dom.mainNav.classList.contains('nav-open')) closeMobileNav();
  });
  window.addEventListener('resize', syncHeaderOffset);

  // Auth
  dom.authBtn.addEventListener('click', function () {
    if (state.session) {
      const previousName = state.session.name;
      state.session = null;
      saveSession();
      renderAuth();
      showToast('Logged out. Goodbye, ' + previousName + '!', 'info');
    } else {
      openLoginModal();
    }
  });
  dom.loginForm.addEventListener('submit', handleLoginSubmit);
  dom.loginModalClose.addEventListener('click', closeLoginModal);
  dom.loginModal.addEventListener('click', function (event) {
    if (event.target.hasAttribute('data-close-modal')) closeLoginModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !dom.loginModal.hidden) closeLoginModal();
  });

  // Search and category filters
  dom.searchInput.addEventListener('input', function () {
    state.search = dom.searchInput.value;
    renderMenu();
  });
  dom.categoryFilters.addEventListener('click', function (event) {
    const btn = event.target.closest('button[data-category]');
    if (!btn) return;
    state.category = btn.dataset.category;
    renderCategoryFilters();
    renderMenu();
  });

  // Add-to-cart (event delegation, single listener)
  dom.foodGrid.addEventListener('click', function (event) {
    const btn = event.target.closest('button[data-action="add"]');
    if (!btn) return;
    addToCart(btn.dataset.id);
  });

  // Cart quantity / remove (event delegation, single listener)
  dom.cartItems.addEventListener('click', function (event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'inc') changeQty(id, 1);
    else if (btn.dataset.action === 'dec') changeQty(id, -1);
    else if (btn.dataset.action === 'remove') removeItem(id);
  });

  // Order type changes instantly update address visibility + totals
  dom.coOrderType.addEventListener('change', syncOrderTypeUI);

  // Clear stale address error styling while typing
  dom.coAddress.addEventListener('input', function () {
    dom.coAddress.classList.remove('input-invalid');
  });

  // Checkout
  dom.checkoutForm.addEventListener('submit', handleCheckoutSubmit);

  // "Order More" button
  dom.newOrderBtn.addEventListener('click', function () {
    dom.confirmation.hidden = true;
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initApp() {
  cacheDom();
  loadPersistedState();
  wireEvents();
  renderAll();
  syncOrderTypeUI();
  prefillCheckoutFromSession();
  syncHeaderOffset();
}

// Boot once the DOM is ready (guarded so Node.js unit tests can load this file).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

/* Export internals for the Node.js test harness (tests/run-tests.js). */
if (typeof globalThis !== 'undefined') {
  globalThis.__OFDS_TEST__ = {
    OrderCreator: OrderCreator,
    DeliveryOrderCreator: DeliveryOrderCreator,
    TakeawayOrderCreator: TakeawayOrderCreator,
    getOrderCreator: getOrderCreator,
    calculateTotals: calculateTotals,
    computeCartLines: computeCartLines,
    validateCheckout: validateCheckout,
    safeParseJSON: safeParseJSON,
    sanitizeCart: sanitizeCart,
    sanitizeOrders: sanitizeOrders,
    sanitizeSession: sanitizeSession,
    formatINR: formatINR,
    buildEmojiFallback: buildEmojiFallback,
    FOOD_ITEMS: FOOD_ITEMS,
    FREE_DELIVERY_THRESHOLD: FREE_DELIVERY_THRESHOLD,
    DELIVERY_FEE: DELIVERY_FEE,
    STORAGE_KEYS: STORAGE_KEYS
  };
}
