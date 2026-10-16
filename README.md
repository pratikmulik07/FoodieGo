# FoodieGo OFDS — Online Food Ordering System (FA2)

A fresh, self-contained Online Food Ordering System built from scratch with **plain HTML, CSS and vanilla JavaScript**. It runs entirely in the browser (no backend, no build tools, no paid services) and demonstrates the **Factory Method** design pattern in a real, working checkout flow.

This is a **new project** created for the Software Design Patterns FA2 assignment. It does not reuse any files from the earlier Agile assignment.

---

## 1. Project Overview

FoodieGo (OFDS) lets a customer:

1. Browse a catalogue of 14 food items.
2. Search by food name and filter by category.
3. Add items to a cart, change quantities and remove items.
4. Choose an **Order Type**: **Home Delivery** or **Self Pickup**.
5. Enter customer details and (for delivery only) a delivery address.
6. See a live order summary (subtotal, delivery fee, grand total).
7. Place the order and get a confirmation plus a persistent order history.
8. Optionally use a simple **demo login** session (no password).

Cart contents, order history and the demo session are stored in `localStorage`.

---

## 2. Features

- **Header** with app name, navigation, cart item count and login/logout button.
- **Hero** banner with the orange-and-pink brand theme.
- **Food catalogue**: 14 items, each card shows image, name, description, category, price and an *Add to Cart* button.
- **Search** by food name (live filtering).
- **Category filters** (Pizza, Burger, Indian, Chinese, Continental, Snacks, Desserts, Beverages).
- **Cart** with increase/decrease quantity and remove item.
- **Checkout form** with customer name, phone, **Order Type** dropdown and a delivery address field that appears only for Home Delivery.
- **Live order summary**: subtotal, delivery fee, grand total, plus a helpful fee hint.
- **Order confirmation** card with order ID, date, items and totals.
- **Order history** showing every previous order with its type, address (delivery) and totals.
- **Demo login/logout** session that prefills the checkout.
- **Validation & feedback**: empty-cart, name/phone/address validation, success and error messages, toast notifications.
- **Responsive layout** for desktop and mobile (collapsible navigation).
- **Resilient images**: external food images with an automatic generated-SVG fallback if any image fails to load. The app keeps working even with no internet.

---

## 3. Project Structure

```
OFDS_FA2_Fresh/
├── index.html          # Page markup (single checkout form, unique IDs)
├── style.css           # Orange-and-pink responsive theme
├── app.js              # All application logic (Factory Method + cart + UI)
├── README.md           # This document
└── tests/
    ├── run-tests.js    # Automated test runner (Node.js + optional jsdom)
    └── browser-test.js # Optional real-browser E2E test (puppeteer-core)
```

There is exactly one copy of each application file. No nested project folders.

---

## 4. How the Factory Method Pattern Is Implemented

The pattern lives in **Section 2 of `app.js`**.

| GoF role | In this project |
|---|---|
| **Product** | The order object built by `OrderCreator.createOrder(...)` — a consistent structure with `id`, `orderType`, `customer`, `items`, `subtotal`, `deliveryFee`, `total`, `placedAt` and `deliveryAddress`. |
| **Creator (abstract)** | `OrderCreator` — declares the factory method `createOrder()` and the hooks `getOrderType()`, `getDeliveryFee()`, `requiresAddress()`, `decorate()`. |
| **Concrete Creators** | `DeliveryOrderCreator` and `TakeawayOrderCreator`. |
| **Factory selector** | `getOrderCreator(orderType)` returns the correct creator instance. |
| **Client** | The checkout flow (`handleCheckoutSubmit`), which depends only on the abstract `OrderCreator`. |

```js
class OrderCreator {                 // abstract Creator
  getOrderType()      { throw new Error('implement me'); }
  getDeliveryFee(s)   { throw new Error('implement me'); }
  requiresAddress()   { return false; }
  createOrder(params) { /* the FACTORY METHOD - builds the Product */ }
  decorate(order, address) { /* hook for subclasses */ }
}

class DeliveryOrderCreator extends OrderCreator { /* fee rule + address */ }
class TakeawayOrderCreator extends OrderCreator { /* fee = 0, no address */ }

function getOrderCreator(orderType) {
  return orderType === 'delivery' ? new DeliveryOrderCreator()
       : orderType === 'takeaway' ? new TakeawayOrderCreator()
       : (() => { throw new Error('Unsupported order type'); })();
}
```

At checkout the client does (simplified):

```js
const creator = getOrderCreator(orderType);   // factory selects the creator
const order   = creator.createOrder({ ... }); // creator builds the correct product
```

The client never branches on `delivery` vs `takeaway` itself — it only uses the base interface. Adding a new order type means adding **one** new creator class and **one** line in `getOrderCreator()`; the cart, totals, validation and UI stay untouched.

---

## 5. How the Delivery Fee Is Calculated

The fee rule lives in `DeliveryOrderCreator.getDeliveryFee(subtotal)` — a single source of truth used both for the on-screen summary and the final order.

**Home Delivery**

