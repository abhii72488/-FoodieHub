// ============================================================
// FoodieHub - Menu Page Logic
// Features: load items, search, filter, sort, paginate
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar, _updateCartBadge } from "./navigation.js";
import { renderFoodCard, bindCardButtons } from "./home.js";
import { debounce } from "./utils.js";

// ── Category config ───────────────────────────────────────────
const CATEGORIES = [
  { name: "Pizza",       icon: "🍕" },
  { name: "Burgers",     icon: "🍔" },
  { name: "Indian Food", icon: "🍛" },
  { name: "Chinese Food",icon: "🥡" },
  { name: "Desserts",    icon: "🍰" },
  { name: "Beverages",   icon: "🥤" },
  { name: "Snacks",      icon: "🍟" },
];

const PAGE_SIZE = 12;

// ── State ─────────────────────────────────────────────────────
let allItems    = [];
let filtered    = [];
let currentPage = 1;
let activeFilters = {
  category:  "all",
  search:    "",
  maxPrice:  1500,
  vegFilter: "all",   // 'all' | 'veg' | 'nonveg'
  availOnly: false,
  sort:      "default",
};

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  readUrlParams();
  buildCategoryList();
  bindEvents();
  await loadAllItems();
  applyAndRender();
});

// ── Read URL query params ─────────────────────────────────────
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const cat    = params.get("category");
  const search = params.get("search");
  if (cat)    { activeFilters.category = cat; }
  if (search) { activeFilters.search   = search; document.getElementById("menu-search").value = search; }
}

// ── Build category sidebar list ───────────────────────────────
function buildCategoryList() {
  const list = document.getElementById("category-filter-list");
  if (!list) return;

  CATEGORIES.forEach((cat) => {
    const item = document.createElement("div");
    item.className = "category-filter-item";
    item.dataset.category = cat.name;
    item.setAttribute("role", "radio");
    item.setAttribute("aria-checked", "false");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `
      <span class="category-filter-icon" aria-hidden="true">${cat.icon}</span>
      <span>${cat.name}</span>
      <span class="category-filter-count" id="count-${cat.name.replace(/\s/g,"_")}">0</span>
    `;
    item.addEventListener("click", () => setCategory(cat.name));
    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") setCategory(cat.name); });
    list.appendChild(item);
  });

  // Restore active category from state
  if (activeFilters.category !== "all") {
    const allItem = list.querySelector('[data-category="all"]');
    allItem?.classList.remove("active");
    allItem?.setAttribute("aria-checked", "false");
    const target = list.querySelector(`[data-category="${activeFilters.category}"]`);
    target?.classList.add("active");
    target?.setAttribute("aria-checked", "true");
  }
}

// ── Load all food items from Firestore ────────────────────────
async function loadAllItems() {
  const grid = document.getElementById("menu-food-grid");
  grid.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1"></div>';

  try {
    const snap = await getDocs(
      query(collection(db, "foodItems"), orderBy("createdAt", "desc"))
    );
    allItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Failed to load menu:", err);
    grid.innerHTML = `
      <div class="error-state" style="grid-column:1/-1">
        <span>⚠️</span>
        <p>Failed to load menu. Check your Firebase config and try again.</p>
      </div>`;
  }
}

// ── Apply all active filters and render ───────────────────────
function applyAndRender() {
  let items = [...allItems];

  // Category filter
  if (activeFilters.category !== "all") {
    items = items.filter((i) => i.category === activeFilters.category);
  }
  // Search
  if (activeFilters.search) {
    const q = activeFilters.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }
  // Max price
  items = items.filter((i) => i.price <= activeFilters.maxPrice);
  // Veg filter
  if (activeFilters.vegFilter === "veg")    items = items.filter((i) => i.isVegetarian);
  if (activeFilters.vegFilter === "nonveg") items = items.filter((i) => !i.isVegetarian);
  // Availability
  if (activeFilters.availOnly) items = items.filter((i) => i.isAvailable);

  // Sort
  switch (activeFilters.sort) {
    case "price-asc":  items.sort((a, b) => a.price - b.price); break;
    case "price-desc": items.sort((a, b) => b.price - a.price); break;
    case "name-asc":   items.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "popular":    items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)); break;
  }

  filtered = items;
  currentPage = 1;
  renderResults();
  updateCategoryCounts();
  renderActiveFilterTags();
  updateResultsInfo();
}

