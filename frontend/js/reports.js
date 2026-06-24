/**
 * Reports page: lets the user pick a month/year and download a PDF
 * summary report for that period.
 */

const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const reportForm = document.getElementById("report-form");
const monthSelect = document.getElementById("month");
const yearSelect = document.getElementById("year");
const downloadBtn = document.getElementById("download-report-btn");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function showError(message) {
  successMessage.classList.add("hidden");
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function showSuccess(message) {
  errorMessage.classList.add("hidden");
  successMessage.textContent = message;
  successMessage.classList.remove("hidden");
}

function hideMessages() {
  errorMessage.classList.add("hidden");
  successMessage.classList.add("hidden");
}

function populateSelectors() {
  const now = new Date();

  MONTH_NAMES.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = index + 1;
    option.textContent = name;
    monthSelect.appendChild(option);
  });
  monthSelect.value = now.getMonth() + 1;

  const currentYear = now.getFullYear();
  for (let year = currentYear; year >= currentYear - 4; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
  yearSelect.value = currentYear;
}

function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
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
      let detail = "No data available for the selected month.";
      try {
        const errorBody = await response.json();
        detail = errorBody.detail || detail;
      } catch {
        // response body wasn't JSON, keep the default message
      }
      throw new Error(detail);
    }

    const blob = await response.blob();
    const filename = extractFilename(
      response.headers.get("Content-Disposition"),
      `myringgit-report-${year}-${String(month).padStart(2, "0")}.pdf`
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(`Report for ${MONTH_NAMES[month - 1]} ${year} downloaded.`);
  } catch (err) {
    showError(err.message || "Failed to generate report.");
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download Monthly Report";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

populateSelectors();