| Food subtotal | Delivery fee | Grand total |
|---|---|---|
| ₹220 | ₹40 | ₹260 |
| ₹450 | ₹40 | ₹490 |
| ₹498 | ₹40 | ₹538 |
| ₹499 | ₹0 (free) | ₹499 |
| ₹600 | ₹0 (free) | ₹600 |

Rule: **subtotal < ₹499 → ₹40, otherwise ₹0.**

**Self Pickup**

- Delivery fee is **always ₹0**; grand total equals the subtotal (e.g. ₹220 → ₹0 → ₹220).
- The delivery address field is hidden and not validated.

**Dynamic behaviour:** changing the order type immediately updates the address visibility, its `required` state, the fee and the grand total. Changing cart quantities recalculates everything. Totals are always computed from numeric `price × qty`, never from the formatted strings shown in the HTML.

---

## 6. How to Run in VS Code with Live Server

1. Open the `OFDS_FA2_Fresh` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you have not already.
3. Right-click `index.html` in the Explorer and choose **"Open with Live Server"**
   (or click **Go Live** in the status bar).
4. Your browser opens at something like `http://127.0.0.1:5500/index.html`.

No install, build step or server configuration is required. You can also just double-click `index.html`, but Live Server is recommended so `localStorage` behaves consistently.

---

## 7. Manual Test Instructions

### A. Home Delivery
1. Click **Add to Cart** on *Margherita Pizza* (₹220).
2. Ensure **Order Type** = **Home Delivery** and the **Delivery Address** field is visible.
3. Confirm the summary shows **Subtotal ₹220**, **Delivery Fee ₹40**, **Grand Total ₹260**.
4. Add another item so the subtotal reaches **₹499 or more** and confirm the fee becomes **₹0** (free delivery).
5. Enter name and a 10-digit phone. Try placing the order **without** an address — you should see an address validation error.
6. Enter an address and click **Place Order** — a confirmation appears with order ID, type, address and totals, and the order appears in **Order History**.
7. Reload the page — the cart is empty and the order history is still there.

### B. Self Pickup
1. Add items (e.g. *Masala Chai* ₹40 × 2 = ₹80).
2. Set **Order Type** = **Self Pickup**.
3. Confirm the **Delivery Address** field is hidden and **Delivery Fee is ₹0**; the grand total equals the subtotal.
4. Enter name and phone and click **Place Order** — it succeeds without an address.
5. Check the confirmation and history show **Self Pickup** and **no address**.

### C. Live order-type switching
1. With items in the cart, switch between **Home Delivery** and **Self Pickup** repeatedly.
2. The address field, fee and grand total must update instantly, with no leftover (stale) amounts.

### D. Edge cases
- Empty cart → *Place Order* shows "cart is empty".
- Short/invalid name or phone → validation error.
- Broken image → the card shows a generated coloured placeholder for that dish instead of a broken icon.

---

## 8. Automated Tests

The project ships with two test runners (test tooling only; the app itself has zero dependencies).

### a) Logic + HTML + jsdom integration — `tests/run-tests.js`
```powershell
node tests/run-tests.js
```
- Runs `node --check app.js`.
- Checks HTML structure: unique IDs, exactly one `coOrderType` / `checkoutOrderTypeField` / `coAddress` / checkout form, exact dropdown options, correct field order, no nested `<select>`.
- Unit-tests the Factory Method creators and `getOrderCreator()`.
- Tests every delivery-fee example and pickup example.
- Tests validation, cart maths, `localStorage` sanitisation/recovery.
- If **jsdom** is available, also runs integration tests against the real DOM (add to cart, quantity changes, order-type switching, checkout, history, persistence, recovery).

To enable the jsdom integration tests (optional, non-project dependency):
```powershell
npm install jsdom --prefix "$env:TEMP\ofds-deps"
$env:OFDS_JSDOM_PATH = "$env:TEMP\ofds-deps\node_modules\jsdom"
node tests/run-tests.js
```

### b) Real-browser E2E — `tests/browser-test.js`
Drives an actual Chrome/Edge instance via `puppeteer-core` (installed outside the project) using a throwaway local HTTP server.
```powershell
npm install puppeteer-core --prefix "$env:TEMP\ofds-deps"
$env:OFDS_PUPPETEER_PATH = "$env:TEMP\ofds-deps\node_modules\puppeteer-core"
$env:OFDS_BROWSER_PATH   = "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tests/browser-test.js
```
See `tests/test-checklist.md` for the full list of executed tests and their outcomes.

---

## 9. Limitations (Demo Only)

- No real backend, database, authentication or payment gateway. **No sensitive data, passwords or card details are collected or stored.**
- The "login" is a demo session only (name + phone, kept in `localStorage`).
- Prices, menu and images are static sample data.
- Order history is stored per browser in `localStorage` (cleared if the user clears site data).
- External food images require internet; without it the built-in generated placeholders are used.
- Currency is a fixed demo format in Indian Rupees (₹); no tax or currency conversion is applied.

---

*Built as a student capstone-style demonstration of the Factory Method pattern. Demo use only.*
