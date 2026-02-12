import { loadClubs } from "./clubs2-data.js";
import { buildCard, renderPanel } from "./clubs2-render.js";

let allItems = [];
let filtered = [];

let map;
let markerLayer;

function $(id) {
  return document.getElementById(id);
}

function normalize(s) {
  return String(s ?? "").toLowerCase().trim();
}

function uniqSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function applyFilters() {
  const q = normalize($("q").value);
  const country = normalize($("country").value);
  const city = normalize($("city").value);

  filtered = allItems.filter((it) => {
    if (q && !normalize(it.name).includes(q)) return false;
    if (country && normalize(it.country) !== country) return false;
    if (city && normalize(it.city) !== city) return false;
    return true;
  });

  $("count").textContent = `${filtered.length} results`;
  renderGrid();
  renderMapMarkers();
}

function fillSelect(select, values, placeholder) {
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  select.appendChild(opt0);
  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  }
}

function updateSelects() {
  const countries = uniqSorted(allItems.map((it) => it.country));
  fillSelect($("country"), countries, "Country");

  const c = normalize($("country").value);
  const cities = uniqSorted(
    allItems
      .filter((it) => (!c ? true : normalize(it.country) === c))
      .map((it) => it.city)
  );
  fillSelect($("city"), cities, "City");
}

function openPanel(item) {
  const panel = $("panel");
  const body = $("panelBody");
  renderPanel(body, item);
  panel.classList.add("open");
  $("overlay").classList.add("open");
}

function closePanel() {
  $("panel").classList.remove("open");
  $("overlay").classList.remove("open");
}

function setMode(mode) {
  // close any open panel when switching modes
  closePanel();

  $("btnGrid").classList.toggle("active", mode === "grid");
  $("btnMap").classList.toggle("active", mode === "map");

  $("gridView").classList.toggle("hidden", mode !== "grid");
  $("mapView").classList.toggle("hidden", mode !== "map");

  if (mode === "map") {
    ensureMap();
    // Leaflet needs a tick after unhide
    requestAnimationFrame(() => {
      map.invalidateSize();
      renderMapMarkers();
    });
  }
}

function renderGrid() {
  const grid = $("gridView");
  grid.innerHTML = "";

  for (const it of filtered) {
    grid.appendChild(buildCard(it, openPanel));
  }
}

function ensureMap() {
  if (map) return;

  const el = $("mapCanvas");
  map = L.map(el, { zoomControl: true }).setView([40.0, -3.5], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

function renderMapMarkers() {
  if (!map || !markerLayer) return;

  markerLayer.clearLayers();

  const points = filtered
    .filter((it) => typeof it.lat === "number" && typeof it.lng === "number")
    .map((it) => ({ it, ll: [it.lat, it.lng] }));

  if (!points.length) return;

  const bounds = L.latLngBounds(points.map((p) => p.ll));

  for (const p of points) {
    const m = L.marker(p.ll);
    m.on("click", () => openPanel(p.it));
    m.bindPopup(`<b>${p.it.name}</b><br>${p.it.city || ""} ${p.it.country || ""}`);
    m.addTo(markerLayer);
  }

  map.fitBounds(bounds.pad(0.15));
}

export async function initClubs2() {
  // Wire UI
  $("btnGrid").addEventListener("click", () => setMode("grid"));
  $("btnMap").addEventListener("click", () => setMode("map"));
  $("btnClear").addEventListener("click", () => {
    $("q").value = "";
    $("country").value = "";
    $("city").value = "";
    updateSelects();
    applyFilters();
  });

  $("q").addEventListener("input", applyFilters);
  $("country").addEventListener("change", () => {
    updateSelects();
    applyFilters();
  });
  $("city").addEventListener("change", applyFilters);

  $("panelClose").addEventListener("click", closePanel);
  $("overlay").addEventListener("click", closePanel);

  // Load data
  allItems = await loadClubs();
  filtered = [...allItems];

  updateSelects();
  applyFilters();
  setMode("grid");
}
