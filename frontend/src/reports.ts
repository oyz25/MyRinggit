/**
 * Reports page: lets the user pick a month/year and download a PDF
 * summary report for that period.
 */

import { API_BASE_URL, clearToken, getToken, readErrorDetail, errorMessage } from "./api";
import { byId } from "./dom";
import { MONTH_NAMES } from "./format";

const errorEl = byId("error-message");
const successEl = byId("success-message");
const reportForm = byId<HTMLFormElement>("report-form");
const monthSelect = byId<HTMLSelectElement>("month");
const yearSelect = byId<HTMLSelectElement>("year");
const downloadBtn = byId<HTMLButtonElement>("download-report-btn");

function showError(message: string): void {
  successEl.classList.add("hidden");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function showSuccess(message: string): void {
  errorEl.classList.add("hidden");
  successEl.textContent = message;
  successEl.classList.remove("hidden");
}

function hideMessages(): void {
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");
}

function populateSelectors(): void {
  const now = new Date();

  MONTH_NAMES.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = name;
    monthSelect.appendChild(option);
  });
  monthSelect.value = String(now.getMonth() + 1);

  const currentYear = now.getFullYear();
  for (let year = currentYear; year >= currentYear - 4; year--) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  }
  yearSelect.value = String(currentYear);
}

function extractFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessages();

  const year = yearSelect.value;
  const month = monthSelect.value;

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Generating...";

  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/reports/monthly?year=${year}&month=${month}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (response.status === 401) {
      clearToken();
      window.location.href = "login.html";
      return;
    }

    if (!response.ok) {
      throw new Error(await readErrorDetail(response, "No data available for the selected month."));
    }

    const blob = await response.blob();
    const filename = extractFilename(
      response.headers.get("Content-Disposition"),
      `myringgit-report-${year}-${month.padStart(2, "0")}.pdf`,
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(`Report for ${MONTH_NAMES[Number(month) - 1]} ${year} downloaded.`);
  } catch (err) {
    showError(errorMessage(err, "Failed to generate report."));
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download Monthly Report";
  }
});

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

populateSelectors();