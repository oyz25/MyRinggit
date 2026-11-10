/**
 * Badges page: shows the longest-ever streak, plus the full badge catalog,
 * highlighting badges the current user has earned and greying out the
 * ones they haven't.
 */

import { api, clearToken, errorMessage } from "./api";
import { byId } from "./dom";
import { formatDisplayDate } from "./format";
import type { Badge, User, UserBadge } from "./types";

const errorEl = byId("error-message");
const badgesGrid = byId("badges-grid");

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

const BADGE_ICONS: Record<string, string> = {
  "fire":        "🔥",
  "trophy":      "🏆",
  "star":        "⭐",
  "shoe-prints": "👟",
};

function badgeIcon(name: string | null): string {
  return (name !== null ? BADGE_ICONS[name] : undefined) ?? "🏆";
}

async function loadLongestStreak(): Promise<void> {
  const me = await api.get<User>("/auth/me");
  byId("summary-longest-streak").textContent =
    `${me.longest_streak} day${me.longest_streak === 1 ? "" : "s"}`;
}

async function loadBadges(): Promise<void> {
  const [catalog, earned] = await Promise.all([
    api.get<Badge[]>("/badges/catalog"),
    api.get<UserBadge[]>("/badges/me"),
  ]);

  const earnedById = new Map(earned.map((b) => [b.badge_id, b]));

  if (catalog.length === 0) {
    badgesGrid.innerHTML = '<p class="countdown-message">No badges available yet.</p>';
    return;
  }

  badgesGrid.innerHTML = "";
  for (const badge of catalog) {
    const earnedBadge = earnedById.get(badge.badge_id);

    const card = document.createElement("div");
    card.className = `badge-card ${earnedBadge ? "earned" : "locked"}`;
    card.innerHTML = `
      <div class="badge-icon">${badgeIcon(badge.icon)}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-description">${badge.description ?? ""}</div>
      ${earnedBadge
        ? `<div class="badge-status earned-status">Earned ${formatDisplayDate(earnedBadge.earned_at)}</div>`
        : `<div class="badge-status locked-status">🔒 Locked</div>`}
    `;
    badgesGrid.appendChild(card);
  }
}

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  try {
    await Promise.all([loadLongestStreak(), loadBadges()]);
  } catch (err) {
    showError(errorMessage(err, "Failed to load badges."));
  }
})();