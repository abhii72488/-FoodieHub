// ============================================================
// FoodieHub - Homepage Logic
// Handles: Category display, popular items, hero interactions
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar, _updateCartBadge } from "./navigation.js";
import { addToCart, formatCurrency } from "./cart.js";
import { showToast } from "./utils.js";
import { DEMO_MENU_ITEMS, getDemoMenuItem } from "./demo-menu.js";

// ── Category definitions ──────────────────────────────────────
const CATEGORIES = [
  { name: "Pizza", icon: "🍕", color: "#FF6B35" },
  { name: "Burgers", icon: "🍔", color: "#F7931E" },
  { name: "Indian Food", icon: "🍛", color: "#C0392B" },
  { name: "Chinese Food", icon: "🥡", color: "#E74C3C" },
  { name: "Desserts", icon: "🍰", color: "#9B59B6" },
  { name: "Beverages", icon: "🥤", color: "#3498DB" },
  { name: "Snacks", icon: "🍟", color: "#E67E22" },
];

// ── Page initialization ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  renderCategories();
  loadPopularItems();
  bindHeroButtons();
  initCounterAnimation();
  initTestimonials();
});

// ── Hero buttons ──────────────────────────────────────────────
function bindHeroButtons() {
  document.getElementById("hero-order-btn")?.addEventListener("click", () => {
    window.location.href = "menu.html";
  });
  document.getElementById("hero-explore-btn")?.addEventListener("click", () => {
    document.getElementById("categories-section")?.scrollIntoView({ behavior: "smooth" });
  });
}

// ── Render category cards ─────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById("categories-grid");
  if (!grid) return;

  grid.innerHTML = CATEGORIES.map(
    (cat) => `
    <a href="menu.html?category=${encodeURIComponent(cat.name)}"
       class="category-card"
       style="--cat-color: ${cat.color}"
       aria-label="Browse ${cat.name}">
      <div class="category-icon">${cat.icon}</div>
      <h3 class="category-name">${cat.name}</h3>
      <span class="category-arrow">→</span>
    </a>
  `
  ).join("");
}

// ── Load popular food items from Firestore ────────────────────
async function loadPopularItems() {
  const grid = document.getElementById("popular-grid");
  if (!grid) return;

  grid.innerHTML = '<div class="loading-spinner" aria-label="Loading food items"></div>';

  try {
    const q = query(
      collection(db, "foodItems"),
      where("isPopular", "==", true),
      where("isAvailable", "==", true),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn("Firestore has no popular food items; showing popular demo items.");
      showDemoPopularItems(grid);
      return;
    }

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    grid.innerHTML = items.map(renderFoodCard).join("");
    bindCardButtons(grid);
  } catch (err) {
    console.error("Failed to load popular items from Firestore; showing demo items:", err);
    showDemoPopularItems(grid);
  }
}

function showDemoPopularItems(grid) {
  const items = DEMO_MENU_ITEMS.filter((item) => item.isPopular);
  grid.innerHTML = items.map(renderFoodCard).join("");
  bindCardButtons(grid);
  const notice = document.getElementById("home-demo-menu-notice");
  if (notice) notice.hidden = false;
}

// ── Build HTML for a food card ────────────────────────────────
export function renderFoodCard(item) {
  const vegBadge = item.isVegetarian
    ? `<span class="veg-badge" title="Vegetarian">🟢 Veg</span>`
    : `<span class="nonveg-badge" title="Non-Vegetarian">🔴 Non-Veg</span>`;

  const availBadge = item.isAvailable
    ? `<span class="avail-badge available">Available</span>`
    : `<span class="avail-badge unavailable">Unavailable</span>`;

  const addBtn = item.isAvailable
    ? `<button class="btn-add-cart" data-id="${item.id}" data-demo="${item.isDemo ? "true" : "false"}" aria-label="Add ${item.name} to cart">Add to Cart</button>`
    : `<button class="btn-add-cart disabled" disabled aria-disabled="true">Unavailable</button>`;

  return `
    <article class="food-card" data-id="${item.id}">
      <div class="food-card-img-wrap">
        <img src="${item.imageUrl || 'assets/images/placeholder.jpg'}"
             alt="${item.name}"
             class="food-card-img"
             loading="lazy"
             onerror="this.src='assets/images/placeholder.jpg'"/>
        <div class="food-card-badges">
          ${vegBadge}
          ${availBadge}
        </div>
        ${item.isPopular ? `<span class="popular-tag">⭐ Popular</span>` : ""}
      </div>
      <div class="food-card-body">
        <span class="food-category-tag">${item.category}</span>
        <h3 class="food-name">${item.name}</h3>
        <p class="food-desc">${item.description?.substring(0, 80)}${item.description?.length > 80 ? "…" : ""}</p>
        <div class="food-card-footer">
          <span class="food-price">${formatCurrency(item.price)}</span>
          <div class="food-card-actions">
            <a href="food-details.html?id=${item.id}" class="btn-view-details" aria-label="View details for ${item.name}">Details</a>
            ${addBtn}
          </div>
        </div>
      </div>
    </article>
  `;
}

// ── Bind Add-to-Cart buttons inside a container ───────────────
export function bindCardButtons(container) {
  container.querySelectorAll(".btn-add-cart:not(.disabled)").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const card = btn.closest(".food-card");
      if (!card) return;

      const itemId = btn.dataset.id;
      // Fetch full item data from Firestore to get trusted price
      try {
        let item;
        if (btn.dataset.demo === "true") {
          item = getDemoMenuItem(itemId);
          if (!item) throw new Error(`Demo food item "${itemId}" was not found.`);
        } else {
          const { getDoc, doc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
          );
          const { db } = await import("./firebase-config.js");
          const snap = await getDoc(doc(db, "foodItems", itemId));
          if (!snap.exists() || !snap.data().isAvailable) {
            showToast("This item is currently unavailable.", "error");
            return;
          }
          item = { id: snap.id, ...snap.data() };
        }
        addToCart(item);
        _updateCartBadge();
        showToast(`🛒 ${item.name} added to cart!`, "success");
        btn.classList.add("added");
        btn.textContent = "✓ Added";
        setTimeout(() => {
          btn.classList.remove("added");
          btn.textContent = "Add to Cart";
        }, 1500);
      } catch (err) {
        console.error("Add to cart error:", err);
        showToast("Failed to add item. Try again.", "error");
      }
    });
  });
}

// ── Stats counter animation ───────────────────────────────────
function initCounterAnimation() {
  const counters = document.querySelectorAll(".stat-number[data-target]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        let current = 0;
        const step = Math.ceil(target / 60);
        const interval = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current.toLocaleString("en-IN") + (el.dataset.suffix || "");
          if (current >= target) clearInterval(interval);
        }, 20);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((c) => observer.observe(c));
}

// ── Testimonials auto-scroll ──────────────────────────────────
function initTestimonials() {
  const track = document.getElementById("testimonials-track");
  if (!track) return;

  let idx = 0;
  const cards = track.querySelectorAll(".testimonial-card");
  if (cards.length <= 1) return;

  setInterval(() => {
    idx = (idx + 1) % cards.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
  }, 4000);
}
