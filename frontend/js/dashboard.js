/**
 * Dashboard page: spending heatmap centrepiece, compact health score widget,
 * category pie chart, summary cards, streak, PTPTN semester snapshot, and
 * living expense countdown.
 *
 * All numeric fields from the API arrive as decimal strings — run through
 * parseFloat() before use.
 */

const errorMessage = document.getElementById("error-message");

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function formatCurrency(value) {
  return `RM ${parseFloat(value).toFixed(2)}`;
}

// ─── Alert banner ──────────────────────────────────────────────────────────

async function loadAlertBanner() {
  const banner = document.getElementById("alert-banner");
  const list = document.getElementById("alert-list");

  const [alerts, categories] = await Promise.all([
    api.get("/categories/limits/alerts"),
    api.get("/categories?type=expense"),
  ]);

  if (alerts.length === 0) return;

  const categoriesById = new Map(categories.map((c) => [c.category_id, c]));
  let hasOverLimit = false;

  list.innerHTML = "";
  for (const alert of alerts) {
    const category = categoriesById.get(alert.category_id);
    const categoryName = category ? category.name : `Category #${alert.category_id}`;
    const status = alert.is_over_limit ? "over your monthly limit" : "near your monthly limit";
    if (alert.is_over_limit) hasOverLimit = true;

    const item = document.createElement("li");
    item.textContent =
      `${categoryName}: ${formatCurrency(alert.spent_so_far)} of ${formatCurrency(alert.monthly_limit)} ` +
      `(${parseFloat(alert.percent_used).toFixed(0)}%) - ${status}`;
    list.appendChild(item);
  }

  banner.classList.toggle("over-limit", hasOverLimit);
  banner.classList.remove("hidden");
}

// ─── Summary cards + category chart ───────────────────────────────────────

async function loadSummary() {
  const summary = await api.get("/dashboard/summary");

  const totalIncome = parseFloat(summary.total_income);
  const totalExpenses = parseFloat(summary.total_expenses);
  const netBalance = parseFloat(summary.net_balance);

  document.getElementById("summary-income").textContent = formatCurrency(totalIncome);
  document.getElementById("summary-expenses").textContent = formatCurrency(totalExpenses);

  const netEl = document.getElementById("summary-net");
  netEl.textContent = formatCurrency(netBalance);
  netEl.classList.add(netBalance >= 0 ? "positive" : "negative");

  const breakdownCanvas = document.getElementById("expense-breakdown-chart");
  const breakdownEmpty = document.getElementById("expense-breakdown-empty");

  if (summary.expense_breakdown.length === 0) {
    breakdownCanvas.classList.add("hidden");
    breakdownEmpty.classList.remove("hidden");
  } else {
    renderExpenseBreakdownChart(breakdownCanvas, summary.expense_breakdown);
  }
}

// ─── Streak ────────────────────────────────────────────────────────────────

async function loadStreaks() {
  const me = await api.get("/auth/me");
  document.getElementById("summary-current-streak").textContent =
    `${me.current_streak} day${me.current_streak === 1 ? "" : "s"}`;
}

// ─── Compact health score widget ───────────────────────────────────────────

async function loadHealthScore() {
  const container = document.getElementById("health-score-container");

  let score;
  try {
    score = await api.get("/health-score/latest");
  } catch {
    container.innerHTML = `
      <div class="chart-empty" style="height: auto; padding: 1.5rem 0.5rem;">
        No health score yet.<br>Visit the Health Score page to calculate your first score.
      </div>
    `;
    return;
  }

  const overall = parseFloat(score.overall_score);
  const scoreEl = document.getElementById("health-score-value");
  scoreEl.textContent = overall.toFixed(0);
  scoreEl.style.color =
    overall >= 70 ? "var(--color-success)" :
    overall >= 50 ? "var(--color-warning)" :
    "var(--color-danger)";

  document.getElementById("health-score-breakdown").innerHTML = `
    <div class="breakdown-row"><span>Savings Rate</span><span>${parseFloat(score.savings_rate).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Budget Adherence</span><span>${parseFloat(score.budget_adherence_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Consistency</span><span>${parseFloat(score.consistency_score).toFixed(1)}%</span></div>
    <div class="breakdown-row"><span>Week</span><span>${score.week_start_date}</span></div>
  `;
}

// ─── Monthly spending heatmap ──────────────────────────────────────────────

