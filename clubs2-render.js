// clubs2-render.js
// Render Grid/List + Sidebar content

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtPrice(pricing) {
  const min = pricing?.couples?.min;
  const max = pricing?.couples?.max;
  const cur = pricing?.currency || "EUR";

  if (min == null && max == null) return "";
  if (min != null && max != null && min !== max) return `${min}–${max} ${cur}`;
  return `${min ?? max} ${cur}`;
}

function featureList(features) {
  if (!features) return [];
  const map = [
    ["sauna", "Sauna"],
    ["pool", "Pool"],
    ["darkroom", "Darkroom"],
    ["privateRooms", "Private rooms"],
    ["lockers", "Lockers"],
    ["bar", "Bar"],
    ["outdoor", "Outdoor"],
    ["dancefloor", "Dancefloor"]
  ];
  return map.filter(([k]) => !!features[k]).map(([, label]) => label);
}

export function createClubCard(club, { mode = "grid", onOpen } = {}) {
  const card = document.createElement("article");
  card.className = "card" + (mode === "list" ? " compact" : "");
  card.tabIndex = 0;

  if (mode === "list") {
    const row = document.createElement("div");
    row.className = "cardRow";

    const left = document.createElement("div");
    left.className = "cardLeft";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = club.name || "(no name)";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div>${esc(club.country)}</div>
      <div>${esc(club.city)}</div>
    `;

    left.appendChild(name);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "badges";

    if (club.visited) {
      const b = document.createElement("div");
      b.className = "badge visited";
      b.textContent = "✓ VISITED";
      right.appendChild(b);
    }

    if (club.pricing?.range) {
      const b = document.createElement("div");
      b.className = "badge";
      b.textContent = String(club.pricing.range).toUpperCase();
      right.appendChild(b);
    }

    row.appendChild(left);
    row.appendChild(right);
    card.appendChild(row);
  } else {
    const title = document.createElement("div");
    title.className = "name";
    title.textContent = club.name || "(no name)";
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div>${esc(club.country)}</div>
      <div>${esc(club.city)}</div>
    `;
    card.appendChild(meta);

    // Stamp VISITED (usa o teu CSS já existente)
    if (club.visited) {
      const stamp = document.createElement("div");
      stamp.className = "visited-stamp";
      stamp.innerHTML = `<span>✓<br>VISITED</span>`;
      card.appendChild(stamp);
    }
  }

  const open = () => onOpen && onOpen(club);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  return card;
}

export function renderCards(containerEl, clubs, { mode = "grid", onOpen } = {}) {
  containerEl.innerHTML = "";
  if (mode === "list") containerEl.classList.add("listMode");
  else containerEl.classList.remove("listMode");

  const frag = document.createDocumentFragment();
  for (const c of clubs) frag.appendChild(createClubCard(c, { mode, onOpen }));
  containerEl.appendChild(frag);
}

export function renderSidebar(club, els) {
  const { sidebarTitleEl, sidebarSubEl, sidebarBodyEl } = els;

  sidebarTitleEl.textContent = club.name || "";
  sidebarSubEl.textContent = [club.city, club.country].filter(Boolean).join(" · ");

  const price = fmtPrice(club.pricing);
  const feats = featureList(club.features);

  sidebarBodyEl.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
      ${club.visited ? `<span class="badge visited">✓ VISITED</span>` : ``}
      ${club.type?.length ? `<span class="badge">${esc(club.type.join(" / "))}</span>` : ``}
      ${club.pricing?.range ? `<span class="badge">${esc(String(club.pricing.range).toUpperCase())}</span>` : ``}
      ${club.rating ? `<span class="badge">${"★".repeat(Number(club.rating) || 0)}</span>` : ``}
      ${club.interest ? `<span class="badge">Interest: ${esc(club.interest)}</span>` : ``}
    </div>

    ${club.website ? `<div><b>Website:</b> <a href="${esc(club.website)}" target="_blank" rel="noreferrer">${esc(club.website)}</a></div>` : ``}
    ${club.address ? `<div style="margin-top:8px;"><b>Address:</b><br><span style="white-space:pre-line;">${esc(club.address)}</span></div>` : ``}
    ${club.email ? `<div style="margin-top:8px;"><b>Email:</b> ${esc(club.email)}</div>` : ``}
    ${club.phone ? `<div style="margin-top:8px;"><b>Phone:</b> ${esc(club.phone)}</div>` : ``}

    ${price ? `<div style="margin-top:10px;"><b>Couples:</b> ${esc(price)}</div>` : ``}
    ${club.pricing?.model ? `<div><b>Pricing model:</b> ${esc(club.pricing.model)}</div>` : ``}
    ${club.pricing?.notes ? `<div style="margin-top:8px;"><b>Pricing notes:</b><br>${esc(club.pricing.notes)}</div>` : ``}

    ${feats.length ? `<div style="margin-top:12px;"><b>Features:</b><br>${esc(feats.join(" · "))}</div>` : ``}

    ${club.notes ? `<div style="margin-top:12px;"><b>Notes:</b><br>${esc(club.notes)}</div>` : ``}
  `;
}
