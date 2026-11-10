import { api, clearToken, errorMessage } from "./api";
import { byId } from "./dom";
import { formatDisplayDate } from "./format";
import type { Category, CategoryCreate, User } from "./types";

const errorEl = byId("error-message");
const successEl = byId("success-message");

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

let currentUserId: number | null = null;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function loadUsers(): Promise<void> {
  const users = await api.get<User[]>("/admin/users");
  const tbody = byId("users-tbody");

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  for (const user of users) {
    const row = document.createElement("tr");
    row.id = `user-row-${user.user_id}`;
    row.innerHTML = `
      <td>${user.user_id}</td>
      <td>${user.full_name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.university ?? "—"}</td>
      <td><span class="status-badge ${user.is_active ? "status-active" : "status-inactive"}">${user.is_active ? "Active" : "Inactive"}</span></td>
      <td>${formatDisplayDate(user.created_at)}</td>
      <td>${user.is_active && user.user_id !== currentUserId
        ? `<button class="btn btn-small btn-danger" data-user-id="${user.user_id}">Deactivate</button>`
        : "—"
      }</td>
    `;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll<HTMLButtonElement>("[data-user-id]").forEach((btn) => {
    btn.addEventListener("click", () => deactivateUser(parseInt(btn.dataset.userId ?? "", 10), btn));
  });
}

async function deactivateUser(userId: number, btn: HTMLButtonElement): Promise<void> {
  if (!confirm("Deactivate this user? They will no longer be able to log in.")) return;
  btn.disabled = true;
  btn.textContent = "Deactivating...";
  try {
    await api.patch<User>(`/admin/users/${userId}/deactivate`, {});
    const row = document.getElementById(`user-row-${userId}`) as HTMLTableRowElement | null;
    if (row) {
      const statusCell = row.cells[5];
      const actionCell = row.cells[7];
      if (statusCell) statusCell.innerHTML = '<span class="status-badge status-inactive">Inactive</span>';
      if (actionCell) actionCell.textContent = "—";
    }
  } catch (err) {
    showError(errorMessage(err, "Failed to deactivate user."));
    btn.disabled = false;
    btn.textContent = "Deactivate";
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async function loadCategories(): Promise<void> {
  const categories = await api.get<Category[]>("/categories");
  const tbody = byId("categories-tbody");

  if (categories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No categories found.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  for (const cat of categories) {
    const row = document.createElement("tr");
    row.id = `cat-row-${cat.category_id}`;
    row.innerHTML = `
      <td>${cat.name}</td>
      <td>${cat.type}</td>
      <td>${cat.is_default ? "Yes" : "No"}</td>
      <td><button class="btn btn-small btn-danger" data-cat-id="${cat.category_id}">Delete</button></td>
    `;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll<HTMLButtonElement>("[data-cat-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(parseInt(btn.dataset.catId ?? "", 10), btn));
  });
}

async function deleteCategory(categoryId: number, btn: HTMLButtonElement): Promise<void> {
  if (!confirm("Delete this category? This cannot be undone.")) return;
  btn.disabled = true;
  btn.textContent = "Deleting...";
  try {
    await api.delete(`/admin/categories/${categoryId}`);
    await loadCategories();
    showSuccess("Category deleted.");
  } catch (err) {
    showError(errorMessage(err, "Failed to delete category."));
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

const categoryForm = byId<HTMLFormElement>("category-form");

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessages();

  const payload: CategoryCreate = {
    name: byId<HTMLInputElement>("cat-name").value.trim(),
    type: byId<HTMLSelectElement>("cat-type").value,
  };

  const btn = byId<HTMLButtonElement>("add-category-btn");
  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    await api.post<Category>("/categories", payload);
    categoryForm.reset();
    await loadCategories();
    showSuccess(`Category "${payload.name}" added.`);
  } catch (err) {
    showError(errorMessage(err, "Failed to add category."));
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Category";
  }
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

byId("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

// ---------------------------------------------------------------------------
// Init — verify admin role first, then load data
// ---------------------------------------------------------------------------

(async function init() {
  try {
    const me = await api.get<User>("/auth/me");
    if (me.role !== "admin") {
      window.location.href = "dashboard.html";
      return;
    }
    currentUserId = me.user_id;
    await Promise.all([loadUsers(), loadCategories()]);
  } catch (err) {
    showError(errorMessage(err, "Failed to load admin panel."));
  }
})();