// ── Render current page of results ────────────────────────────
function renderResults() {
  const grid = document.getElementById("menu-food-grid");
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column:1/-1">
        <div class="no-results-icon">🔍</div>
        <h3>No items found</h3>
        <p>Try adjusting your search or filters to find what you're looking for.</p>
        <button class="btn btn-outline" id="reset-from-empty" onclick="document.getElementById('clear-filters-btn').click()">
          Clear Filters
        </button>
      </div>`;
    document.getElementById("pagination").style.display = "none";
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);
  grid.innerHTML = page.map(renderFoodCard).join("");
  bindCardButtons(grid);
  renderPagination();
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination() {
  const nav = document.getElementById("pagination");
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (totalPages <= 1) { nav.style.display = "none"; return; }
  nav.style.display = "flex";

  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages;

  nav.innerHTML = `
    <button class="page-btn" ${prevDisabled ? "disabled" : ""} id="prev-page" aria-label="Previous page">←</button>
    ${Array.from({ length: totalPages }, (_, i) => i + 1)
      .map((p) => `<button class="page-btn${p === currentPage ? " active" : ""}" data-page="${p}" aria-label="Page ${p}" aria-current="${p === currentPage ? 'page' : 'false'}">${p}</button>`)
      .join("")}
    <button class="page-btn" ${nextDisabled ? "disabled" : ""} id="next-page" aria-label="Next page">→</button>
  `;

  nav.querySelectorAll(".page-btn[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page, 10);
      renderResults();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  document.getElementById("prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderResults(); }
  });
  document.getElementById("next-page")?.addEventListener("click", () => {
    if (currentPage < totalPages) { currentPage++; renderResults(); }
  });
}

// ── Update category item counts ───────────────────────────────
function updateCategoryCounts() {
  CATEGORIES.forEach((cat) => {
    const el = document.getElementById(`count-${cat.name.replace(/\s/g, "_")}`);
    if (el) {
      const count = allItems.filter((i) => i.category === cat.name).length;
      el.textContent = count;
    }
  });
}

// ── Update results info text ──────────────────────────────────
function updateResultsInfo() {
  const el = document.getElementById("results-info");
  if (!el) return;
  el.innerHTML = `Showing <strong>${filtered.length}</strong> item${filtered.length !== 1 ? "s" : ""}`;
}

// ── Render active filter tags ─────────────────────────────────
function renderActiveFilterTags() {
  const container = document.getElementById("active-filters");
  if (!container) return;
  const tags = [];

  if (activeFilters.category !== "all") {
    tags.push({ label: `Category: ${activeFilters.category}`, key: "category", reset: () => setCategory("all") });
  }
  if (activeFilters.search) {
    tags.push({ label: `Search: "${activeFilters.search}"`, key: "search", reset: () => { activeFilters.search = ""; document.getElementById("menu-search").value = ""; applyAndRender(); } });
  }
  if (activeFilters.maxPrice < 1500) {
    tags.push({ label: `Max ₹${activeFilters.maxPrice}`, key: "price", reset: () => { activeFilters.maxPrice = 1500; document.getElementById("price-max-slider").value = 1500; updatePriceDisplay(1500); applyAndRender(); } });
  }
  if (activeFilters.vegFilter !== "all") {
    tags.push({ label: activeFilters.vegFilter === "veg" ? "🟢 Veg only" : "🔴 Non-Veg only", key: "veg", reset: resetVegFilter });
  }

  container.innerHTML = tags.map((t, i) => `
    <span class="filter-tag" data-tag-index="${i}">
      ${t.label}
      <button class="filter-tag-remove" data-tag-index="${i}" aria-label="Remove ${t.label} filter">✕</button>
    </span>
  `).join("");

  container.querySelectorAll(".filter-tag-remove").forEach((btn) => {
    const idx = parseInt(btn.dataset.tagIndex, 10);
    btn.addEventListener("click", () => tags[idx].reset());
  });
}

// ── Set active category ───────────────────────────────────────
function setCategory(cat) {
  activeFilters.category = cat;
  document.querySelectorAll(".category-filter-item").forEach((el) => {
    const isActive = el.dataset.category === cat;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-checked", isActive);
  });
  applyAndRender();
}

// ── Reset veg filter ──────────────────────────────────────────
function resetVegFilter() {
  activeFilters.vegFilter = "all";
  document.querySelectorAll(".veg-filter-btn").forEach((b) => {
    b.classList.remove("active-veg", "active-nonveg");
    b.setAttribute("aria-pressed", "false");
  });
  document.getElementById("all-diet-btn").setAttribute("aria-pressed", "true");
  applyAndRender();
}

// ── Bind all filter events ────────────────────────────────────
function bindEvents() {
  // Search
  const searchInput = document.getElementById("menu-search");
  searchInput?.addEventListener("input", debounce(() => {
    activeFilters.search = searchInput.value.trim();
    applyAndRender();
  }, 300));

  // Sort
  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    activeFilters.sort = e.target.value;
    applyAndRender();
  });

  // Price slider
  const slider = document.getElementById("price-max-slider");
  slider?.addEventListener("input", () => {
    const val = parseInt(slider.value, 10);
    activeFilters.maxPrice = val;
    updatePriceDisplay(val);
    applyAndRender();
  });

  // Veg filter buttons
  document.getElementById("veg-filter-btn")?.addEventListener("click", () => {
    activeFilters.vegFilter = "veg";
    document.getElementById("veg-filter-btn").classList.add("active-veg");
    document.getElementById("veg-filter-btn").setAttribute("aria-pressed", "true");
    document.getElementById("nonveg-filter-btn").classList.remove("active-nonveg");
    document.getElementById("nonveg-filter-btn").setAttribute("aria-pressed", "false");
    document.getElementById("all-diet-btn").setAttribute("aria-pressed", "false");
    applyAndRender();
  });
  document.getElementById("nonveg-filter-btn")?.addEventListener("click", () => {
    activeFilters.vegFilter = "nonveg";
    document.getElementById("nonveg-filter-btn").classList.add("active-nonveg");
    document.getElementById("nonveg-filter-btn").setAttribute("aria-pressed", "true");
    document.getElementById("veg-filter-btn").classList.remove("active-veg");
    document.getElementById("veg-filter-btn").setAttribute("aria-pressed", "false");
    document.getElementById("all-diet-btn").setAttribute("aria-pressed", "false");
    applyAndRender();
  });
  document.getElementById("all-diet-btn")?.addEventListener("click", resetVegFilter);

  // Availability checkbox
  document.getElementById("available-only")?.addEventListener("change", (e) => {
    activeFilters.availOnly = e.target.checked;
    applyAndRender();
  });

  // Clear filters
  document.getElementById("clear-filters-btn")?.addEventListener("click", () => {
    activeFilters = { category: "all", search: "", maxPrice: 1500, vegFilter: "all", availOnly: false, sort: "default" };
    document.getElementById("menu-search").value = "";
    document.getElementById("price-max-slider").value = 1500;
    updatePriceDisplay(1500);
    document.getElementById("sort-select").value = "default";
    document.getElementById("available-only").checked = false;
    document.querySelectorAll(".category-filter-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.category === "all");
    });
    resetVegFilter();
    applyAndRender();
  });

  // Mobile sidebar toggle
  document.getElementById("mobile-filter-toggle")?.addEventListener("click", () => {
    const sidebar = document.getElementById("menu-sidebar");
    const isOpen = sidebar.classList.toggle("open");
    document.getElementById("mobile-filter-toggle").setAttribute("aria-expanded", isOpen);
  });
  document.getElementById("close-sidebar-btn")?.addEventListener("click", () => {
    document.getElementById("menu-sidebar").classList.remove("open");
    document.getElementById("mobile-filter-toggle").setAttribute("aria-expanded", "false");
  });
}

function updatePriceDisplay(val) {
  document.getElementById("price-max-display").textContent = `₹${val}`;
}
