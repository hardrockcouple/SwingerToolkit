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
    ${item.country ? `<div>${item.country}</div>` : ""}
    ${item.city ? `<div>${item.city}</div>` : ""}
    ${item.type ? `<div>${item.type}</div>` : ""}
  `;

  card.appendChild(name);
  card.appendChild(meta);

  card.addEventListener("click", () => onOpen(item));
  return card;
}

export function buildRow(item, onOpen) {
  const row = document.createElement("div");
  row.className = "listRow";

  const left = document.createElement("div");
  left.className = "rowNameWrap";

  if (item.visited) {
    const badge = document.createElement("span");
    badge.className = "visited-badge";
    badge.textContent = "VISITED";
    left.appendChild(badge);
  }

  const name = document.createElement("div");
  name.className = "rowName";
  name.textContent = item.name || "(no name)";
  left.appendChild(name);

  const c1 = document.createElement("div");
  c1.className = "rowMeta";
  c1.textContent = item.country || "";

  const c2 = document.createElement("div");
  c2.className = "rowMeta";
  c2.textContent = item.city || "";

  const link = document.createElement("div");
  link.className = "rowLink";
  if (item.website) {
    link.innerHTML = `<a href="${item.website}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Website</a>`;
  } else {
    link.innerHTML = `<a href="${mapsLink(item)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Map</a>`;
  }

  row.appendChild(left);
  row.appendChild(c1);
  row.appendChild(c2);
  row.appendChild(link);

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
