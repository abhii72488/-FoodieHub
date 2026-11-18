// ============================================================
// FoodieHub - Cart Page Logic
// ============================================================

import { renderNavbar, _updateCartBadge } from "./navigation.js";
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getCartTotals,
  formatCurrency,
} from "./cart.js";
import { showToast } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  renderCartPage();

  // Re-render whenever cart changes (qty buttons trigger cartUpdated)
  window.addEventListener("cartUpdated", renderCartPage);
});

function renderCartPage() {
  const cart = getCart();
  const loading    = document.getElementById("cart-loading");
  const layout     = document.getElementById("cart-layout");
  const emptyState = document.getElementById("empty-cart-state");

  if (loading) loading.style.display = "none";

  if (cart.length === 0) {
    if (layout)     layout.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (layout)     layout.style.display = "grid";

  renderItems(cart);
  renderSummary();
}

// ── Render cart item list ─────────────────────────────────────
function renderItems(cart) {
  const list  = document.getElementById("cart-item-list");
  const count = document.getElementById("cart-item-count");
  if (!list) return;

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  if (count) count.textContent = `(${totalQty} item${totalQty !== 1 ? "s" : ""})`;

  list.innerHTML = cart.map((item) => `
    <article class="cart-item" role="listitem" data-id="${item.id}">
      <img src="${item.imageUrl || 'assets/images/placeholder.jpg'}"
           alt="${item.name}"
           class="cart-item-img"
           onerror="this.src='assets/images/placeholder.jpg'"
           loading="lazy"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-category">${item.category || ""}
          ${item.isVegetarian ? "· 🟢 Veg" : "· 🔴 Non-Veg"}
        </div>
        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
      </div>
      <div class="cart-item-controls">
        <div class="qty-control">
          <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity of ${item.name}">−</button>
          <span class="qty-value" aria-live="polite">${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase quantity of ${item.name}">+</button>
        </div>
        <div class="cart-item-subtotal">${formatCurrency(item.price * item.quantity)}</div>
        <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove ${item.name} from cart" title="Remove item">
          ✕
        </button>
      </div>
    </article>
  `).join("");

  // Bind qty buttons
  list.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id  = btn.dataset.id;
      const act = btn.dataset.action;
      const cur = getCart().find((i) => i.id === id);
      if (!cur) return;
      const newQty = act === "inc" ? cur.quantity + 1 : cur.quantity - 1;
      updateCartQuantity(id, newQty);
      _updateCartBadge();
    });
  });

  // Bind remove buttons
  list.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id   = btn.dataset.id;
      const name = getCart().find((i) => i.id === id)?.name || "Item";
      removeFromCart(id);
      _updateCartBadge();
      showToast(`${name} removed from cart.`, "info");
    });
  });
}

// ── Render order summary ──────────────────────────────────────
function renderSummary() {
  const { subtotal, deliveryFee, tax, total } = getCartTotals();

  document.getElementById("summary-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("summary-delivery").textContent = deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee);
  document.getElementById("summary-tax").textContent      = formatCurrency(tax);
  document.getElementById("summary-total").textContent    = formatCurrency(total);

  const gapEl = document.getElementById("free-delivery-gap");
  const infoEl = document.getElementById("delivery-info");
  if (deliveryFee === 0) {
    if (infoEl) infoEl.innerHTML = "🎉 You've got <strong>FREE delivery</strong>!";
  } else {
    const gap = 500 - subtotal;
    if (gapEl) gapEl.textContent = formatCurrency(gap).replace("₹","");
  }

  const deliveryRow = document.getElementById("delivery-row");
  if (deliveryRow) {
    const rowValue = deliveryRow.querySelector(".value");
    if (rowValue && deliveryFee === 0) rowValue.style.color = "var(--success)";
  }
}

// ── Clear cart button ─────────────────────────────────────────
document.getElementById("clear-cart-btn")?.addEventListener("click", () => {
  if (!confirm("Are you sure you want to clear your entire cart?")) return;
  clearCart();
  _updateCartBadge();
  showToast("Cart cleared.", "info");
});
