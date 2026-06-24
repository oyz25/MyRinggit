const errorMessage = document.getElementById("error-message");
const ptptnForm = document.getElementById("ptptn-form");
const ptptnTbody = document.getElementById("ptptn-tbody");
const addDisbursementBtn = document.getElementById("add-disbursement-btn");
const cancelDisbursementBtn = document.getElementById("cancel-disbursement-btn");
const ptptnFormHeading = document.getElementById("ptptn-form-heading");

let editingDisbursementId = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

function formatCurrency(value) {
  return `RM ${parseFloat(value).toFixed(2)}`;
}

async function loadSurvivalCountdown() {
  const content = document.getElementById("countdown-content");
  const countdown = await api.get("/ptptn/survival-countdown");

  if (countdown.message) {
    content.innerHTML = `<p class="countdown-message">${countdown.message}</p>`;
    return;
  }

  content.innerHTML = `
    <div class="countdown-stats">
      <div class="countdown-stat">
        <div class="summary-label">Remaining Balance</div>
        <div class="summary-value">${formatCurrency(countdown.remaining_balance)}</div>
      </div>
      <div class="countdown-stat">
        <div class="summary-label">Average Daily Spend</div>
        <div class="summary-value">${formatCurrency(countdown.average_daily_spend)}</div>
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

async function loadDisbursements() {
  const records = await api.get("/ptptn");

  if (records.length === 0) {
    ptptnTbody.innerHTML = '<tr><td colspan="5" class="table-empty">No disbursements recorded yet.</td></tr>';
    return;
  }

  ptptnTbody.innerHTML = "";
  for (const disbursement of records) {
    const row = document.createElement("tr");
    row.id = `disbursement-row-${disbursement.disbursement_id}`;
    row.innerHTML = `
      <td>${disbursement.disbursement_date}</td>
      <td>${formatCurrency(disbursement.amount)}</td>
      <td>${disbursement.remarks ?? ""}</td>
      <td>${disbursement.expected_next_date ?? ""}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${disbursement.disbursement_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${disbursement.disbursement_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    ptptnTbody.appendChild(row);
  }

  ptptnTbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const disbursement = records.find((r) => r.disbursement_id === parseInt(btn.dataset.editId, 10));
      if (disbursement) startEditDisbursement(disbursement);
    });
  });

  ptptnTbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDisbursement(parseInt(btn.dataset.deleteId, 10), btn));
  });
}

function startEditDisbursement(disbursement) {
  editingDisbursementId = disbursement.disbursement_id;
  document.getElementById("amount").value = parseFloat(disbursement.amount).toFixed(2);
  document.getElementById("disbursement_date").value = disbursement.disbursement_date;
  document.getElementById("remarks").value = disbursement.remarks ?? "";
  document.getElementById("expected_next_date").value = disbursement.expected_next_date ?? "";
  ptptnFormHeading.textContent = "Edit Disbursement";
  addDisbursementBtn.textContent = "Update Disbursement";
  cancelDisbursementBtn.classList.remove("hidden");
  ptptnForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditDisbursement() {
  editingDisbursementId = null;
  ptptnForm.reset();
  document.getElementById("disbursement_date").valueAsDate = new Date();
  ptptnFormHeading.textContent = "Add Disbursement";
  addDisbursementBtn.textContent = "Add Disbursement";
  cancelDisbursementBtn.classList.add("hidden");
}

async function deleteDisbursement(id, btn) {
  if (!confirm("Delete this disbursement? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/ptptn/${id}`);
    if (editingDisbursementId === id) cancelEditDisbursement();
    await Promise.all([loadDisbursements(), loadSurvivalCountdown()]);
  } catch (err) {
    showError(err.message || "Failed to delete disbursement.");
    btn.disabled = false;
  }
}

cancelDisbursementBtn.addEventListener("click", cancelEditDisbursement);

ptptnForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload = {
    amount: document.getElementById("amount").value,
    disbursement_date: document.getElementById("disbursement_date").value,
    remarks: document.getElementById("remarks").value.trim() || null,
    expected_next_date: document.getElementById("expected_next_date").value || null,
  };

  const isEditing = editingDisbursementId !== null;
  addDisbursementBtn.disabled = true;
  addDisbursementBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put(`/ptptn/${editingDisbursementId}`, payload);
      cancelEditDisbursement();
    } else {
      await api.post("/ptptn", payload);
      ptptnForm.reset();
      document.getElementById("disbursement_date").valueAsDate = new Date();
    }
    await Promise.all([loadDisbursements(), loadSurvivalCountdown()]);
  } catch (err) {
    showError(err.message || (isEditing ? "Failed to update disbursement." : "Failed to add disbursement."));
  } finally {
    addDisbursementBtn.disabled = false;
    addDisbursementBtn.textContent = editingDisbursementId !== null ? "Update Disbursement" : "Add Disbursement";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  document.getElementById("disbursement_date").valueAsDate = new Date();

  try {
    await Promise.all([loadDisbursements(), loadSurvivalCountdown()]);
  } catch (err) {
    showError(err.message || "Failed to load PTPTN data.");
  }
})();
