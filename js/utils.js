// ============================================================
// FoodieHub - Utility Functions
// Shared helpers used across all modules
// ============================================================

// ── Toast Notification ────────────────────────────────────────
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'|'warning'} type - Toast type.
 * @param {number} duration - Duration in ms (default 3000).
 */
export function showToast(message, type = "info", duration = 3000) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "alert");
  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}

// ── Format date ────────────────────────────────────────────────
export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ── Order status badge ─────────────────────────────────────────
export function getStatusBadge(status) {
  const map = {
    Pending: { color: "#F7931E", icon: "⏳" },
    Confirmed: { color: "#3498DB", icon: "✅" },
    Preparing: { color: "#9B59B6", icon: "👨‍🍳" },
    "Out for Delivery": { color: "#E67E22", icon: "🛵" },
    Delivered: { color: "#27AE60", icon: "📦" },
    Cancelled: { color: "#E74C3C", icon: "❌" },
  };
  const s = map[status] || { color: "#888", icon: "❓" };
  return `<span class="status-badge" style="background:${s.color}20;color:${s.color};border-color:${s.color}40">${s.icon} ${status}</span>`;
}

// ── Debounce ───────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Validate email ─────────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Validate phone (Indian format) ────────────────────────────
export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}

// ── Show field error ───────────────────────────────────────────
export function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.add("input-error");
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add("visible");
  }
}

// ── Clear field error ──────────────────────────────────────────
export function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.remove("input-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }
}

// ── Escape HTML to prevent XSS ────────────────────────────────
export function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// ── Require authentication (redirect if not logged in) ────────
export function requireAuth(redirectUrl = "login.html") {
  return new Promise((resolve) => {
    import("./firebase-config.js").then(({ auth }) => {
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(
        ({ onAuthStateChanged }) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (!user) {
              window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.href)}`;
            } else {
              resolve(user);
            }
          });
        }
      );
    });
  });
}

// ── Redirect if already authenticated ─────────────────────────
export function redirectIfAuthenticated(to = "index.html") {
  return new Promise((resolve) => {
    import("./firebase-config.js").then(({ auth }) => {
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(
        ({ onAuthStateChanged }) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
              window.location.href = to;
            } else {
              resolve();
            }
          });
        }
      );
    });
  });
}

// ── Generate order ID ──────────────────────────────────────────
export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FH-${ts}-${rand}`;
}
