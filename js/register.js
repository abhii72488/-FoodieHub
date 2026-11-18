// ============================================================
// FoodieHub - Register Page Logic
// ============================================================

import { registerUser } from "./auth.js";
import {
  isValidEmail,
  showFieldError,
  clearFieldError,
  redirectIfAuthenticated,
} from "./utils.js";

// Redirect if already logged in
redirectIfAuthenticated("index.html");

const form        = document.getElementById("register-form");
const nameInput   = document.getElementById("reg-name");
const emailInput  = document.getElementById("reg-email");
const pwInput     = document.getElementById("reg-password");
const confInput   = document.getElementById("reg-confirm");
const termsCheck  = document.getElementById("terms-agree");
const submitBtn   = document.getElementById("register-submit-btn");
const alertEl     = document.getElementById("register-alert");

// ── Password visibility toggles ───────────────────────────────
function makeToggle(btnId, inputId) {
  document.getElementById(btnId)?.addEventListener("click", () => {
    const inp = document.getElementById(inputId);
    inp.type = inp.type === "text" ? "password" : "text";
  });
}
makeToggle("toggle-reg-pw",     "reg-password");
makeToggle("toggle-confirm-pw", "reg-confirm");

// ── Password strength meter ───────────────────────────────────
pwInput?.addEventListener("input", () => {
  const val = pwInput.value;
  const fill = document.getElementById("strength-fill");
  const text = document.getElementById("strength-text");

  let score = 0;
  if (val.length >= 8)         score++;
  if (/[A-Z]/.test(val))       score++;
  if (/[0-9]/.test(val))       score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  if (!val) {
    fill.className = "strength-fill";
    text.textContent = "";
    return;
  }
  if (score <= 1) {
    fill.className = "strength-fill weak";
    text.className = "strength-text weak";
    text.textContent = "Weak";
  } else if (score <= 2) {
    fill.className = "strength-fill medium";
    text.className = "strength-text medium";
    text.textContent = "Medium";
  } else {
    fill.className = "strength-fill strong";
    text.className = "strength-text strong";
    text.textContent = "Strong";
  }
});

// ── Form submission ───────────────────────────────────────────
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors();
  hideAlert();

  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = pwInput.value;
  const confirm  = confInput.value;
  const terms    = termsCheck.checked;

  let valid = true;

  // Validate name
  if (!name || name.length < 2) {
    showFieldError("reg-name", "Full name must be at least 2 characters.");
    valid = false;
  }
  // Validate email
  if (!email || !isValidEmail(email)) {
    showFieldError("reg-email", "Please enter a valid email address.");
    valid = false;
  }
  // Validate password
  if (!password || password.length < 8) {
    showFieldError("reg-password", "Password must be at least 8 characters.");
    valid = false;
  }
  // Validate confirm
  if (password !== confirm) {
    showFieldError("reg-confirm", "Passwords do not match.");
    valid = false;
  }
  // Validate terms
  if (!terms) {
    showFieldError("terms-agree", "You must agree to the Terms & Conditions.");
    valid = false;
  }

  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  try {
    await registerUser({ name, email, password });
    showAlert("Account created successfully! Redirecting…", "success");
    setTimeout(() => { window.location.href = "index.html"; }, 1200);
  } catch (err) {
    showAlert(getFriendlyError(err.code), "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account 🎉";
  }
});

function showAlert(msg, type) {
  alertEl.textContent = msg;
  alertEl.className   = `auth-alert show ${type}`;
}
function hideAlert() { alertEl.className = "auth-alert"; }
function clearAllErrors() {
  ["reg-name","reg-email","reg-password","reg-confirm","terms-agree"].forEach(clearFieldError);
}

function getFriendlyError(code) {
  const map = {
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/invalid-email":          "Invalid email address format.",
    "auth/weak-password":          "Password is too weak. Use at least 8 characters.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
  };
  return map[code] || "Registration failed. Please try again.";
}
