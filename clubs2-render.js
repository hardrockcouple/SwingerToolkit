// clubs2-render.js
function safeText(v) {
  return String(v ?? "").trim();
}

function mapsLink(item) {
  if (item.lat && item.lng) {
    return `https://www.google.com/maps?q=${encodeURIComponent(item.lat + "," + item.lng)}`;
  }
  const q = [item.name, item.address, item.city, item.country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function buildCard(item, onOpen) {
  const card = document.createElement("article");
  card.className = "card";

  // ✅ Glam stamp só no grid/card
  if (item.visited) {
    const stamp = document.createElement("div");
    stamp.className = "visited-stamp";
    stamp.innerHTML = `<span>VISITED</span>`;
    card.appendChild(stamp);
  }

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = item.name || "(no name)";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    ${item.country ? `<div>${safeText(item.country)}</div>` : ""}
    ${item.city ? `<div>${safeText(item.city)}</div>` : ""}
    ${item.type ? `<div>${safeText(item.type)}</div>` : ""}
  `;

  card.appendChild(name);
  card.appendChild(meta);

  card.addEventListener("click", () => onOpen(item));
  return card;
}

export function buildRow(item, onOpen) {
  const row = document.createElement("div");
  row.className = "listRow";

  // Nome + badge pequeno (não absoluto)
  const nameWrap = document.createElement("div");
  nameWrap.className = "rowNameWrap";

  const name = document.createElement("div");
  name.className = "rowName";
  name.textContent = item.name || "";

  nameWrap.appendChild(name);

  // ✅ Badge discreto na list
  if (item.visited) {
    const badge = document.createElement("span");
    badge.className = "visited-badge";
    badge.textContent = "VISITED";
    nameWrap.appendChild(badge);
  }

  const c1 = document.createElement("div");
  c1.className = "rowMeta";
  c1.textContent = item.country || "";

  const c2 = document.createElement("div");
  c2.className = "rowMeta";
  c2.textContent = item.city || "";

  const link = document.createElement("div");
  link.className = "rowLink";

  const href = item.website ? item.website : mapsLink(item);
  const label = item.website ? "Website" : "Map";

  link.innerHTML = `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`;

  row.appendChild(nameWrap);
  row.appendChild(c1);
  row.appendChild(c2);
  row.appendChild(link);

  // ✅ Clicar no link NÃO abre modal
  row.querySelector("a")?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // ✅ Clicar no resto abre modal
  row.addEventListener("click", () => onOpen(item));

  return row;
}

export function renderModal(modalBody, item) {
  const gmaps = mapsLink(item);

  modalBody.innerHTML = `
    <h2 style="margin:0 0 10px 0;">${safeText(item.name)}</h2>
    <div style="color:#cfcfcf;line-height:1.6;">
      ${item.country ? `<div><b>Country:</b> ${safeText(item.country)}</div>` : ""}
      ${item.city ? `<div><b>City:</b> ${safeText(item.city)}</div>` : ""}
      ${item.type ? `<div><b>Type:</b> ${safeText(item.type)}</div>` : ""}
      ${item.visited ? `<div><b>Visited:</b> yes</div>` : ""}
      ${item.website ? `<div><b>Website:</b> <a href="${item.website}" target="_blank" rel="noreferrer">${item.website}</a></div>` : ""}
      ${(item.lat && item.lng) ? `<div><b>Coords:</b> ${item.lat}, ${item.lng}</div>` : ""}
      ${item.address ? `<div><b>Address:</b> ${safeText(item.address).replace(/\n/g, "<br>")}</div>` : ""}
      <div style="margin-top:10px;"><b>Map:</b> <a href="${gmaps}" target="_blank" rel="noreferrer">Open in Google Maps</a></div>
      ${item.notes ? `<div style="margin-top:10px;"><b>Notes:</b><br>${safeText(item.notes).replace(/\n/g, "<br>")}</div>` : ""}
    </div>
  `;
}
