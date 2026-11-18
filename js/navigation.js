// ============================================================
// FoodieHub - Navigation Module
// Handles: Navbar render, mobile menu, auth state UI
// ============================================================

import { auth } from "./firebase-config.js";
import { onAuthChange, logoutUser, fetchUserProfile } from "./auth.js";
import { getCartCount } from "./cart.js";

// ── Determine current page for active nav link ───────────────
const currentPage = window.location.pathname.split("/").pop() || "index.html";

// ── Navigation links config ──────────────────────────────────
const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "menu.html", label: "Menu" },
  { href: "menu.html#categories", label: "Categories" },
  { href: "my-orders.html", label: "My Orders" },
  { href: "about.html", label: "About Us" },
  { href: "contact.html", label: "Contact Us" },
];

// ── Inject the navbar HTML into the page ────────────────────
export function renderNavbar() {
  const navEl = document.getElementById("main-nav");
  if (!navEl) return;

  navEl.innerHTML = `
    <div class="nav-container">
      <a href="index.html" class="nav-logo" aria-label="FoodieHub Home">
        <span class="logo-icon">🍕</span>
        <span class="logo-text">Foodie<span class="logo-accent">Hub</span></span>
      </a>

      <nav class="nav-links" id="nav-links" role="navigation" aria-label="Main navigation">
        ${NAV_LINKS.map(
          (l) =>
            `<a href="${l.href}" class="nav-link${
              currentPage === l.href ? " active" : ""
            }">${l.label}</a>`
        ).join("")}
      </nav>

      <div class="nav-actions">
        <!-- Search -->
        <button class="nav-icon-btn" id="nav-search-btn" aria-label="Open search" title="Search food">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>

        <!-- Cart -->
        <a href="cart.html" class="nav-icon-btn cart-btn" id="nav-cart-btn" aria-label="Shopping cart">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          <span class="cart-badge" id="nav-cart-count" aria-live="polite">0</span>
        </a>

        <!-- Auth area (filled by JS) -->
        <div class="nav-auth" id="nav-auth"></div>

        <!-- Mobile hamburger -->
        <button class="hamburger" id="hamburger-btn" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <!-- Search overlay -->
    <div class="search-overlay" id="search-overlay" role="dialog" aria-label="Search" aria-modal="true" hidden>
      <div class="search-box">
        <input type="search" id="global-search-input" placeholder="Search for food, categories…" autocomplete="off" aria-label="Search food"/>
        <button id="global-search-submit" aria-label="Submit search">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <button id="search-close-btn" aria-label="Close search">✕</button>
      </div>
    </div>
  `;

  _bindNavEvents();
  _updateCartBadge();

  // Listen for auth changes and re-render auth area
  onAuthChange(async (user) => {
    await _renderAuthArea(user);
    _updateCartBadge();
  });
}

// ── Render login/register OR user avatar ─────────────────────
async function _renderAuthArea(user) {
  const authEl = document.getElementById("nav-auth");
  if (!authEl) return;

  if (!user) {
    authEl.innerHTML = `
      <a href="login.html" class="btn btn-outline-sm" id="nav-login-btn">Login</a>
      <a href="register.html" class="btn btn-primary-sm" id="nav-register-btn">Register</a>
    `;
  } else {
    let profile = null;
    try {
      profile = await fetchUserProfile(user.uid);
    } catch (_) {}

    const isAdmin = profile?.role === "admin";
    authEl.innerHTML = `
      <div class="nav-user-menu" id="nav-user-menu">
        <button class="nav-user-btn" id="nav-user-trigger" aria-haspopup="true" aria-expanded="false">
          <span class="user-avatar">${(user.displayName || user.email)[0].toUpperCase()}</span>
          <span class="user-name">${user.displayName || "User"}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="user-dropdown" id="user-dropdown" role="menu">
          <a href="profile.html" class="dropdown-item" role="menuitem">👤 My Profile</a>
          <a href="my-orders.html" class="dropdown-item" role="menuitem">📦 My Orders</a>
          ${isAdmin ? `<a href="admin.html" class="dropdown-item admin-link" role="menuitem">⚙️ Admin Dashboard</a>` : ""}
          <hr class="dropdown-divider"/>
          <button class="dropdown-item logout-item" id="nav-logout-btn" role="menuitem">🚪 Logout</button>
        </div>
      </div>
    `;

    document.getElementById("nav-user-trigger")?.addEventListener("click", () => {
      const dropdown = document.getElementById("user-dropdown");
      const trigger = document.getElementById("nav-user-trigger");
      const isOpen = dropdown.classList.toggle("open");
      trigger.setAttribute("aria-expanded", isOpen);
    });

    document.getElementById("nav-logout-btn")?.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.href = "index.html";
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("nav-user-menu");
      if (menu && !menu.contains(e.target)) {
        document.getElementById("user-dropdown")?.classList.remove("open");
        document.getElementById("nav-user-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  }
}

// ── Update cart badge count ───────────────────────────────────
export function _updateCartBadge() {
  const badge = document.getElementById("nav-cart-count");
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ── Bind hamburger + search events ───────────────────────────
function _bindNavEvents() {
  // Hamburger
  const hamburger = document.getElementById("hamburger-btn");
  const navLinks = document.getElementById("nav-links");
  hamburger?.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", isOpen);
  });

  // Search open
  document.getElementById("nav-search-btn")?.addEventListener("click", () => {
    const overlay = document.getElementById("search-overlay");
    overlay.hidden = false;
    document.getElementById("global-search-input")?.focus();
  });

  // Search close
  document.getElementById("search-close-btn")?.addEventListener("click", () => {
    document.getElementById("search-overlay").hidden = true;
  });

  // Search submit → go to menu with query
  document.getElementById("global-search-submit")?.addEventListener("click", _submitGlobalSearch);
  document.getElementById("global-search-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") _submitGlobalSearch();
    if (e.key === "Escape") document.getElementById("search-overlay").hidden = true;
  });
}

function _submitGlobalSearch() {
  const q = document.getElementById("global-search-input")?.value.trim();
  if (q) window.location.href = `menu.html?search=${encodeURIComponent(q)}`;
}
