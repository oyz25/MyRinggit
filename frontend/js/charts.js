/**
 * Reusable Chart.js builders for the dashboard.
 */

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4338ca",
];

/**
 * Renders the Financial Health Score as a donut gauge (score vs. remainder).
 * The slice color reflects how healthy the score is.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} score - 0-100
 * @returns {Chart}
 */
function renderHealthScoreChart(canvas, score) {
  const clamped = Math.max(0, Math.min(100, score));

  let color;
  if (clamped >= 70) {
    color = "#16a34a";
  } else if (clamped >= 40) {
    color = "#d97706";
  } else {
    color = "#dc2626";
  }

  return new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [clamped, 100 - clamped],
          backgroundColor: [color, "#e5e7eb"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      rotation: -90,
      circumference: 360,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      maintainAspectRatio: false,
    },
  });
}

/**
 * Renders a pie chart of expense totals grouped by category.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{category_name: string, total_amount: string|number}[]} breakdown
 * @returns {Chart}
 */
function renderExpenseBreakdownChart(canvas, breakdown) {
  const labels = breakdown.map((row) => row.category_name);
  const values = breakdown.map((row) => parseFloat(row.total_amount));

  return new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: 1,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: RM ${context.parsed.toFixed(2)}`,
          },
        },
      },
    },
  });
}
