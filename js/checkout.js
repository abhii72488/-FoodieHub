// ============================================================
// FoodieHub - Checkout Page Logic
// ============================================================

import { db, auth } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthChange } from "./auth.js";
import {
  getCart,
  getCartTotals,
  formatCurrency,
  clearCart,
  clearFirestoreCart,
} from "./cart.js";
import { renderNavbar } from "./navigation.js";
import {
  isValidPhone,
  showFieldError,
  clearFieldError,
  showToast,
} from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  populateCheckoutSummary();

  onAuthChange((user) => {
    const notice = document.getElementById("auth-required-notice");
    const form   = document.getElementById("checkout-form");
    if (!user) {
      notice?.style && (notice.style.display = "flex");
      form && (form.style.display = "none");
    } else {
      notice?.style && (notice.style.display = "none");
      form && (form.style.display = "grid");
      prefillUserDetails(user);
    }
  });

  document.getElementById("checkout-form")?.addEventListener("submit", handleCheckout);
});

// ── Populate order summary from cart ─────────────────────────
function populateCheckoutSummary() {
  const cart   = getCart();
  const list   = document.getElementById("checkout-items-list");
  const { subtotal, deliveryFee, tax, total } = getCartTotals();

  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  list.innerHTML = cart.map((item) => `
    <div class="checkout-item">
      <img src="${item.imageUrl || 'assets/images/placeholder.jpg'}"
           alt="${item.name}"
           class="checkout-item-img"
           onerror="this.src='assets/images/placeholder.jpg'"
           loading="lazy"/>
      <div class="checkout-item-info">
        <div class="checkout-item-name">${item.name}</div>
        <div class="checkout-item-qty">Qty: ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">${formatCurrency(item.price * item.quantity)}</div>
    </div>
  `).join("");

  document.getElementById("co-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("co-delivery").textContent = deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee);
  document.getElementById("co-tax").textContent      = formatCurrency(tax);
  document.getElementById("co-total").textContent    = formatCurrency(total);
}

// ── Prefill delivery name from user profile ───────────────────
async function prefillUserDetails(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const profile = snap.data();
      const nameEl  = document.getElementById("delivery-name");
      const phoneEl = document.getElementById("delivery-phone");
      const addrEl  = document.getElementById("delivery-address");
      if (nameEl && !nameEl.value)  nameEl.value  = profile.name  || "";
      if (phoneEl && !phoneEl.value) phoneEl.value = profile.phone || "";
      if (addrEl && !addrEl.value)  addrEl.value  = profile.address || "";
    }
  } catch (_) { /* non-critical */ }
}

// ── Checkout form submission ──────────────────────────────────
async function handleCheckout(e) {
  e.preventDefault();
  clearAllErrors();

  const user = auth.currentUser;
  if (!user) {
    showToast("Please log in to place an order.", "error");
    return;
  }

  const name         = document.getElementById("delivery-name").value.trim();
  const phone        = document.getElementById("delivery-phone").value.trim();
  const address      = document.getElementById("delivery-address").value.trim();
  const city         = document.getElementById("delivery-city").value.trim();
  const postalCode   = document.getElementById("delivery-postal").value.trim();
  const instructions = document.getElementById("delivery-instructions").value.trim();

  // ── Validation ──────────────────────────────────────────────
  let valid = true;
  if (!name) {
    showFieldError("delivery-name", "Full name is required.");
    valid = false;
  }
  if (!phone || !isValidPhone(phone)) {
    showFieldError("delivery-phone", "Enter a valid 10-digit phone number.");
    valid = false;
  }
  if (!address) {
    showFieldError("delivery-address", "Delivery address is required.");
    valid = false;
  }
  if (!city) {
    showFieldError("delivery-city", "City is required.");
    valid = false;
  }
  if (!postalCode || !/^\d{6}$/.test(postalCode)) {
    showFieldError("delivery-postal", "Enter a valid 6-digit postal code.");
    valid = false;
  }
  if (!valid) return;

  // ── Disable button to prevent duplicate submission ──────────
  const placeBtn = document.getElementById("place-order-btn");
  placeBtn.disabled = true;
  placeBtn.textContent = "Placing Order…";

  try {
    const cartItems = getCart();
    if (cartItems.length === 0) {
      showToast("Your cart is empty.", "error");
      placeBtn.disabled = false;
      placeBtn.textContent = "✅ Place Order";
      return;
    }

    // ── Verify prices against Firestore (trusted prices) ───────
    const verifiedItems = [];
    let serverTotal = 0;

    for (const cartItem of cartItems) {
      const snap = await getDoc(doc(db, "foodItems", cartItem.id));
      if (!snap.exists()) {
        showToast(`"${cartItem.name}" is no longer available.`, "error");
        placeBtn.disabled = false;
        placeBtn.textContent = "✅ Place Order";
        return;
      }
      const serverItem = snap.data();
      if (!serverItem.isAvailable) {
        showToast(`"${serverItem.name}" is currently unavailable.`, "error");
        placeBtn.disabled = false;
        placeBtn.textContent = "✅ Place Order";
        return;
      }
      const subtotal = serverItem.price * cartItem.quantity;
      serverTotal += subtotal;
      verifiedItems.push({
        foodItemId: cartItem.id,
        name:       serverItem.name,
        price:      serverItem.price,       // ← Trusted server price
        quantity:   cartItem.quantity,
        subtotal,
      });
    }

    const deliveryFee = serverTotal >= 500 ? 0 : 40;
    const tax         = Math.round(serverTotal * 0.05);
    const totalAmount = serverTotal + deliveryFee + tax;

    // ── Create order in Firestore ───────────────────────────────
    const orderRef = await addDoc(collection(db, "orders"), {
      userId:  user.uid,
      items:   verifiedItems,
      totalAmount,
      deliveryFee,
      tax,
      deliveryAddress: { name, phone, address, city, postalCode, instructions },
      status:     "Pending",
      paymentMethod: "Cash on Delivery",
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });

    // ── Clear cart on success ───────────────────────────────────
    clearCart();
    await clearFirestoreCart(user.uid);

    // ── Redirect to confirmation ────────────────────────────────
    window.location.href = `order-confirmation.html?orderId=${orderRef.id}`;
  } catch (err) {
    console.error("Order placement failed:", err);
    showToast("Failed to place order. Please try again.", "error");
    placeBtn.disabled = false;
    placeBtn.textContent = "✅ Place Order";
  }
}

function clearAllErrors() {
  ["delivery-name","delivery-phone","delivery-address","delivery-city","delivery-postal"]
    .forEach(clearFieldError);
}
