/**
 * Health score page: shows the latest overall score + sub-score breakdown,
 * with a button to recalculate this week's score. Handles the 404
 * "never calculated" state and shows a popup for any new badges earned
 * on recalculation.
 */

import type { Chart } from "chart.js";

import { api, clearToken, errorMessage } from "./api";
import { renderHealthScoreChart } from "./charts";
import { byId } from "./dom";
import { badgeSectionHtml, initNotificationModal, openNotificationModal } from "./notifications";
import type { HealthScore, HealthScoreRecalculateResponse } from "./types";

const errorEl = byId("error-message");
const healthScoreContainer = byId("health-score-container");
const recalculateBtn = byId<HTMLButtonElement>("recalculate-btn");

let chartInstance: Chart<"doughnut"> | null = null;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function hideError(): void {
  errorEl.classList.add("hidden");
}

function renderEmptyState(): void {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  healthScoreContainer.innerHTML = `
    <div class="chart-empty">
      No health score calculated yet. Click "Recalculate" below to calculate your
      first weekly score based on your income and expenses.
    </div>
  `;
}

function renderScore(score: HealthScore): void {
  healthScoreContainer.innerHTML = `
    <div class="chart-wrapper">
      <canvas id="health-score-chart"></canvas>
      <div class="health-score-center">
        <div class="score-value" id="health-score-value">--</div>
        <div class="score-label">out of 100</div>
      </div>
    </div>
    <div class="health-score-breakdown" id="health-score-breakdown"></div>
  `;

  const overall = parseFloat(score.overall_score);
  byId("health-score-value").textContent = overall.toFixed(0);

  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = renderHealthScoreChart(byId<HTMLCanvasElement>("health-score-chart"), overall);

  byId("health-score-breakdown").innerHTML = `
    <div class="breakdown-row"><span>Savings Rate</span><span>${parseFloat(score.savings_rate).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Budget Adherence</span><span>${parseFloat(score.budget_adherence_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Consistency</span><span>${parseFloat(score.consistency_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Week</span><span>${score.week_start_date} - ${score.week_end_date}</span></div>
  `;
}

async function loadHealthScore(): Promise<void> {
  try {
    const score = await api.get<HealthScore>("/health-score/latest");
    renderScore(score);
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("no health score")) {
      renderEmptyState();
    } else {
      throw err;
    }
  }
}

initNotificationModal();

recalculateBtn.addEventListener("click", async () => {
  hideError();
  recalculateBtn.disabled = true;
  recalculateBtn.textContent = "Recalculating...";

  try {
    const result = await api.post<HealthScoreRecalculateResponse>("/health-score/recalculate", {});
    renderScore(result);
    const html = badgeSectionHtml(result.new_badges ?? []);
    if (html) openNotificationModal(html);
  } catch (err) {
    showError(errorMessage(err, "Failed to recalculate health score."));
  } finally {
    recalculateBtn.disabled = false;
    recalculateBtn.textContent = "Recalculate";
  }
});

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  try {
    await loadHealthScore();
  } catch (err) {
    showError(errorMessage(err, "Failed to load health score."));
  }
})();