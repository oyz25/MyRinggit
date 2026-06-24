const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");

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

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

let currentUserId = null;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function loadUsers() {
  const users = await api.get("/admin/users");
  const tbody = document.getElementById("users-tbody");

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
      <td>${formatDate(user.created_at)}</td>
      <td>${user.is_active && user.user_id !== currentUserId
        ? `<button class="btn btn-small btn-danger" data-user-id="${user.user_id}">Deactivate</button>`
        : "—"
      }</td>
    `;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll("[data-user-id]").forEach((btn) => {
    btn.addEventListener("click", () => deactivateUser(parseInt(btn.dataset.userId, 10), btn));
  });
}

async function deactivateUser(userId, btn) {
  if (!confirm("Deactivate this user? They will no longer be able to log in.")) return;
  btn.disabled = true;
  btn.textContent = "Deactivating...";
  try {
    await api.patch(`/admin/users/${userId}/deactivate`, {});
    const row = document.getElementById(`user-row-${userId}`);
    if (row) {
      row.cells[5].innerHTML = '<span class="status-badge status-inactive">Inactive</span>';
      row.cells[7].textContent = "—";
    }
  } catch (err) {
    showError(err.message || "Failed to deactivate user.");
    btn.disabled = false;
    btn.textContent = "Deactivate";
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async function loadCategories() {
  const categories = await api.get("/categories");
  const tbody = document.getElementById("categories-tbody");

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

  tbody.querySelectorAll("[data-cat-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(parseInt(btn.dataset.catId, 10), btn));
  });
}

async function deleteCategory(categoryId, btn) {
  if (!confirm("Delete this category? This cannot be undone.")) return;
  btn.disabled = true;
  btn.textContent = "Deleting...";
  try {
    await api.delete(`/admin/categories/${categoryId}`);
    await loadCategories();
    showSuccess("Category deleted.");
  } catch (err) {
    showError(err.message || "Failed to delete category.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

document.getElementById("category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessages();

  const payload = {
    name: document.getElementById("cat-name").value.trim(),
    type: document.getElementById("cat-type").value,
  };

  const btn = document.getElementById("add-category-btn");
  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    await api.post("/categories", payload);
    document.getElementById("category-form").reset();
    await loadCategories();
    showSuccess(`Category "${payload.name}" added.`);
  } catch (err) {
    showError(err.message || "Failed to add category.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Category";
  }
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

// ---------------------------------------------------------------------------
// Init — verify admin role first, then load data
// ---------------------------------------------------------------------------

(async function init() {
  try {
    const me = await api.get("/auth/me");
    if (me.role !== "admin") {
      window.location.href = "dashboard.html";
      return;
    }
    currentUserId = me.user_id;
    await Promise.all([loadUsers(), loadCategories()]);
  } catch (err) {
    showError(err.message || "Failed to load admin panel.");
  }
})();
