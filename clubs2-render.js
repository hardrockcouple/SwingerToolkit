function safeText(v) {
  return String(v ?? "").trim();
}

export function buildCard(item, onOpenModal) {
  const card = document.createElement("article");
  card.className = "card";

  // VISITED stamp
  if (item.visited) {
    const stamp = document.createElement("div");
    stamp.className = "visited-stamp";
    stamp.innerHTML = `<span>Visited<br>✓</span>`;
    card.appendChild(stamp);
  }

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = item.name || "(no name)";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <div>${item.country || ""}</div>
    <div>${item.city || ""}</div>
    ${item.type ? `<div>${item.type}</div>` : ""}
  `;

  card.appendChild(name);
  card.appendChild(meta);

  card.addEventListener("click", () => onOpenModal(item));
  return card;
}

export function renderModal(modalBody, item) {
  modalBody.innerHTML = `
    <h2 style="margin:0 0 10px 0;">${safeText(item.name)}</h2>
    <div style="color:#cfcfcf;line-height:1.6;">
      ${item.country ? `<div><b>Country:</b> ${safeText(item.country)}</div>` : ""}
      ${item.city ? `<div><b>City:</b> ${safeText(item.city)}</div>` : ""}
      ${item.type ? `<div><b>Type:</b> ${safeText(item.type)}</div>` : ""}
      ${item.visited ? `<div><b>Visited:</b> Yes</div>` : ""}
      ${item.website ? `<div><b>Website:</b> <a href="${safeText(item.website)}" target="_blank" rel="noreferrer">${safeText(item.website)}</a></div>` : ""}
      ${item.address ? `<div style="margin-top:10px;"><b>Address:</b><br>${safeText(item.address).replace(/\n/g, "<br>")}</div>` : ""}
      ${(item.lat && item.lng) ? `<div style="margin-top:10px;"><b>Coords:</b> ${item.lat}, ${item.lng}</div>` : ""}
      ${item.notes ? `<div style="margin-top:10px;"><b>Notes:</b><br>${safeText(item.notes).replace(/\n/g, "<br>")}</div>` : ""}
    </div>
  `;
}
