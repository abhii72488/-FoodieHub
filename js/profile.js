// ============================================================
// FoodieHub - Profile Page Logic
// ============================================================

import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderNavbar } from "./navigation.js";
import { requireAuth, logoutUser, fetchUserProfile } from "./auth.js";
import { showFieldError, clearFieldError, isValidPhone, showToast } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  const user = await requireAuth("login.html");
  await loadProfile(user);
  bindEvents(user);
});

// ── Load and render profile ───────────────────────────────────
async function loadProfile(user) {
  const loading = document.getElementById("profile-loading");
  const content = document.getElementById("profile-content");

  try {
    const profile = await fetchUserProfile(user.uid);
    if (!profile) throw new Error("Profile not found");

    // Sidebar
    document.getElementById("profile-avatar").textContent      = (profile.name || user.email)[0].toUpperCase();
    document.getElementById("profile-name-display").textContent = profile.name || "—";
    document.getElementById("profile-email-display").textContent = profile.email;
    document.getElementById("profile-role-badge").textContent    = profile.role === "admin" ? "Admin" : "Customer";

    // Edit form prefill
    document.getElementById("edit-name").value    = profile.name    || "";
    document.getElementById("edit-email").value   = profile.email   || "";
    document.getElementById("edit-phone").value   = profile.phone   || "";
    document.getElementById("edit-address").value = profile.address || "";

    loading.style.display = "none";
    content.style.display = "block";
  } catch (err) {
    console.error("Profile load error:", err);
    loading.style.display = "none";
    content.innerHTML = `<div class="error-state"><span>⚠️</span><p>Failed to load profile.</p></div>`;
    content.style.display = "block";
  }
}

// ── Bind events ───────────────────────────────────────────────
function bindEvents(user) {
  // Profile edit form
  document.getElementById("profile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldError("edit-name");
    clearFieldError("edit-phone");

    const name    = document.getElementById("edit-name").value.trim();
    const phone   = document.getElementById("edit-phone").value.trim();
    const address = document.getElementById("edit-address").value.trim();
    const alertEl = document.getElementById("profile-alert");

    let valid = true;
    if (!name || name.length < 2) {
      showFieldError("edit-name", "Name must be at least 2 characters.");
      valid = false;
    }
    if (phone && !isValidPhone(phone)) {
      showFieldError("edit-phone", "Enter a valid 10-digit phone number.");
      valid = false;
    }
    if (!valid) return;

    const saveBtn = document.getElementById("profile-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      // Only update permitted fields — role cannot be self-assigned
      await updateDoc(doc(db, "users", user.uid), {
        name, phone, address,
        updatedAt: serverTimestamp(),
      });

      // Update display name in auth
      const { updateProfile } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
      );
      await updateProfile(user, { displayName: name });

      alertEl.textContent = "Profile updated successfully!";
      alertEl.className = "auth-alert show success";
      document.getElementById("profile-name-display").textContent = name;
      document.getElementById("profile-avatar").textContent = name[0].toUpperCase();
      showToast("Profile saved! ✅", "success");
    } catch (err) {
      console.error("Profile update error:", err);
      alertEl.textContent = "Failed to save profile. Try again.";
      alertEl.className = "auth-alert show error";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Changes";
    }
  });

  // Logout
  document.getElementById("profile-logout-btn")?.addEventListener("click", async () => {
    try {
      await logoutUser();
      window.location.href = "index.html";
    } catch (err) {
      showToast("Logout failed. Try again.", "error");
    }
  });
}

// ── Tab switcher (exposed globally for onclick in HTML) ───────
window.showTab = function (tab) {
  document.querySelectorAll("[id^='tab-']").forEach((el) => {
    el.style.display = el.id === `tab-${tab}` ? "block" : "none";
  });
};
