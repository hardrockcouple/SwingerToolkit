// ui-common.js

export function initLogo({ retries = 25, delayMs = 80 } = {}) {
  const img = document.getElementById("siteLogo");
  if (!img) return;

  // evita duplicar handlers se chamares mais do que 1 vez
  if (!img.dataset.logoInit) {
    img.dataset.logoInit = "1";

    img.addEventListener("error", () => {
      img.style.visibility = "hidden";
    });
  }

  function trySet() {
    const cfg = window.CONFIG || {};
    if (cfg.LOGO_PATH) {
      img.src = cfg.LOGO_PATH;
      img.style.visibility = "visible";
      return true;
    }
    return false;
  }

  // tenta já
  if (trySet()) return;

  // se CONFIG ainda não existir, tenta mais umas vezes
  let left = Number(retries) || 0;
  const t = setInterval(() => {
    if (trySet() || left-- <= 0) clearInterval(t);
  }, Number(delayMs) || 80);
}

export function setActiveNav() {
  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  const current = path === "" ? "index.html" : path;

  document.querySelectorAll(".navLinks a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("active", href === current);
  });
}
