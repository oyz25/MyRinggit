/**
 * Applies the saved theme on page load and wires up #theme-toggle-btn (if present)
 * to switch between light and dark themes.
 */

const THEME_KEY = "myringgit_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

(function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
})();

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;

  const updateLabel = () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    toggleBtn.textContent = current === "dark" ? "Light Mode" : "Dark Mode";
  };

  updateLabel();

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    updateLabel();
  });
});
