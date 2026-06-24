(function applyAdminLink() {
  const link = document.getElementById("admin-nav-link");
  if (link && getTokenRole() === "admin") {
    link.classList.remove("hidden");
  }
})();
