// ui-common.js

export function initLogo({ retries = 25, delayMs = 80 } = {}) {
  const img = document.getElementById("siteLogo");
  if (!img) return;

  // evita duplicar handlers se chamares mais do que 1 vez
  if (!img.dataset.logoInit) {
    img.dataset.logoInit = "1";

    img.addEventListener("error", () => {
      // Se falhar, tenta fallback uma vez (sem ficar “preso” invisível)
      img.style.visibility = "hidden";
    });
  }

  function resolveUrl(path) {
    // Garante URL absoluta (funciona bem em GH Pages e com base tags)
    return new URL(path, document.baseURI).toString();
  }

  function trySet() {
    const cfg = window.CONFIG || {};

    // ✅ novo nome (logoUrl)
    const path = cfg.logoUrl || cfg.LOGO_PATH; // mantém compatibilidade (opcional)
    if (!path) return false;

    const nextSrc = resolveUrl(path);

    // evita reatribuir sempre (menos flicker)
    if (img.src !== nextSrc) img.src = nextSrc;

    img.decoding = "async";
    img.loading = "eager";
    img.style.visibility = "visible";
    return true;
  }

  // tenta já
  if (trySet()) {
    updateLayoutVars();
    return;
  }

  // se CONFIG ainda não existir, tenta mais umas vezes
  let left = Number(retries) || 0;
  const t = setInterval(() => {
    if (trySet() || left-- <= 0) {
      clearInterval(t);
      updateLayoutVars();
    }
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

export function updateLayoutVars() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  document.documentElement.style.setProperty("--navbar-h", `${nav.offsetHeight}px`);
}

// mantém as vars actualizadas se o ecrã mudar
window.addEventListener("resize", () => requestAnimationFrame(updateLayoutVars));
window.addEventListener("orientationchange", () => requestAnimationFrame(updateLayoutVars));