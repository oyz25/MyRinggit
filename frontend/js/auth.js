/**
 * Handles the login and register forms (whichever is present on the page)
 * by calling the auth endpoints via api.js.
 */

function showAlert(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideAlert(element) {
  element.classList.add("hidden");
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  const errorMessage = document.getElementById("error-message");
  const loginBtn = document.getElementById("login-btn");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(errorMessage);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
      const result = await api.post("/auth/login", { email, password });
      setToken(result.access_token);
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert(errorMessage, err.message || "Login failed. Please try again.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");
  const registerBtn = document.getElementById("register-btn");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(errorMessage);
    hideAlert(successMessage);

    const full_name = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const university = document.getElementById("university").value.trim();
    const password = document.getElementById("password").value;

    registerBtn.disabled = true;
    registerBtn.textContent = "Registering...";

    try {
      await api.post("/auth/register", {
        full_name,
        email,
        password,
        university: university || null,
      });
      showAlert(successMessage, "Account created! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (err) {
      showAlert(errorMessage, err.message || "Registration failed. Please try again.");
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "Register";
    }
  });
}
