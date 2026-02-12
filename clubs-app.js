// clubs-app.js (Grid + Map only, no clubs2)
// Data source: window.CONFIG.DATA_SOURCE (default ./clubs.json)

function safeText(v){ return String(v ?? "").trim(); }

function mapsLink(item){
  if (item.lat && item.lng){
    return `https://www.google.com/maps?q=${encodeURIComponent(item.lat + "," + item.lng)}`;
  }
  const q = [item.name, item.address, item.city, item.country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

const els = {
  toolbar: document.getElementById("clubsToolbar"),
  q: document.getElementById("q"),
  country: document.getElementById("country"),
  city: document.getElementById("city"),
  btnGrid: document.getElementById("btnGrid"),
  btnMap: document.getElementById("btnMap"),
  btnClear: document.getElementById("btnClear"),
  count: document.getElementById("count"),
  gridWrap: document.getElementById("gridWrap"),
  grid: document.getElementById("grid"),
  mapWrap: document.getElementById("mapWrap"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawer: document.getElementById("drawer"),
  drawerClose: document.getElementById("drawerClose"),
  drawerTitle: document.getElementById("drawerTitle"),
  drawerBody: document.getElementById("drawerBody"),
};

let all = [];
let filtered = [];
let mode = "grid";

let map = null;
let markersLayer = null;

function uniqSorted(arr){
  return [...new Set(arr.filter(Boolean).map(safeText).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

function setToolbarTop(){
  // keep sticky toolbar below the site header
  const header = document.querySelector(".siteHeader");
  const h = header ? header.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty("--toolbar-top", `${Math.round(h)}px`);
}

function openDrawer(item){
  els.drawerTitle.textContent = safeText(item.name) || "Club";
  const gmaps = mapsLink(item);

  els.drawerBody.innerHTML = `
    <div class="kv">
      ${item.country ? `<div><b>Country:</b> ${safeText(item.country)}</div>` : ""}
      ${item.city ? `<div><b>City:</b> ${safeText(item.city)}</div>` : ""}
      ${item.type ? `<div><b>Type:</b> ${safeText(item.type)}</div>` : ""}
      ${item.visited ? `<div><b>Visited:</b> yes</div>` : ""}
      ${item.website ? `<div><b>Website:</b> <a href="${item.website}" target="_blank" rel="noreferrer">Visit</a></div>` : ""}
      ${item.address ? `<div><b>Address:</b> ${safeText(item.address).replace(/\n/g,"<br>")}</div>` : ""}
      <div style="margin-top:10px;"><b>Map:</b> <a href="${gmaps}" target="_blank" rel="noreferrer">Open in Google Maps</a></div>
      ${item.notes ? `<div style="margin-top:10px;"><b>Notes:</b><br>${safeText(item.notes).replace(/\n/g,"<br>")}</div>` : ""}
    </div>
  `;

  els.drawerBackdrop.classList.add("open");
  els.drawer.classList.add("open");
}

function closeDrawer(){
  els.drawerBackdrop.classList.remove("open");
  els.drawer.classList.remove("open");
}

function buildCard(item){
  const card = document.createElement("article");
  card.className = "clubCard";
  const h = document.createElement("h3");
  h.textContent = item.name || "(no name)";

  const lines = document.createElement("div");
  lines.className = "lines";
  const parts = [item.country, item.city, item.type].filter(Boolean).map(safeText);
  lines.innerHTML = parts.map(p=>`<div>${p}</div>`).join("");

  card.appendChild(h);
  card.appendChild(lines);

  if (item.visited){
    const stamp = document.createElement("div");
    stamp.className = "visitedStamp";
    stamp.innerHTML = "<span>VISITED</span>";
    card.appendChild(stamp);
  }

  card.addEventListener("click", ()=> openDrawer(item));
  return card;
}

function applyFilters(){
  const q = safeText(els.q.value).toLowerCase();
  const ctry = safeText(els.country.value);
  const city = safeText(els.city.value);

  filtered = all.filter(it=>{
    if (ctry && safeText(it.country) !== ctry) return false;
    if (city && safeText(it.city) !== city) return false;
    if (q){
      const hay = `${it.name||""} ${it.country||""} ${it.city||""} ${it.type||""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  els.count.textContent = `${filtered.length} results`;

  // city dropdown depends on country
  const cityOptions = uniqSorted(all.filter(it => !ctry || safeText(it.country) === ctry).map(it=>it.city));
  els.city.innerHTML = `<option value="">City</option>` + cityOptions.map(v=>`<option value="${v}">${v}</option>`).join("");
  els.city.disabled = cityOptions.length === 0;

  if (city && !cityOptions.includes(city)){
    els.city.value = "";
  }

  render();
}

function renderGrid(){
  els.grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const item of filtered){
    frag.appendChild(buildCard(item));
  }
  els.grid.appendChild(frag);
}

function ensureMap(){
  if (map) return;

  map = L.map("clubsMap", { scrollWheelZoom: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function renderMap(){
  ensureMap();
  markersLayer.clearLayers();

  const pts = [];
  for (const item of filtered){
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    pts.push([lat,lng]);
    const m = L.marker([lat,lng]).addTo(markersLayer);
    m.bindTooltip(safeText(item.name) || "Club", { direction: "top" });
    m.on("click", ()=> openDrawer(item));
  }

  if (pts.length){
    const b = L.latLngBounds(pts);
    map.fitBounds(b.pad(0.2));
  }else{
    map.setView([48.5, 6.0], 4);
  }

  // Leaflet needs an invalidate after container becomes visible
  setTimeout(()=> map.invalidateSize(), 50);
}

function setMode(next){
  if (mode === next) return;
  mode = next;

  // close drawer when changing modes
  closeDrawer();

  els.btnGrid.classList.toggle("active", mode === "grid");
  els.btnMap.classList.toggle("active", mode === "map");

  els.gridWrap.hidden = mode !== "grid";
  els.mapWrap.hidden = mode !== "map";

  render();
}

function render(){
  if (mode === "grid") renderGrid();
  if (mode === "map") renderMap();
}

async function load(){
  setToolbarTop();
  window.addEventListener("resize", setToolbarTop);

  els.drawerBackdrop.addEventListener("click", closeDrawer);
  els.drawerClose.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e)=>{ if (e.key === "Escape") closeDrawer(); });

  els.btnGrid.addEventListener("click", ()=> setMode("grid"));
  els.btnMap.addEventListener("click", ()=> setMode("map"));

  els.btnClear.addEventListener("click", ()=>{
    els.q.value = "";
    els.country.value = "";
    els.city.value = "";
    applyFilters();
    closeDrawer();
  });

  els.q.addEventListener("input", ()=> applyFilters());
  els.country.addEventListener("change", ()=> applyFilters());
  els.city.addEventListener("change", ()=> applyFilters());

  const src = (window.CONFIG && window.CONFIG.DATA_SOURCE) ? window.CONFIG.DATA_SOURCE : "./clubs.json";
  const res = await fetch(src, { cache: "no-store" });
  const data = await res.json();

  // normalize
  all = (Array.isArray(data) ? data : []).map(it=>({
    ...it,
    name: safeText(it.name),
    country: safeText(it.country),
    city: safeText(it.city),
    type: safeText(it.type),
    website: safeText(it.website),
    address: safeText(it.address),
    notes: safeText(it.notes),
    visited: !!it.visited,
    lat: it.lat,
    lng: it.lng,
  }));

  // countries
  const countries = uniqSorted(all.map(it=>it.country));
  els.country.innerHTML = `<option value="">Country</option>` + countries.map(v=>`<option value="${v}">${v}</option>`).join("");

  applyFilters();
}

load().catch(err=>{
  console.error(err);
  els.count.textContent = "Failed to load data";
});
