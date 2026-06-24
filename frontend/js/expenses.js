const errorMessage = document.getElementById("error-message");
const categorySelect = document.getElementById("category");
const expensesTbody = document.getElementById("expenses-tbody");
const expenseForm = document.getElementById("expense-form");
const addExpenseBtn = document.getElementById("add-expense-btn");
const cancelExpenseBtn = document.getElementById("cancel-expense-btn");
const expenseFormHeading = document.getElementById("expense-form-heading");

const notificationModal = document.getElementById("notification-modal");
const notificationModalBody = document.getElementById("notification-modal-body");
const notificationModalClose = document.getElementById("notification-modal-close");

let categoriesById = new Map();
let editingExpenseId = null;

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
  const categories = await api.get("/categories?type=expense");
  categoriesById = new Map(categories.map((c) => [c.category_id, c]));

  categorySelect.innerHTML = "";
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.category_id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  }
}

async function loadExpenses() {
  const expenses = await api.get("/expenses");

  if (expenses.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="5" class="table-empty">No expenses recorded yet.</td></tr>';
    return;
  }

  expensesTbody.innerHTML = "";
  for (const expense of expenses) {
    const category = categoriesById.get(expense.category_id);
    const categoryLabel = category ? category.name : `#${expense.category_id}`;

    const row = document.createElement("tr");
    row.id = `expense-row-${expense.expense_id}`;
    row.innerHTML = `
      <td>${expense.expense_date}</td>
      <td>${categoryLabel}</td>
      <td>${expense.description ?? ""}</td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${expense.expense_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${expense.expense_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    expensesTbody.appendChild(row);
  }

  expensesTbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expense = expenses.find((e) => e.expense_id === parseInt(btn.dataset.editId, 10));
      if (expense) startEditExpense(expense);
    });
  });

  expensesTbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteExpense(parseInt(btn.dataset.deleteId, 10), btn));
  });
}

function startEditExpense(expense) {
  editingExpenseId = expense.expense_id;
  categorySelect.value = expense.category_id;
  document.getElementById("amount").value = parseFloat(expense.amount).toFixed(2);
  document.getElementById("description").value = expense.description ?? "";
  document.getElementById("expense_date").value = expense.expense_date;
  expenseFormHeading.textContent = "Edit Expense";
  addExpenseBtn.textContent = "Update Expense";
  cancelExpenseBtn.classList.remove("hidden");
  expenseForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditExpense() {
  editingExpenseId = null;
  expenseForm.reset();
  document.getElementById("expense_date").valueAsDate = new Date();
  expenseFormHeading.textContent = "Add Expense";
  addExpenseBtn.textContent = "Add Expense";
  cancelExpenseBtn.classList.add("hidden");
}

async function deleteExpense(id, btn) {
  if (!confirm("Delete this expense? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/expenses/${id}`);
    if (editingExpenseId === id) cancelEditExpense();
    await loadExpenses();
  } catch (err) {
    showError(err.message || "Failed to delete expense.");
    btn.disabled = false;
  }
}

function showNotifications(newBadges, alerts) {
  if (newBadges.length === 0 && alerts.length === 0) {
    return;
  }

  let html = "";

  if (newBadges.length > 0) {
    html += `<h3 style="font-size: 1rem; margin: 0 0 0.25rem;">New badge${newBadges.length > 1 ? "s" : ""} earned!</h3>`;
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
  }

  if (alerts.length > 0) {
    html += `<h3 style="font-size: 1rem; margin: 1rem 0 0.25rem;">Spending alert</h3>`;
    for (const alert of alerts) {
      const category = categoriesById.get(alert.category_id);
      const categoryName = category ? category.name : `Category #${alert.category_id}`;
      const status = alert.is_over_limit ? "over your monthly limit" : "near your monthly limit";
      html += `
        <div class="modal-item">
          <div class="modal-item-icon">${alert.is_over_limit ? "⚠️" : "🔔"}</div>
          <div>
            <div class="modal-item-title">${categoryName}</div>
            <div class="modal-item-desc">
              RM ${formatCurrency(alert.spent_so_far)} of RM ${formatCurrency(alert.monthly_limit)}
              (${formatCurrency(alert.percent_used)}%) - ${status}
            </div>
          </div>
        </div>
      `;
    }
  }

  notificationModalBody.innerHTML = html;
  notificationModal.classList.remove("hidden");
}

notificationModalClose.addEventListener("click", () => {
  notificationModal.classList.add("hidden");
});

cancelExpenseBtn.addEventListener("click", cancelEditExpense);

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload = {
    category_id: Number(categorySelect.value),
    amount: document.getElementById("amount").value,
    description: document.getElementById("description").value.trim() || null,
    expense_date: document.getElementById("expense_date").value,
  };

  const isEditing = editingExpenseId !== null;
  addExpenseBtn.disabled = true;
  addExpenseBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put(`/expenses/${editingExpenseId}`, payload);
      cancelEditExpense();
    } else {
      const result = await api.post("/expenses", payload);
      expenseForm.reset();
      document.getElementById("expense_date").valueAsDate = new Date();
      showNotifications(result.new_badges ?? [], result.alerts ?? []);
    }
    await loadExpenses();
  } catch (err) {
    showError(err.message || (isEditing ? "Failed to update expense." : "Failed to add expense."));
  } finally {
    addExpenseBtn.disabled = false;
    addExpenseBtn.textContent = editingExpenseId !== null ? "Update Expense" : "Add Expense";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  document.getElementById("expense_date").valueAsDate = new Date();

  try {
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    showError(err.message || "Failed to load expenses.");
  }
})();
