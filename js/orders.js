// ============================================================
// FoodieHub - My Orders Page Logic
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar } from "./navigation.js";
import { requireAuth } from "./auth.js";
import { formatDate, getStatusBadge, formatCurrency, showToast } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  const user = await requireAuth("login.html");
  await loadOrders(user.uid);

  // Status filter
  document.getElementById("order-status-filter")?.addEventListener("change", async () => {
    await loadOrders(user.uid);
  });
});

// ── Load user orders from Firestore ──────────────────────────
async function loadOrders(userId) {
  const loading = document.getElementById("orders-loading");
  const content = document.getElementById("orders-content");
  const empty   = document.getElementById("orders-empty");
  const list    = document.getElementById("orders-list");

  loading.style.display = "flex";
  content.style.display = "none";
  empty.style.display   = "none";

  try {
    // Firestore security rules enforce: only user's own orders are readable
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    loading.style.display = "none";

    if (snap.empty) {
      empty.style.display = "flex";
      return;
    }

    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Apply client-side status filter
    const filterVal = document.getElementById("order-status-filter")?.value || "all";
    if (filterVal !== "all") {
      orders = orders.filter((o) => o.status === filterVal);
    }

    const countEl = document.getElementById("orders-count");
    if (countEl) countEl.textContent = `${orders.length} order${orders.length !== 1 ? "s" : ""}`;

    if (orders.length === 0) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span><p>No orders with this status.</p></div>`;
    } else {
      list.innerHTML = orders.map(renderOrderCard).join("");
      bindOrderButtons(list, userId);
    }

    content.style.display = "block";
  } catch (err) {
    console.error("Orders load error:", err);
    loading.style.display = "none";
    content.style.display = "block";
    list.innerHTML = `<div class="error-state"><span>⚠️</span><p>Failed to load orders. Please try again.</p></div>`;
  }
}

// ── Render single order card ─────────────────────────────────
function renderOrderCard(order) {
  const date = formatDate(order.createdAt);
  const canCancel = ["Pending", "Confirmed"].includes(order.status);

  const itemsList = (order.items || []).map((item) => `
    <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border-light);font-size:var(--text-sm)">
      <span>${item.name} × ${item.quantity}</span>
      <span style="font-weight:600">${formatCurrency(item.subtotal)}</span>
    </div>
  `).join("");

  return `
    <article class="card" style="margin-bottom:var(--space-4)" role="listitem">
      <div class="order-header" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2)">
        <div>
          <div style="font-size:var(--text-xs);color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Order ID</div>
          <div style="font-family:monospace;font-weight:700;font-size:var(--text-base);color:var(--dark)">${order.id.slice(0,12).toUpperCase()}</div>
          <div style="font-size:var(--text-xs);color:var(--muted);margin-top:2px">${date}</div>
        </div>
        <div style="text-align:right">
          ${getStatusBadge(order.status)}
          <div style="font-size:var(--text-xl);font-weight:900;color:var(--primary);margin-top:var(--space-1)">${formatCurrency(order.totalAmount)}</div>
        </div>
      </div>

      <!-- Items -->
      <div style="margin-bottom:var(--space-4)">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Items Ordered</div>
        ${itemsList}
      </div>

      <!-- Delivery address -->
      <div style="background:var(--border-light);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-sm)">
        <span style="font-weight:700">📍 </span>
        ${order.deliveryAddress?.address || "—"}, ${order.deliveryAddress?.city || "—"}
        ${order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}
      </div>

      <!-- Actions -->
      ${canCancel ? `
        <button class="btn btn-outline btn-sm cancel-order-btn"
          data-order-id="${order.id}"
          style="border-color:var(--error);color:var(--error)"
          aria-label="Cancel order ${order.id.slice(0,8)}">
          ❌ Cancel Order
        </button>
      ` : ""}
    </article>
  `;
}

// ── Bind cancel buttons ───────────────────────────────────────
function bindOrderButtons(container, userId) {
  container.querySelectorAll(".cancel-order-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to cancel this order?")) return;
      const orderId = btn.dataset.orderId;
      btn.disabled = true;
      btn.textContent = "Cancelling…";

      try {
        // Security rules enforce: users can only cancel their own Pending/Confirmed orders
        await updateDoc(doc(db, "orders", orderId), {
          status: "Cancelled",
          updatedAt: serverTimestamp(),
        });
        showToast("Order cancelled successfully.", "info");
        await loadOrders(userId);
      } catch (err) {
        console.error("Cancel order error:", err);
        showToast("Failed to cancel order. Check your permissions.", "error");
        btn.disabled = false;
        btn.textContent = "❌ Cancel Order";
      }
    });
  });
}
