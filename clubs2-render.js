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
    ${item.country ? `<div>${safeText(item.country)}</div>` : ""}
    ${item.city ? `<div>${safeText(item.city)}</div>` : ""}
    ${item.type ? `<div>${safeText(item.type)}</div>` : ""}
  `;

  card.appendChild(name);
  card.appendChild(meta);

  card.addEventListener("click", () => onOpen(item));
  return card;
}

export function renderPanel(panelBody, item) {
  const gmaps = mapsLink(item);

  panelBody.innerHTML = `
    <h2 style="margin:0 0 10px 0; font-size:26px;">${safeText(item.name)}</h2>
    <div style="color:#cfcfcf;line-height:1.6;">
      ${item.country ? `<div><b>Country:</b> ${safeText(item.country)}</div>` : ""}
      ${item.city ? `<div><b>City:</b> ${safeText(item.city)}</div>` : ""}
      ${item.type ? `<div><b>Type:</b> ${safeText(item.type)}</div>` : ""}
      ${item.visited ? `<div><b>Visited:</b> yes</div>` : ""}
      ${item.website ? `<div><b>Website:</b> <a href="${item.website}" target="_blank" rel="noreferrer">Visit</a></div>` : ""}
      <div><b>Map:</b> <a href="${gmaps}" target="_blank" rel="noreferrer">Open in Google Maps</a></div>
      ${item.address ? `<div style="margin-top:10px;"><b>Address:</b><br>${safeText(item.address).replace(/\n/g, "<br>")}</div>` : ""}
      ${item.notes ? `<div style="margin-top:10px;"><b>Notes:</b><br>${safeText(item.notes).replace(/\n/g, "<br>")}</div>` : ""}
    </div>
  `;
}

export { mapsLink };
