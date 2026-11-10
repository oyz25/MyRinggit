import { api, clearToken, errorMessage } from "./api";
import { byId } from "./dom";
import { formatAmount } from "./format";
import { badgeSectionHtml, initNotificationModal, openNotificationModal } from "./notifications";
import type {
  Badge,
  Category,
  CategoryLimitAlert,
  Expense,
  ExpenseCreateResponse,
  ExpensePayload,
} from "./types";

const errorEl = byId("error-message");
const categorySelect = byId<HTMLSelectElement>("category");
const expensesTbody = byId("expenses-tbody");
const expenseForm = byId<HTMLFormElement>("expense-form");
const addExpenseBtn = byId<HTMLButtonElement>("add-expense-btn");
const cancelExpenseBtn = byId<HTMLButtonElement>("cancel-expense-btn");
const expenseFormHeading = byId("expense-form-heading");

const amountInput = byId<HTMLInputElement>("amount");
const descriptionInput = byId<HTMLInputElement>("description");
const dateInput = byId<HTMLInputElement>("expense_date");

let categoriesById = new Map<number, Category>();
let editingExpenseId: number | null = null;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function hideError(): void {
  errorEl.classList.add("hidden");
}

async function loadCategories(): Promise<void> {
  const categories = await api.get<Category[]>("/categories?type=expense");
  categoriesById = new Map(categories.map((c) => [c.category_id, c]));

  categorySelect.innerHTML = "";
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = String(category.category_id);
    option.textContent = category.name;
    categorySelect.appendChild(option);
  }
}

async function loadExpenses(): Promise<void> {
  const expenses = await api.get<Expense[]>("/expenses");

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
      <td>${formatAmount(expense.amount)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${expense.expense_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${expense.expense_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    expensesTbody.appendChild(row);
  }

  expensesTbody.querySelectorAll<HTMLButtonElement>("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expense = expenses.find((e) => e.expense_id === parseInt(btn.dataset.editId ?? "", 10));
      if (expense) startEditExpense(expense);
    });
  });

  expensesTbody.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteExpense(parseInt(btn.dataset.deleteId ?? "", 10), btn));
  });
}

function startEditExpense(expense: Expense): void {
  editingExpenseId = expense.expense_id;
  categorySelect.value = String(expense.category_id);
  amountInput.value = parseFloat(expense.amount).toFixed(2);
  descriptionInput.value = expense.description ?? "";
  dateInput.value = expense.expense_date;
  expenseFormHeading.textContent = "Edit Expense";
  addExpenseBtn.textContent = "Update Expense";
  cancelExpenseBtn.classList.remove("hidden");
  expenseForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditExpense(): void {
  editingExpenseId = null;
  expenseForm.reset();
  dateInput.valueAsDate = new Date();
  expenseFormHeading.textContent = "Add Expense";
  addExpenseBtn.textContent = "Add Expense";
  cancelExpenseBtn.classList.add("hidden");
}

async function deleteExpense(id: number, btn: HTMLButtonElement): Promise<void> {
  if (!confirm("Delete this expense? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/expenses/${id}`);
    if (editingExpenseId === id) cancelEditExpense();
    await loadExpenses();
  } catch (err) {
    showError(errorMessage(err, "Failed to delete expense."));
    btn.disabled = false;
  }
}

function alertSectionHtml(alerts: CategoryLimitAlert[]): string {
  if (alerts.length === 0) return "";

  let html = `<h3 style="font-size: 1rem; margin: 1rem 0 0.25rem;">Spending alert</h3>`;
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
            RM ${formatAmount(alert.spent_so_far)} of RM ${formatAmount(alert.monthly_limit)}
            (${formatAmount(alert.percent_used)}%) - ${status}
          </div>
        </div>
      </div>
    `;
  }
  return html;
}

function showNotifications(newBadges: Badge[], alerts: CategoryLimitAlert[]): void {
  const html = badgeSectionHtml(newBadges) + alertSectionHtml(alerts);
  if (html) openNotificationModal(html);
}

initNotificationModal();

cancelExpenseBtn.addEventListener("click", cancelEditExpense);

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload: ExpensePayload = {
    category_id: Number(categorySelect.value),
    amount: amountInput.value,
    description: descriptionInput.value.trim() || null,
    expense_date: dateInput.value,
  };

  const isEditing = editingExpenseId !== null;
  addExpenseBtn.disabled = true;
  addExpenseBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put<Expense>(`/expenses/${editingExpenseId}`, payload);
      cancelEditExpense();
    } else {
      const result = await api.post<ExpenseCreateResponse>("/expenses", payload);
      expenseForm.reset();
      dateInput.valueAsDate = new Date();
      showNotifications(result.new_badges ?? [], result.alerts ?? []);
    }
    await loadExpenses();
  } catch (err) {
    showError(errorMessage(err, isEditing ? "Failed to update expense." : "Failed to add expense."));
  } finally {
    addExpenseBtn.disabled = false;
    addExpenseBtn.textContent = editingExpenseId !== null ? "Update Expense" : "Add Expense";
  }
});

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

(async function init() {
  dateInput.valueAsDate = new Date();

  try {
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    showError(errorMessage(err, "Failed to load expenses."));
  }
})();