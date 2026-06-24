const errorMessage = document.getElementById("error-message");
const categorySelect = document.getElementById("category");
const incomeTbody = document.getElementById("income-tbody");
const incomeForm = document.getElementById("income-form");
const addIncomeBtn = document.getElementById("add-income-btn");
const cancelIncomeBtn = document.getElementById("cancel-income-btn");
const incomeFormHeading = document.getElementById("income-form-heading");

const notificationModal = document.getElementById("notification-modal");
const notificationModalBody = document.getElementById("notification-modal-body");
const notificationModalClose = document.getElementById("notification-modal-close");

let categoriesById = new Map();
let editingIncomeId = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

function formatCurrency(value) {
  return Number(value).toFixed(2);
}

async function loadCategories() {
  const categories = await api.get("/categories?type=income");
  categoriesById = new Map(categories.map((c) => [c.category_id, c]));

  categorySelect.innerHTML = '<option value="">No category</option>';
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.category_id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  }
}

async function loadIncome() {
  const records = await api.get("/income");

  if (records.length === 0) {
    incomeTbody.innerHTML = '<tr><td colspan="6" class="table-empty">No income recorded yet.</td></tr>';
    return;
  }

  incomeTbody.innerHTML = "";
  for (const income of records) {
    const category = categoriesById.get(income.category_id);
    const categoryLabel = category ? category.name : "-";

    const row = document.createElement("tr");
    row.id = `income-row-${income.income_id}`;
    row.innerHTML = `
      <td>${income.income_date}</td>
      <td>${categoryLabel}</td>
      <td>${income.source ?? ""}</td>
      <td>${income.description ?? ""}</td>
      <td>${formatCurrency(income.amount)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${income.income_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${income.income_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    incomeTbody.appendChild(row);
  }

  incomeTbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const income = records.find((r) => r.income_id === parseInt(btn.dataset.editId, 10));
      if (income) startEditIncome(income);
    });
  });

  incomeTbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteIncome(parseInt(btn.dataset.deleteId, 10), btn));
  });
}

function startEditIncome(income) {
  editingIncomeId = income.income_id;
  categorySelect.value = income.category_id ?? "";
  document.getElementById("amount").value = parseFloat(income.amount).toFixed(2);
  document.getElementById("source").value = income.source ?? "";
  document.getElementById("description").value = income.description ?? "";
  document.getElementById("income_date").value = income.income_date;
  incomeFormHeading.textContent = "Edit Income";
  addIncomeBtn.textContent = "Update Income";
  cancelIncomeBtn.classList.remove("hidden");
  incomeForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditIncome() {
  editingIncomeId = null;
  incomeForm.reset();
  document.getElementById("income_date").valueAsDate = new Date();
  incomeFormHeading.textContent = "Add Income";
  addIncomeBtn.textContent = "Add Income";
  cancelIncomeBtn.classList.add("hidden");
}

async function deleteIncome(id, btn) {
  if (!confirm("Delete this income record? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/income/${id}`);
    if (editingIncomeId === id) cancelEditIncome();
    await loadIncome();
  } catch (err) {
    showError(err.message || "Failed to delete income.");
    btn.disabled = false;
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

cancelIncomeBtn.addEventListener("click", cancelEditIncome);

incomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload = {
    category_id: categorySelect.value ? Number(categorySelect.value) : null,
    amount: document.getElementById("amount").value,
    source: document.getElementById("source").value.trim() || null,
    description: document.getElementById("description").value.trim() || null,
    income_date: document.getElementById("income_date").value,
  };

  const isEditing = editingIncomeId !== null;
  addIncomeBtn.disabled = true;
  addIncomeBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put(`/income/${editingIncomeId}`, payload);
      cancelEditIncome();
    } else {
      const result = await api.post("/income", payload);
      incomeForm.reset();
      document.getElementById("income_date").valueAsDate = new Date();
      showNotifications(result.new_badges ?? []);
    }
    await loadIncome();
  } catch (err) {
    showError(err.message || (isEditing ? "Failed to update income." : "Failed to add income."));
  } finally {
    addIncomeBtn.disabled = false;
    addIncomeBtn.textContent = editingIncomeId !== null ? "Update Income" : "Add Income";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  document.getElementById("income_date").valueAsDate = new Date();

  try {
    await loadCategories();
    await loadIncome();
  } catch (err) {
    showError(err.message || "Failed to load income.");
  }
})();
