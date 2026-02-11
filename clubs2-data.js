function safeText(v) {
  return String(v ?? "").trim();
}

function parseYesNo(v) {
  const s = safeText(v).toLowerCase();
  return s === "yes" || s === "y" || s === "sim" || s === "s" || s === "true" || s === "1";
}

export async function loadClubsJson() {
  if (!window.CONFIG?.DATA_SOURCE) {
    throw new Error("CONFIG.DATA_SOURCE missing");
  }

  const res = await fetch(CONFIG.DATA_SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error(`JSON fetch failed: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("clubs.json must be an array");

  return data
    .map((x) => ({
      id: safeText(x.id),
      name: safeText(x.name),
      country: safeText(x.country),
      city: safeText(x.city),
      type: safeText(x.type),
      website: safeText(x.website),
      address: safeText(x.address),
      lat: x.lat ?? "",
      lng: x.lng ?? x.lon ?? "",
      notes: safeText(x.notes ?? x["Obs Gerais"] ?? ""),
      // ✅ aqui está a correção
      visited: parseYesNo(x.visited)
    }))
    .filter((x) => x.name);
}

export function uniqueSorted(list) {
  return Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
