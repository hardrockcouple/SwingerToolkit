export function initLogo() {
  const img = document.getElementById("siteLogo");
  if (!img) return;

  const cfg = window.CONFIG || {};
  const url = (cfg.LOGO_PATH || "").trim();

  if (!url) {
    console.warn("[Logo] CONFIG.LOGO_PATH vazio.");
    img.style.display = "none";
    return;
  }

  img.src = url;

  img.addEventListener("load", () => {
    // ok
  });

  img.addEventListener("error", () => {
    console.warn("[Logo] Falhou a carregar:", url);

    // fallback simples para confirmar se é problema de URL/hotlink
    img.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="240" height="80">
          <rect width="100%" height="100%" fill="#000"/>
          <text x="12" y="50" fill="#c6a75e" font-family="Arial" font-size="26" font-weight="700">
            SW TOOLKIT
          </text>
        </svg>
      `);
  });
}
