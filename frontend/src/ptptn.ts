import { api, clearToken, errorMessage } from "./api";
import { byId } from "./dom";
import { formatCurrency, formatDate } from "./format";
import { daysRemainingLabel, latestDisbursement, semesterEndDate, shortfallFor } from "./semester";
import type { PtptnDisbursement, PtptnPayload } from "./types";

const errorEl = byId("error-message");
const ptptnForm = byId<HTMLFormElement>("ptptn-form");
const ptptnTbody = byId("ptptn-tbody");
const addDisbursementBtn = byId<HTMLButtonElement>("add-disbursement-btn");
const cancelDisbursementBtn = byId<HTMLButtonElement>("cancel-disbursement-btn");
const ptptnFormHeading = byId("ptptn-form-heading");

const amountInput = byId<HTMLInputElement>("amount");
const tuitionInput = byId<HTMLInputElement>("total_semester_tuition");
const dateInput = byId<HTMLInputElement>("disbursement_date");
const remarksInput = byId<HTMLInputElement>("remarks");

let editingDisbursementId: number | null = null;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function hideError(): void {
  errorEl.classList.add("hidden");
}

function renderCurrentSemester(latest: PtptnDisbursement | undefined): void {
  const content = byId("current-semester-content");
  if (!latest) {
    content.innerHTML = '<p class="countdown-message">No PTPTN disbursement recorded yet.</p>';
    return;
  }

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

async function loadDisbursements(): Promise<PtptnDisbursement[]> {
  const records = await api.get<PtptnDisbursement[]>("/ptptn");

  if (records.length === 0) {
    ptptnTbody.innerHTML = '<tr><td colspan="7" class="table-empty">No disbursements recorded yet.</td></tr>';
    renderCurrentSemester(undefined);
    return records;
  }

  ptptnTbody.innerHTML = "";
  for (const disbursement of records) {
    const endDate = semesterEndDate(disbursement.disbursement_date);
    const shortfall = shortfallFor(disbursement);

    const row = document.createElement("tr");
    row.id = `disbursement-row-${disbursement.disbursement_id}`;
    row.innerHTML = `
      <td>${disbursement.disbursement_date}</td>
      <td>${formatCurrency(disbursement.amount)}</td>
      <td>${formatCurrency(disbursement.total_semester_tuition)}</td>
      <td>${formatCurrency(shortfall)}</td>
      <td>${disbursement.remarks ?? ""}</td>
      <td>${formatDate(endDate)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${disbursement.disbursement_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${disbursement.disbursement_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    ptptnTbody.appendChild(row);
  }

  ptptnTbody.querySelectorAll<HTMLButtonElement>("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const disbursement = records.find((r) => r.disbursement_id === parseInt(btn.dataset.editId ?? "", 10));
      if (disbursement) startEditDisbursement(disbursement);
    });
  });

  ptptnTbody.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDisbursement(parseInt(btn.dataset.deleteId ?? "", 10), btn));
  });

  renderCurrentSemester(latestDisbursement(records));
  return records;
}

function startEditDisbursement(disbursement: PtptnDisbursement): void {
  editingDisbursementId = disbursement.disbursement_id;
  amountInput.value = parseFloat(disbursement.amount).toFixed(2);
  tuitionInput.value = parseFloat(disbursement.total_semester_tuition).toFixed(2);
  dateInput.value = disbursement.disbursement_date;
  remarksInput.value = disbursement.remarks ?? "";
  ptptnFormHeading.textContent = "Edit Disbursement";
  addDisbursementBtn.textContent = "Update Disbursement";
  cancelDisbursementBtn.classList.remove("hidden");
  ptptnForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditDisbursement(): void {
  editingDisbursementId = null;
  ptptnForm.reset();
  dateInput.valueAsDate = new Date();
  ptptnFormHeading.textContent = "Add Disbursement";
  addDisbursementBtn.textContent = "Add Disbursement";
  cancelDisbursementBtn.classList.add("hidden");
}

async function deleteDisbursement(id: number, btn: HTMLButtonElement): Promise<void> {
  if (!confirm("Delete this disbursement? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/ptptn/${id}`);
    if (editingDisbursementId === id) cancelEditDisbursement();
    await loadDisbursements();
  } catch (err) {
    showError(errorMessage(err, "Failed to delete disbursement."));
    btn.disabled = false;
  }
}

cancelDisbursementBtn.addEventListener("click", cancelEditDisbursement);

ptptnForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload: PtptnPayload = {
    amount: amountInput.value,
    total_semester_tuition: tuitionInput.value,
    disbursement_date: dateInput.value,
    remarks: remarksInput.value.trim() || null,
  };

  const isEditing = editingDisbursementId !== null;
  addDisbursementBtn.disabled = true;
  addDisbursementBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put<PtptnDisbursement>(`/ptptn/${editingDisbursementId}`, payload);
      cancelEditDisbursement();
    } else {
      await api.post<PtptnDisbursement>("/ptptn", payload);
      ptptnForm.reset();
      dateInput.valueAsDate = new Date();
    }
    await loadDisbursements();
  } catch (err) {
    showError(errorMessage(err, isEditing ? "Failed to update disbursement." : "Failed to add disbursement."));
  } finally {
    addDisbursementBtn.disabled = false;
    addDisbursementBtn.textContent = editingDisbursementId !== null ? "Update Disbursement" : "Add Disbursement";
  }
});

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  dateInput.valueAsDate = new Date();

  try {
    await loadDisbursements();
  } catch (err) {
    showError(errorMessage(err, "Failed to load PTPTN data."));
  }
})();