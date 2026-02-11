// ui-common.js
export function initLogo() {
  const img = document.getElementById("siteLogo");
  if (!img) return;

  const cfg = window.CONFIG || {};
  if (cfg.LOGO_PATH) img.src = cfg.LOGO_PATH;

  img.addEventListener("error", () => {
    img.style.visibility = "hidden";
  });
}

export function setActiveNav() {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".navLinks a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("active", href === path);
  });
}