function heatLevel(amount, max) {
  if (amount === 0 || max === 0) return 0;
  const ratio = amount / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

async function loadHeatmap() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const pad = (n) => String(n).padStart(2, "0");
  const firstOfMonth = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const lastOfMonth = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

  const rows = await api.get(
    `/expenses/summary/by-day?start_date=${firstOfMonth}&end_date=${lastOfMonth}`
  );

  const totalsMap = {};
  for (const row of rows) {
    totalsMap[row.date] = parseFloat(row.total_amount);
  }
  const max = Object.values(totalsMap).reduce((a, b) => Math.max(a, b), 0);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  document.getElementById("heatmap-month-label").textContent =
    `${monthNames[month]} ${year}`;

  // Monday-anchored offset: JS getDay() returns 0=Sun..6=Sat
  const firstDate = new Date(year, month, 1);
  let startOffset = firstDate.getDay() - 1;
  if (startOffset < 0) startOffset = 6; // Sunday → column 6 (last)

  const grid = document.getElementById("heatmap-grid");
  grid.innerHTML = "";

  // Empty leading cells
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "heatmap-cell heat-empty";
    grid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const amount = totalsMap[dateStr] || 0;

    const cell = document.createElement("div");
    cell.className = `heatmap-cell heat-${heatLevel(amount, max)}`;
    cell.textContent = d;
    if (amount > 0) {
      cell.title = `${dateStr}: RM ${amount.toFixed(2)}`;
    }
    grid.appendChild(cell);
  }
}

// ─── PTPTN current semester ────────────────────────────────────────────────

function semesterEndDate(disbursementDateStr) {
  const d = new Date(`${disbursementDateStr}T00:00:00`);
  d.setMonth(d.getMonth() + 3);
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysRemainingLabel(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((endDate - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? `${diffDays} day${diffDays === 1 ? "" : "s"}` : "Semester ended";
}

function shortfallFor(disbursement) {
  const shortfall = parseFloat(disbursement.total_semester_tuition) - parseFloat(disbursement.amount);
  return shortfall > 0 ? shortfall : 0;
}

async function loadCurrentSemester() {
  const content = document.getElementById("current-semester-content");
  const records = await api.get("/ptptn");

  if (records.length === 0) {
    content.innerHTML = '<p class="countdown-message">No PTPTN disbursement recorded yet.</p>';
    return;
  }

  const latest = [...records].sort((a, b) => (a.disbursement_date < b.disbursement_date ? 1 : -1))[0];
  const endDate = semesterEndDate(latest.disbursement_date);
  const shortfall = shortfallFor(latest);

  content.innerHTML = `
    <div class="countdown-stats">
      <div class="countdown-stat">
        <div class="summary-label">PTPTN Amount</div>
        <div class="summary-value">${formatCurrency(latest.amount)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Total Semester Tuition</div>
        <div class="summary-value">${formatCurrency(latest.total_semester_tuition)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Shortfall</div>
        <div class="summary-value ${shortfall > 0 ? "negative" : "positive"}">${formatCurrency(shortfall)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Days Remaining in Semester</div>
        <div class="summary-value">${daysRemainingLabel(endDate)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Next Expected Disbursement</div>
        <div class="summary-value">${formatDate(endDate)}</div>
      </div>
    </div>
  `;
}

// ─── Living expense countdown ──────────────────────────────────────────────

async function loadLivingExpenseCountdown() {
  const content = document.getElementById("living-expense-countdown-content");
  const countdown = await api.get("/dashboard/living-expense-countdown");

  if (countdown.message) {
    content.innerHTML = `<p class="countdown-message">${countdown.message}</p>`;
    return;
  }

  content.innerHTML = `
    <div class="countdown-stats">
      <div class="countdown-stat">
        <div class="summary-label">Living Income (This Month)</div>
        <div class="summary-value">${formatCurrency(countdown.living_income)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Living Expenses (This Month)</div>
        <div class="summary-value">${formatCurrency(countdown.living_expenses)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Remaining Balance</div>
        <div class="summary-value">${formatCurrency(countdown.remaining_balance)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Average Daily Living Spend</div>
        <div class="summary-value">${formatCurrency(countdown.average_daily_living_spend)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Days Remaining</div>
        <div class="summary-value">${countdown.estimated_days_remaining}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Estimated Runout Date</div>
        <div class="summary-value">${countdown.estimated_runout_date}</div>
      </div>
    </div>
  `;
}

// ─── Init ──────────────────────────────────────────────────────────────────

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  try {
    await Promise.all([
      loadAlertBanner(),
      loadSummary(),
      loadStreaks(),
      loadHealthScore(),
      loadHeatmap(),
      loadCurrentSemester(),
      loadLivingExpenseCountdown(),
    ]);
  } catch (err) {
    showError(err.message || "Failed to load dashboard data.");
  }
})();
