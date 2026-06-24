/**
 * Health score page: shows the latest overall score + sub-score breakdown,
 * with a button to recalculate this week's score. Handles the 404
 * "never calculated" state and shows a popup for any new badges earned
 * on recalculation.
 */

const errorMessage = document.getElementById("error-message");
const healthScoreContainer = document.getElementById("health-score-container");
const recalculateBtn = document.getElementById("recalculate-btn");

const notificationModal = document.getElementById("notification-modal");
const notificationModalBody = document.getElementById("notification-modal-body");
const notificationModalClose = document.getElementById("notification-modal-close");

let chartInstance = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

function renderEmptyState() {
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

function renderScore(score) {
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
  document.getElementById("health-score-value").textContent = overall.toFixed(0);

  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = renderHealthScoreChart(document.getElementById("health-score-chart"), overall);

  const breakdown = document.getElementById("health-score-breakdown");
  breakdown.innerHTML = `
    <div class="breakdown-row"><span>Savings Rate</span><span>${parseFloat(score.savings_rate).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Budget Adherence</span><span>${parseFloat(score.budget_adherence_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Consistency</span><span>${parseFloat(score.consistency_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Week</span><span>${score.week_start_date} - ${score.week_end_date}</span></div>
  `;
}

async function loadHealthScore() {
  try {
    const score = await api.get("/health-score/latest");
    renderScore(score);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("no health score")) {
      renderEmptyState();
    } else {
      throw err;
    }
  }
}

function showNotifications(newBadges) {
  if (newBadges.length === 0) {
    return;
  }

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

  notificationModalBody.innerHTML = html;
  notificationModal.classList.remove("hidden");
}

notificationModalClose.addEventListener("click", () => {
  notificationModal.classList.add("hidden");
});

recalculateBtn.addEventListener("click", async () => {
  hideError();
  recalculateBtn.disabled = true;
  recalculateBtn.textContent = "Recalculating...";

  try {
    const result = await api.post("/health-score/recalculate", {});
    renderScore(result);
    showNotifications(result.new_badges ?? []);
  } catch (err) {
    showError(err.message || "Failed to recalculate health score.");
  } finally {
    recalculateBtn.disabled = false;
    recalculateBtn.textContent = "Recalculate";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  try {
    await loadHealthScore();
  } catch (err) {
    showError(err.message || "Failed to load health score.");
  }
})();
