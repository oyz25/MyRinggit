import { api, clearToken, errorMessage } from "./api";
import { byId } from "./dom";
import { formatAmount } from "./format";
import { badgeSectionHtml, initNotificationModal, openNotificationModal } from "./notifications";
import type { Badge, Category, Income, IncomeCreateResponse, IncomePayload } from "./types";

const errorEl = byId("error-message");
const categorySelect = byId<HTMLSelectElement>("category");
const incomeTbody = byId("income-tbody");
const incomeForm = byId<HTMLFormElement>("income-form");
const addIncomeBtn = byId<HTMLButtonElement>("add-income-btn");
const cancelIncomeBtn = byId<HTMLButtonElement>("cancel-income-btn");
const incomeFormHeading = byId("income-form-heading");

const amountInput = byId<HTMLInputElement>("amount");
const sourceInput = byId<HTMLInputElement>("source");
const descriptionInput = byId<HTMLInputElement>("description");
const dateInput = byId<HTMLInputElement>("income_date");

let categoriesById = new Map<number, Category>();
let editingIncomeId: number | null = null;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function hideError(): void {
  errorEl.classList.add("hidden");
}

async function loadCategories(): Promise<void> {
  const categories = await api.get<Category[]>("/categories?type=income");
  categoriesById = new Map(categories.map((c) => [c.category_id, c]));

  categorySelect.innerHTML = '<option value="">No category</option>';
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = String(category.category_id);
    option.textContent = category.name;
    categorySelect.appendChild(option);
  }
}

async function loadIncome(): Promise<void> {
  const records = await api.get<Income[]>("/income");

  if (records.length === 0) {
    incomeTbody.innerHTML = '<tr><td colspan="6" class="table-empty">No income recorded yet.</td></tr>';
    return;
  }

  incomeTbody.innerHTML = "";
  for (const income of records) {
    const category = income.category_id !== null ? categoriesById.get(income.category_id) : undefined;
    const categoryLabel = category ? category.name : "-";

    const row = document.createElement("tr");
    row.id = `income-row-${income.income_id}`;
    row.innerHTML = `
      <td>${income.income_date}</td>
      <td>${categoryLabel}</td>
      <td>${income.source ?? ""}</td>
      <td>${income.description ?? ""}</td>
      <td>${formatAmount(income.amount)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-id="${income.income_id}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-id="${income.income_id}" style="margin-left: 0.25rem;">Delete</button>
      </td>
    `;
    incomeTbody.appendChild(row);
  }

  incomeTbody.querySelectorAll<HTMLButtonElement>("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const income = records.find((r) => r.income_id === parseInt(btn.dataset.editId ?? "", 10));
      if (income) startEditIncome(income);
    });
  });

  incomeTbody.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteIncome(parseInt(btn.dataset.deleteId ?? "", 10), btn));
  });
}

function startEditIncome(income: Income): void {
  editingIncomeId = income.income_id;
  categorySelect.value = income.category_id !== null ? String(income.category_id) : "";
  amountInput.value = parseFloat(income.amount).toFixed(2);
  sourceInput.value = income.source ?? "";
  descriptionInput.value = income.description ?? "";
  dateInput.value = income.income_date;
  incomeFormHeading.textContent = "Edit Income";
  addIncomeBtn.textContent = "Update Income";
  cancelIncomeBtn.classList.remove("hidden");
  incomeForm.scrollIntoView({ behavior: "smooth" });
}

function cancelEditIncome(): void {
  editingIncomeId = null;
  incomeForm.reset();
  dateInput.valueAsDate = new Date();
  incomeFormHeading.textContent = "Add Income";
  addIncomeBtn.textContent = "Add Income";
  cancelIncomeBtn.classList.add("hidden");
}

async function deleteIncome(id: number, btn: HTMLButtonElement): Promise<void> {
  if (!confirm("Delete this income record? This cannot be undone.")) return;
  btn.disabled = true;
  try {
    await api.delete(`/income/${id}`);
    if (editingIncomeId === id) cancelEditIncome();
    await loadIncome();
  } catch (err) {
    showError(errorMessage(err, "Failed to delete income."));
    btn.disabled = false;
  }
}

function showNotifications(newBadges: Badge[]): void {
  const html = badgeSectionHtml(newBadges);
  if (html) openNotificationModal(html);
}

initNotificationModal();

cancelIncomeBtn.addEventListener("click", cancelEditIncome);

incomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const payload: IncomePayload = {
    category_id: categorySelect.value ? Number(categorySelect.value) : null,
    amount: amountInput.value,
    source: sourceInput.value.trim() || null,
    description: descriptionInput.value.trim() || null,
    income_date: dateInput.value,
  };

  const isEditing = editingIncomeId !== null;
  addIncomeBtn.disabled = true;
  addIncomeBtn.textContent = isEditing ? "Updating..." : "Adding...";

  try {
    if (isEditing) {
      await api.put<Income>(`/income/${editingIncomeId}`, payload);
      cancelEditIncome();
    } else {
      const result = await api.post<IncomeCreateResponse>("/income", payload);
      incomeForm.reset();
      dateInput.valueAsDate = new Date();
      showNotifications(result.new_badges ?? []);
    }
    await loadIncome();
  } catch (err) {
    showError(errorMessage(err, isEditing ? "Failed to update income." : "Failed to add income."));
  } finally {
    addIncomeBtn.disabled = false;
    addIncomeBtn.textContent = editingIncomeId !== null ? "Update Income" : "Add Income";
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
    await loadIncome();
  } catch (err) {
    showError(errorMessage(err, "Failed to load income."));
  }
})();