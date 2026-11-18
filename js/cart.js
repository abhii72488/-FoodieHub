// ============================================================
// FoodieHub - Cart Module
// Handles: localStorage cart for guests, Firestore sync for users
// ============================================================

import { auth, db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CART_KEY = "foodiehub_cart";

// ── Helper: safe DOM text content setter ─────────────────────
function setText(el, text) {
  if (el) el.textContent = text;
}

// ── Get cart from localStorage ───────────────────────────────
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

// ── Save cart to localStorage ────────────────────────────────
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // Dispatch event so other modules can react (e.g. update badge)
  window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cart } }));
}

// ── Get total item count in cart ─────────────────────────────
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// ── Add item to cart ─────────────────────────────────────────
export function addToCart(foodItem) {
  // foodItem shape: { id, name, price, imageUrl, category, isVegetarian }
  const cart = getCart();
  const idx = cart.findIndex((i) => i.id === foodItem.id);

  if (idx > -1) {
    cart[idx].quantity += 1;
  } else {
    cart.push({
      id: foodItem.id,
      name: foodItem.name,
      price: foodItem.price,
      imageUrl: foodItem.imageUrl || "",
      category: foodItem.category || "",
      isVegetarian: foodItem.isVegetarian ?? true,
      quantity: 1,
    });
  }

  saveCart(cart);
  return cart;
}

// ── Update quantity of a specific item ───────────────────────
export function updateCartQuantity(itemId, quantity) {
  const cart = getCart();
  const idx = cart.findIndex((i) => i.id === itemId);
  if (idx === -1) return cart;

  if (quantity <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx].quantity = quantity;
  }

  saveCart(cart);
  return cart;
}

// ── Remove item from cart ────────────────────────────────────
export function removeFromCart(itemId) {
  const cart = getCart().filter((i) => i.id !== itemId);
  saveCart(cart);
  return cart;
}

// ── Clear entire cart ────────────────────────────────────────
export function clearCart() {
  saveCart([]);
}

// ── Calculate cart totals ────────────────────────────────────
export function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? (subtotal >= 500 ? 0 : 40) : 0;
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + deliveryFee + tax;
  return { subtotal, deliveryFee, tax, total, itemCount: getCartCount() };
}

// ── Format currency in Indian Rupees ─────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Sync cart to Firestore (for logged-in users) ─────────────
export async function syncCartToFirestore(userId) {
  try {
    const cart = getCart();
    await setDoc(doc(db, "carts", userId), {
      items: cart,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Cart sync to Firestore failed:", err.message);
  }
}

// ── Load cart from Firestore (merge with localStorage) ───────
export async function loadCartFromFirestore(userId) {
  try {
    const snap = await getDoc(doc(db, "carts", userId));
    if (snap.exists()) {
      const remoteCart = snap.data().items || [];
      const localCart = getCart();

      // Merge: prefer remote quantities for existing items
      const merged = [...remoteCart];
      localCart.forEach((localItem) => {
        if (!merged.find((i) => i.id === localItem.id)) {
          merged.push(localItem);
        }
      });

      saveCart(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Cart load from Firestore failed:", err.message);
  }
  return getCart();
}

// ── Clear Firestore cart after order is placed ───────────────
export async function clearFirestoreCart(userId) {
  try {
    await deleteDoc(doc(db, "carts", userId));
  } catch (err) {
    console.warn("Firestore cart clear failed:", err.message);
  }
}
