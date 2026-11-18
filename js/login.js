// ============================================================
// FoodieHub - Login Page Logic
// ============================================================

import { loginUser, sendPasswordReset, onAuthChange } from "./auth.js";
import {
  isValidEmail,
  showFieldError,
  clearFieldError,
  showToast,
  redirectIfAuthenticated,
} from "./utils.js";

// Redirect if already logged in
redirectIfAuthenticated("index.html");

// ── DOM elements ──────────────────────────────────────────────
const form       = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const pwInput    = document.getElementById("login-password");
const submitBtn  = document.getElementById("login-submit-btn");
const alertEl    = document.getElementById("login-alert");
const forgotLink = document.getElementById("forgot-password-link");

// ── Password visibility toggle ────────────────────────────────
document.getElementById("toggle-login-pw")?.addEventListener("click", () => {
  const isText = pwInput.type === "text";
  pwInput.type = isText ? "password" : "text";
  document.getElementById("toggle-login-pw").setAttribute("aria-label", isText ? "Show password" : "Hide password");
});

// ── Forgot password ───────────────────────────────────────────
forgotLink?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email || !isValidEmail(email)) {
    showAlert("Please enter a valid email address first.", "error");
    emailInput.focus();
    return;
  }
  try {
    forgotLink.textContent = "Sending…";
    await sendPasswordReset(email);
    showAlert(`Password reset email sent to ${email}. Check your inbox.`, "success");
  } catch (err) {
    showAlert(getFriendlyError(err.code), "error");
  } finally {
    forgotLink.textContent = "Forgot Password?";
  }
});

// ── Login form submission ─────────────────────────────────────
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  hideAlert();

  const email    = emailInput.value.trim();
  const password = pwInput.value;
  let valid = true;

  if (!email || !isValidEmail(email)) {
    showFieldError("login-email", "Please enter a valid email address.");
    valid = false;
  }
  if (!password) {
    showFieldError("login-password", "Please enter your password.");
    valid = false;
  }
  if (!valid) return;

  // Disable button to prevent double submission
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  try {
    await loginUser({ email, password });
    showAlert("Login successful! Redirecting…", "success");

    // Redirect to original page if coming from a redirect param
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    setTimeout(() => {
      window.location.href = redirect || "index.html";
    }, 800);
  } catch (err) {
    showAlert(getFriendlyError(err.code), "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In →";
  }
});

// ── Helper: show alert box ────────────────────────────────────
function showAlert(message, type) {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `auth-alert show ${type}`;
}
function hideAlert() {
  if (alertEl) alertEl.className = "auth-alert";
}

// ── Helper: clear field errors ────────────────────────────────
function clearErrors() {
  clearFieldError("login-email");
  clearFieldError("login-password");
}

// ── Map Firebase error codes to friendly messages ─────────────
function getFriendlyError(code) {
  const map = {
    "auth/user-not-found":      "No account found with this email.",
    "auth/wrong-password":      "Incorrect password. Please try again.",
    "auth/invalid-email":       "Invalid email address format.",
    "auth/user-disabled":       "This account has been disabled.",
    "auth/too-many-requests":   "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential":  "Invalid email or password.",
  };
  return map[code] || "Login failed. Please try again.";
}
