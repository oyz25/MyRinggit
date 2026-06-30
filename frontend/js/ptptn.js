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

function renderCurrentSemester(latest) {
  const content = document.getElementById("current-semester-content");
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

async function loadDisbursements() {
  const records = await api.get("/ptptn");

  if (records.length === 0) {
    ptptnTbody.innerHTML = '<tr><td colspan="7" class="table-empty">No disbursements recorded yet.</td></tr>';
    renderCurrentSemester(null);
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

  ptptnTbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const disbursement = records.find((r) => r.disbursement_id === parseInt(btn.dataset.editId, 10));
      if (disbursement) startEditDisbursement(disbursement);
    });
  });

  ptptnTbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDisbursement(parseInt(btn.dataset.deleteId, 10), btn));
  });

  const latest = [...records].sort((a, b) => (a.disbursement_date < b.disbursement_date ? 1 : -1))[0];
  renderCurrentSemester(latest);
  return records;
}

function startEditDisbursement(disbursement) {
  editingDisbursementId = disbursement.disbursement_id;
  document.getElementById("amount").value = parseFloat(disbursement.amount).toFixed(2);
  document.getElementById("total_semester_tuition").value = parseFloat(disbursement.total_semester_tuition).toFixed(2);
  document.getElementById("disbursement_date").value = disbursement.disbursement_date;
  document.getElementById("remarks").value = disbursement.remarks ?? "";
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
    await loadDisbursements();
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
    total_semester_tuition: document.getElementById("total_semester_tuition").value,
    disbursement_date: document.getElementById("disbursement_date").value,
    remarks: document.getElementById("remarks").value.trim() || null,
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
    await loadDisbursements();
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
    await loadDisbursements();
  } catch (err) {
    showError(err.message || "Failed to load PTPTN data.");
  }
})();
