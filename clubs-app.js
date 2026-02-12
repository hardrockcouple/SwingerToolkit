import { initLogo } from "./ui-common.js";

/* =========================
   Helpers
========================= */
function $(id) {
  return document.getElementById(id);
}

function safe(v) {
  return String(v ?? "").trim();
}

function yes(v) {
  const t = safe(v).toLowerCase();
  return t === "x" || t === "yes" || t === "true" || t === "1";
}

/* =========================
   State
========================= */
let ALL = [];
let FILTERED = [];
let PAGE = 1;
const PAGE_SIZE = 12;

/* =========================
   CSV Parser
========================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some(x => safe(x) !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  row.push(field);
  if (row.some(x => safe(x) !== "")) rows.push(row);

  return rows;
}

/* =========================
   Data Load
========================= */
async function loadData() {
  const res = await fetch(CONFIG.DATA_SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed loading CSV");

  const text = await res.text();
  const table = parseCSV(text);
  if (!table.length) return [];

  const headers = table[0].map(h => safe(h).toLowerCase());
  const rows = table.slice(1);

  const idxName = headers.indexOf("name");
  const idxCountry = headers.indexOf("country");
  const idxCity = headers.indexOf("city");
  const idxVisited = headers.indexOf("visitado");

  const items = [];

  for (const r of rows) {
    const item = {
      name: idxName >= 0 ? safe(r[idxName]) : "",
      country: idxCountry >= 0 ? safe(r[idxCountry]) : "",
      city: idxCity >= 0 ? safe(r[idxCity]) : "",
      visited: idxVisited >= 0 ? safe(r[idxVisited]) : ""
    };

    if (!item.name) continue;
    items.push(item);
  }

  return items;
}

/* =========================
   Cards
========================= */
function buildCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = item.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <div>${item.country}</div>
    <div>${item.city}</div>
  `;

  card.appendChild(name);
  card.appendChild(meta);

  // VISITED STAMP
  if (yes(item.visited)) {
    const stamp = document.createElement("div");
    stamp.className = "visited-stamp";
    stamp.innerHTML = "<span>✓<br>VISITED</span>";
    card.appendChild(stamp);
  }

  card.addEventListener("click", () => openModal(item));
  return card;
}

/* =========================
   Render
========================= */
function render() {
  const container = $("cardsContainer");
  const pagination = $("pagination");

  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  PAGE = Math.min(PAGE, totalPages);

  const start = (PAGE - 1) * PAGE_SIZE;
  const slice = FILTERED.slice(start, start + PAGE_SIZE);

  container.innerHTML = "";
  slice.forEach(item => container.appendChild(buildCard(item)));

  renderPagination(totalPages);

  const count = $("resultsCount");
  if (count) count.textContent = `${total} / ${ALL.length}`;
}

/* =========================
   Pagination
========================= */
function renderPagination(totalPages) {
  const p = $("pagination");
  p.innerHTML = "";

  if (totalPages <= 1) return;

  const makeBtn = (label, page, active = false) => {
    const b = document.createElement("button");
    b.className = "pageBtn" + (active ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      PAGE = page;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return b;
  };

  for (let i = 1; i <= totalPages; i++) {
    p.appendChild(makeBtn(String(i), i, i === PAGE));
  }
}

/* =========================
   Filters
========================= */
function applyFilters() {
  const q = safe($("searchInput").value).toLowerCase();
  const country = safe($("countryFilter").value);
  const city = safe($("cityFilter").value);

  FILTERED = ALL.filter(c => {
    const okName = !q || safe(c.name).toLowerCase().includes(q);
    const okCountry = !country || c.country === country;
    const okCity = !city || c.city === city;
    return okName && okCountry && okCity;
  });

  PAGE = 1;
  render();
}

function buildFilters() {
  const countries = [...new Set(ALL.map(c => c.country).filter(Boolean))].sort();
  const countrySelect = $("countryFilter");

  countrySelect.innerHTML =
    `<option value="">Country</option>` +
    countries.map(c => `<option value="${c}">${c}</option>`).join("");

  countrySelect.addEventListener("change", () => {
    const selected = countrySelect.value;

    const cities = [...new Set(
      ALL.filter(c => !selected || c.country === selected)
         .map(c => c.city)
         .filter(Boolean)
    )].sort();

    const citySelect = $("cityFilter");
    citySelect.innerHTML =
      `<option value="">City</option>` +
      cities.map(c => `<option value="${c}">${c}</option>`).join("");

    citySelect.disabled = !selected;
    applyFilters();
  });

  $("cityFilter").addEventListener("change", applyFilters);
  $("searchInput").addEventListener("input", applyFilters);
  $("clearFilters").addEventListener("click", () => {
    $("searchInput").value = "";
    $("countryFilter").value = "";
    $("cityFilter").value = "";
    $("cityFilter").disabled = true;
    applyFilters();
  });
}

/* =========================
   Modal
========================= */
function openModal(item) {
  const modal = $("modal");
  const body = $("modalBody");

  body.innerHTML = `
    <h2>${item.name}</h2>
    <div>${item.country} — ${item.city}</div>
  `;

  modal.classList.remove("hidden");
}

function initModal() {
  $("closeModal").addEventListener("click", () => {
    $("modal").classList.add("hidden");
  });

  $("modal").addEventListener("click", e => {
    if (e.target.id === "modal") {
      $("modal").classList.add("hidden");
    }
  });
}

/* =========================
   Init
========================= */
async function init() {
  initLogo();

  ALL = await loadData();
  FILTERED = [...ALL];

  buildFilters();
  initModal();
  render();
}

document.addEventListener("DOMContentLoaded", init);
