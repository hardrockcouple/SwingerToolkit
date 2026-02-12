// clubs2-data.js
function safeText(v) {
  return String(v ?? "").trim();
}

function toBool(v) {
  const s = safeText(v).toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1" || s === "visited";
}

export async function loadClubs() {
  // suporta window.CONFIG (recomendado) e fallback para CONFIG global (se existir)
  const cfg = window.CONFIG || (typeof CONFIG !== "undefined" ? CONFIG : {});
  if (!cfg.DATA_SOURCE) {
    throw new Error(
      "CONFIG.DATA_SOURCE missing (confirma que config.js define window.CONFIG e que é carregado antes do módulo)"
    );
  }

  const res = await fetch(cfg.DATA_SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error(`JSON fetch failed: ${res.status}`);

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("clubs.json must be an array");
  }

  return data
    .map((x) => {
      const lat = safeText(x.lat);
      const lng = safeText(x.lng ?? x.lon);
      const latNumRaw = lat ? Number(lat.replace(",", ".")) : null;
      const lngNumRaw = lng ? Number(lng.replace(",", ".")) : null;
      const latNum = Number.isFinite(latNumRaw) ? latNumRaw : null;
      const lngNum = Number.isFinite(lngNumRaw) ? lngNumRaw : null;
      return {
      id: safeText(x.id),
      name: safeText(x.name),
      country: safeText(x.country),
      city: safeText(x.city),
      type: safeText(x.type),
      website: safeText(x.website),
      address: safeText(x.address),
      lat,
      lng,
      latNum,
      lngNum,
      visited: toBool(x.visited),
      notes: safeText(x.notes),
      raw: x
    };
    })
    .filter((x) => x.name);
}
