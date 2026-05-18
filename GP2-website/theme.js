(function () {
  const savedTheme = localStorage.getItem("awtad-theme") || "dark";

  document.body.classList.toggle("light-mode", savedTheme === "light");

  function updateButton() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    const isLight = document.body.classList.contains("light-mode");
    btn.innerHTML = isLight
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateButton();

    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", function () {
      const isLight = document.body.classList.toggle("light-mode");
      localStorage.setItem("awtad-theme", isLight ? "light" : "dark");
      updateButton();
    });
  });
})();