function safe(v) {
  return String(v ?? "").trim();
}

function mapsLink(item) {
  if (item.lat && item.lng) {
    return `https://www.google.com/maps?q=${encodeURIComponent(item.lat + "," + item.lng)}`;
  }
  const q = [item.name, item.city, item.country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* ---------- CARD (GRID) ---------- */
export function buildCard(item, onOpen) {
  const card = document.createElement("article");
  card.className = "card";

  if (item.visited) {
    const stamp = document.createElement("div");
    stamp.className = "visited-stamp";
    stamp.innerHTML = `<span>VISITED</span>`;
    card.appendChild(stamp);
  }

  card.innerHTML += `
    <div class="name">${safe(item.name)}</div>
    <div class="meta">
      ${safe(item.country)}<br>
      ${safe(item.city)}
    </div>
  `;

  card.addEventListener("click", () => onOpen(item));
  return card;
}

/* ---------- ROW (LIST) ---------- */
export function buildRow(item, onOpen) {
  const row = document.createElement("div");
  row.className = "listRow";

  row.innerHTML = `
    <div class="rowName">${safe(item.name)}</div>
    <div class="rowMeta">${safe(item.country)}</div>
    <div class="rowMeta">${safe(item.city)}</div>
  `;

  row.addEventListener("click", () => onOpen(item));
  return row;
}

/* ---------- DRAWER ---------- */
export function renderDrawer(drawerBody, item) {
  drawerBody.innerHTML = `
    <h2>${safe(item.name)}</h2>
    <div class="drawerMeta">
      ${item.country ? `<div><b>Country:</b> ${safe(item.country)}</div>` : ""}
      ${item.city ? `<div><b>City:</b> ${safe(item.city)}</div>` : ""}
      ${item.website ? `<div><b>Website:</b> <a href="${item.website}" target="_blank">Visit</a></div>` : ""}
      <div><b>Map:</b> <a href="${mapsLink(item)}" target="_blank">Open in Google Maps</a></div>
      ${item.notes ? `<div style="margin-top:12px;"><b>Notes:</b><br>${safe(item.notes)}</div>` : ""}
    </div>
  `;
}
