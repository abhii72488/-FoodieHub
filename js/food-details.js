// ============================================================
// FoodieHub - Food Details Page
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, where, getDocs, limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar, _updateCartBadge } from "./navigation.js";
import { addToCart, formatCurrency } from "./cart.js";
import { renderFoodCard, bindCardButtons } from "./home.js";
import { showToast } from "./utils.js";

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    showError();
    return;
  }

  await loadFoodDetails(id);
});

// ── Load food details from Firestore ──────────────────────────
async function loadFoodDetails(id) {
  const loading  = document.getElementById("details-loading");
  const content  = document.getElementById("details-content");
  const errorEl  = document.getElementById("details-error");

  try {
    const snap = await getDoc(doc(db, "foodItems", id));
    if (!snap.exists()) { showError(); return; }

    const item = { id: snap.id, ...snap.data() };
    document.title = `${item.name} — FoodieHub`;
    document.getElementById("details-page-title").textContent = item.name;
    document.getElementById("details-breadcrumb").textContent = item.name;

    renderDetails(item, content);
    loading.style.display = "none";
    content.style.display = "block";

    // Load related items
    loadRelated(item);
  } catch (err) {
    console.error("Failed to load food details:", err);
    showError();
  }
}

// ── Render food detail card ───────────────────────────────────
function renderDetails(item, container) {
  const vegLabel = item.isVegetarian
    ? `<span class="veg-badge">🟢 Vegetarian</span>`
    : `<span class="nonveg-badge">🔴 Non-Vegetarian</span>`;

  const availBadge = item.isAvailable
    ? `<span class="avail-badge available">✅ Available</span>`
    : `<span class="avail-badge unavailable">❌ Currently Unavailable</span>`;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-10);align-items:start">
      <!-- Image -->
      <div style="position:relative">
        <img src="${item.imageUrl || 'assets/images/placeholder.jpg'}"
             alt="${item.name}"
             style="width:100%;border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);aspect-ratio:4/3;object-fit:cover"
             onerror="this.src='assets/images/placeholder.jpg'"
             id="detail-img"/>
        ${item.isPopular ? `<div style="position:absolute;top:var(--space-4);left:var(--space-4);background:linear-gradient(135deg,var(--secondary),var(--primary));color:var(--white);padding:6px 14px;border-radius:var(--radius-full);font-weight:700;font-size:var(--text-sm)">⭐ Popular Choice</div>` : ""}
      </div>

      <!-- Info -->
      <div>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)">
          ${vegLabel}
          ${availBadge}
          <span class="food-category-tag" style="font-size:var(--text-sm)">${item.category}</span>
        </div>

        <h1 style="font-size:var(--text-4xl);font-weight:900;color:var(--dark);margin-bottom:var(--space-3)">${item.name}</h1>
        <p style="color:var(--mid);font-size:var(--text-lg);line-height:1.7;margin-bottom:var(--space-6)">${item.description}</p>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
          <span style="font-size:var(--text-4xl);font-weight:900;color:var(--primary)">${formatCurrency(item.price)}</span>
          <span style="font-size:var(--text-sm);color:var(--muted)">per serving</span>
        </div>

        <!-- Quantity selector -->
        ${item.isAvailable ? `
        <div style="margin-bottom:var(--space-5)">
          <label style="display:block;font-weight:600;font-size:var(--text-sm);margin-bottom:var(--space-2);color:var(--dark)">Quantity</label>
          <div class="qty-control" id="detail-qty-control">
            <button class="qty-btn" id="qty-dec" aria-label="Decrease quantity">−</button>
            <span class="qty-value" id="qty-value" aria-live="polite">1</span>
            <button class="qty-btn" id="qty-inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <button class="btn btn-primary" id="detail-add-cart" aria-label="Add ${item.name} to cart" data-id="${item.id}">
            🛒 Add to Cart
          </button>
          <a href="cart.html" class="btn btn-outline">View Cart</a>
        </div>
        ` : `
        <div class="alert alert-warning">
          <span>⚠️</span>
          <span>This item is currently unavailable. Check back soon!</span>
        </div>
        <a href="menu.html" class="btn btn-primary" style="margin-top:var(--space-4)">Browse Other Items</a>
        `}

        <!-- Nutritional info placeholder -->
        <div style="margin-top:var(--space-6);padding:var(--space-4);background:var(--border-light);border-radius:var(--radius-md)">
          <h3 style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-2);color:var(--mid)">ABOUT THIS DISH</h3>
          <p style="font-size:var(--text-sm);color:var(--muted)">
            Category: <strong>${item.category}</strong> ·
            ${item.isVegetarian ? "Vegetarian" : "Non-Vegetarian"} ·
            ${item.isAvailable ? "In stock" : "Out of stock"}
          </p>
        </div>
      </div>
    </div>
  `;

  // Bind quantity buttons
  if (item.isAvailable) {
    let qty = 1;
    const qtyEl = document.getElementById("qty-value");

    document.getElementById("qty-dec").addEventListener("click", () => {
      if (qty > 1) { qty--; qtyEl.textContent = qty; }
    });
    document.getElementById("qty-inc").addEventListener("click", () => {
      if (qty < 20) { qty++; qtyEl.textContent = qty; }
    });

    // Add to cart
    document.getElementById("detail-add-cart").addEventListener("click", async () => {
      const btn = document.getElementById("detail-add-cart");
      try {
        // Re-fetch to get trusted price
        const snap = await getDoc(doc(db, "foodItems", item.id));
        if (!snap.exists() || !snap.data().isAvailable) {
          showToast("This item is currently unavailable.", "error");
          return;
        }
        const freshItem = { id: snap.id, ...snap.data() };
        for (let i = 0; i < qty; i++) addToCart(freshItem);
        _updateCartBadge();
        showToast(`🛒 ${qty}× ${freshItem.name} added to cart!`, "success");
        btn.textContent = "✓ Added!";
        btn.classList.add("added");
        setTimeout(() => { btn.textContent = "🛒 Add to Cart"; btn.classList.remove("added"); }, 1500);
      } catch (err) {
        console.error("Add to cart error:", err);
        showToast("Failed to add to cart. Try again.", "error");
      }
    });
  }
}

// ── Load related items ────────────────────────────────────────
async function loadRelated(currentItem) {
  try {
    const q = query(
      collection(db, "foodItems"),
      where("category", "==", currentItem.category),
      where("isAvailable", "==", true),
      limit(5)
    );
    const snap = await getDocs(q);
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((i) => i.id !== currentItem.id)
      .slice(0, 4);

    if (items.length === 0) return;

    const section = document.getElementById("related-section");
    const grid    = document.getElementById("related-grid");
    section.hidden = false;
    grid.innerHTML = items.map(renderFoodCard).join("");
    bindCardButtons(grid);
  } catch (err) {
    console.warn("Failed to load related items:", err);
  }
}

// ── Show error state ──────────────────────────────────────────
function showError() {
  document.getElementById("details-loading").style.display = "none";
  document.getElementById("details-error").style.display = "flex";
}
