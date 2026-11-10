/**
 * Handles the login and register forms (whichever is present on the page)
 * by calling the auth endpoints via api.ts.
 */

import { api, errorMessage, setToken } from "./api";
import { byId } from "./dom";
import type { RegisterRequest, TokenResponse, User } from "./types";

function showAlert(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideAlert(element: HTMLElement): void {
  element.classList.add("hidden");
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  const errorEl = byId("error-message");
  const loginBtn = byId<HTMLButtonElement>("login-btn");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(errorEl);

    const email = byId<HTMLInputElement>("email").value.trim();
    const password = byId<HTMLInputElement>("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
      const result = await api.post<TokenResponse>("/auth/login", { email, password });
      setToken(result.access_token);
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert(errorEl, errorMessage(err, "Login failed. Please try again."));
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  const errorEl = byId("error-message");
  const successEl = byId("success-message");
  const registerBtn = byId<HTMLButtonElement>("register-btn");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(errorEl);
    hideAlert(successEl);

    const full_name = byId<HTMLInputElement>("full_name").value.trim();
    const email = byId<HTMLInputElement>("email").value.trim();
    const university = byId<HTMLInputElement>("university").value.trim();
    const password = byId<HTMLInputElement>("password").value;

    registerBtn.disabled = true;
    registerBtn.textContent = "Registering...";

    const payload: RegisterRequest = {
      full_name,
      email,
      password,
      university: university || null,
    };

    try {
      await api.post<User>("/auth/register", payload);
      showAlert(successEl, "Account created! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (err) {
      showAlert(errorEl, errorMessage(err, "Registration failed. Please try again."));
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "Register";
    }
  });
}