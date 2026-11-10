import { byId } from "./dom";
import type { Badge } from "./types";

/** Markup for the "New badge(s) earned!" section; empty string if there are none. */
export function badgeSectionHtml(newBadges: Badge[]): string {
  if (newBadges.length === 0) return "";

  let html = `<h3 style="font-size: 1rem; margin: 0 0 0.25rem;">New badge${newBadges.length > 1 ? "s" : ""} earned!</h3>`;
  for (const badge of newBadges) {
    html += `
      <div class="modal-item">
        <div class="modal-item-icon">${badge.icon ?? "🏆"}</div>
        <div>
          <div class="modal-item-title">${badge.name}</div>
          <div class="modal-item-desc">${badge.description ?? ""}</div>
        </div>
      </div>
    `;
  }
  return html;
}

/** Wires the close button of #notification-modal. Call once on pages that have it. */
export function initNotificationModal(): void {
  const modal = byId("notification-modal");
  byId("notification-modal-close").addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}

/** Fills #notification-modal-body with the given markup and shows the modal. */
export function openNotificationModal(html: string): void {
  byId("notification-modal-body").innerHTML = html;
  byId("notification-modal").classList.remove("hidden");
}