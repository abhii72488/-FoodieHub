// ============================================================
// FoodieHub - Order Confirmation Page Logic
// ============================================================

import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar } from "./navigation.js";
import { formatDate, formatCurrency } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  if (!orderId) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("conf-order-id").textContent = `Order #${orderId.slice(0, 12).toUpperCase()}`;

  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) {
      document.getElementById("conf-details").innerHTML = "<p style='color:var(--muted)'>Order details unavailable.</p>";
      return;
    }

    const order = snap.data();
    const details = document.getElementById("conf-details");

    details.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
        <span style="color:var(--muted);font-size:var(--text-sm)">Placed on</span>
        <span style="font-weight:600;font-size:var(--text-sm)">${formatDate(order.createdAt)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
        <span style="color:var(--muted);font-size:var(--text-sm)">Items ordered</span>
        <span style="font-weight:600;font-size:var(--text-sm)">${(order.items || []).length} item(s)</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
        <span style="color:var(--muted);font-size:var(--text-sm)">Total amount</span>
        <span style="font-weight:800;font-size:var(--text-base);color:var(--primary)">${formatCurrency(order.totalAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
        <span style="color:var(--muted);font-size:var(--text-sm)">Payment</span>
        <span style="font-weight:600;font-size:var(--text-sm)">${order.paymentMethod || "Cash on Delivery"}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:var(--muted);font-size:var(--text-sm)">Deliver to</span>
        <span style="font-weight:600;font-size:var(--text-sm);text-align:right;max-width:200px">
          ${order.deliveryAddress?.address || "—"}, ${order.deliveryAddress?.city || ""}
        </span>
      </div>
    `;
  } catch (err) {
    console.error("Failed to load order:", err);
  }
});
