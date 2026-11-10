/**
 * Reusable Chart.js builders for the dashboard and health score pages.
 */

import { Chart, registerables, type LegendItem } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

import type { CategoryBreakdown } from "./types";

Chart.register(...registerables, ChartDataLabels);

// ─── Theme-aware color helpers ─────────────────────────────────────────────

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#1f2933";
}

// Push current theme text color into Chart.js global defaults so every chart
// inherits it without explicit per-chart wiring.
function syncChartColors(): void {
  const color = cssVar("--color-text");
  console.log(
    "[MyRinggit] chart theme sync — --color-text:", JSON.stringify(color),
    "| data-theme:", document.documentElement.getAttribute("data-theme"),
  );
  Chart.defaults.color = color;
}

syncChartColors(); // apply on first load

// Charts registered here get a re-render (so generateLabels re-reads cssVar)
// whenever data-theme changes.
const themedCharts = new Set<Chart>();

new MutationObserver(() => {
  syncChartColors();
  for (const chart of themedCharts) {
    chart.update("none");
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ──────────────────────────────────────────────────────────────────────────

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
] as const;

/**
 * Renders the Financial Health Score as a donut gauge (score vs. remainder).
 * The slice color reflects how healthy the score is.
 *
 * @param score - 0-100
 */
export function renderHealthScoreChart(canvas: HTMLCanvasElement, score: number): Chart<"doughnut"> {
  const clamped = Math.max(0, Math.min(100, score));

  let color: string;
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
        datalabels: { display: false },
      },
      maintainAspectRatio: false,
    },
  });
}

/** Renders a pie chart of expense totals grouped by category. */
export function renderExpenseBreakdownChart(
  canvas: HTMLCanvasElement,
  breakdown: CategoryBreakdown[],
): Chart<"pie"> {
  const labels = breakdown.map((row) => row.category_name);
  const values = breakdown.map((row) => parseFloat(row.total_amount));
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] as string);

  const chart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: cssVar("--color-text"),
            generateLabels: (): LegendItem[] => {
              const textColor = cssVar("--color-text");
              return labels.map((label, i) => ({
                text: `${label} — RM ${(values[i] ?? 0).toFixed(2)}`,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                fontColor: textColor,
                lineWidth: 0,
                index: i,
                hidden: false,
              }));
            },
            padding: 12,
            boxWidth: 12,
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const pct = (context.parsed / total * 100).toFixed(1);
              return `${context.label}: RM ${context.parsed.toFixed(2)} (${pct}%)`;
            },
          },
        },
        datalabels: {
          // Hide label on slices smaller than 5% to avoid overlap
          display: (context) => (values[context.dataIndex] ?? 0) / total >= 0.05,
          formatter: (value: number) => `${(value / total * 100).toFixed(1)}%`,
          color: "#fff",
          font: { weight: "bold", size: 12 },
        },
      },
    },
  });
  themedCharts.add(chart as Chart);
  return chart;
}