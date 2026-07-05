/**
 * Badges page: shows the longest-ever streak, plus the full badge catalog,
 * highlighting badges the current user has earned and greying out the
 * ones they haven't.
 */

const errorMessage = document.getElementById("error-message");
const badgesGrid = document.getElementById("badges-grid");

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function formatEarnedDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });
}

async function loadLongestStreak() {
  const me = await api.get("/auth/me");
  document.getElementById("summary-longest-streak").textContent = `${me.longest_streak} day${me.longest_streak === 1 ? "" : "s"}`;
}

async function loadBadges() {
  const [catalog, earned] = await Promise.all([
    api.get("/badges/catalog"),
    api.get("/badges/me"),
  ]);

  const earnedById = new Map(earned.map((b) => [b.badge_id, b]));

  if (catalog.length === 0) {
    badgesGrid.innerHTML = '<p class="countdown-message">No badges available yet.</p>';
    return;
  }

  badgesGrid.innerHTML = "";
  for (const badge of catalog) {
    const earnedBadge = earnedById.get(badge.badge_id);
    const isEarned = Boolean(earnedBadge);

    const card = document.createElement("div");
    card.className = `badge-card ${isEarned ? "earned" : "locked"}`;
    card.innerHTML = `
      <div class="badge-icon">${badge.icon ?? "🏆"}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-description">${badge.description ?? ""}</div>
      ${isEarned
        ? `<div class="badge-status earned-status">Earned ${formatEarnedDate(earnedBadge.earned_at)}</div>`
        : `<div class="badge-status locked-status">🔒 Locked</div>`}
    `;
    badgesGrid.appendChild(card);
  }
}

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  try {
    await Promise.all([loadLongestStreak(), loadBadges()]);
  } catch (err) {
    showError(err.message || "Failed to load badges.");
  }
})();
