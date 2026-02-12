/* Clubs (Grid + Map) */

let CLUBS = [];
let mode = 'grid';

let map = null;
let markersLayer = null;

const el = {
  search: null,
  country: null,
  city: null,
  gridBtn: null,
  mapBtn: null,
  clearBtn: null,
  count: null,
  grid: null,
  mapWrap: null,
  mapCanvas: null,
  overlay: null,
  drawer: null,
  drawerTitle: null,
  drawerBody: null,
  drawerClose: null,
};

function norm(s){
  return String(s || '').trim();
}

function toNumber(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getFiltered(){
  const q = norm(el.search.value).toLowerCase();
  const country = el.country.value;
  const city = el.city.value;

  return CLUBS.filter(c => {
    const name = norm(c.name).toLowerCase();
    const okQ = !q || name.includes(q);
    const okCountry = !country || country === '__ALL__' || c.country === country;
    const okCity = !city || city === '__ALL__' || c.city === city;
    return okQ && okCountry && okCity;
  });
}

function setCount(n){
  el.count.textContent = `${n} results`;
}

function buildSelect(selectEl, values, placeholder){
  const current = selectEl.value;
  selectEl.innerHTML = '';

  const opt0 = document.createElement('option');
  opt0.value = '__ALL__';
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });

  // restore if still present
  const exists = [...selectEl.options].some(o => o.value === current);
  if (exists) selectEl.value = current;
  if (!exists) selectEl.value = '__ALL__';
}

function updateCityOptions(){
  const country = el.country.value;
  let cities = CLUBS.map(c => c.city).filter(Boolean);
  if (country && country !== '__ALL__'){
    cities = CLUBS.filter(c => c.country === country).map(c => c.city).filter(Boolean);
  }
  cities = [...new Set(cities)].sort((a,b)=>a.localeCompare(b));
  buildSelect(el.city, cities, 'City');
}

function renderGrid(items){
  el.grid.innerHTML = '';

  items.forEach(c => {
    const card = document.createElement('div');
    card.className = 'club-card';

    const name = document.createElement('h3');
    name.className = 'club-card__name';
    name.textContent = norm(c.name) || '(no name)';

    const meta = document.createElement('div');
    meta.className = 'club-card__meta';
    meta.innerHTML = `
      <div>${norm(c.country) || ''}</div>
      <div>${norm(c.city) || ''}</div>
      <div>${norm(c.type) || ''}</div>
    `;

    card.appendChild(name);
    card.appendChild(meta);

    if (String(c.visited).toLowerCase() === 'yes'){
      const stamp = document.createElement('div');
      stamp.className = 'visited-stamp';
      stamp.textContent = 'Visited';
      card.appendChild(stamp);
    }

    card.addEventListener('click', () => openDrawer(c));
    el.grid.appendChild(card);
  });
}

function drawerRow(key, valueHtml){
  const row = document.createElement('div');
  row.className = 'drawer__row';
  const k = document.createElement('div');
  k.className = 'drawer__key';
  k.textContent = key;
  const v = document.createElement('div');
  v.className = 'drawer__val';
  v.innerHTML = valueHtml;
  row.appendChild(k);
  row.appendChild(v);
  return row;
}

function openDrawer(c){
  el.overlay.hidden = false;
  el.drawer.classList.add('is-open');

  el.drawerTitle.textContent = norm(c.name) || 'Club';

  const kv = document.createElement('div');
  kv.className = 'drawer__kv';

  kv.appendChild(drawerRow('Country', norm(c.country) || '-'));
  kv.appendChild(drawerRow('City', norm(c.city) || '-'));
  kv.appendChild(drawerRow('Type', norm(c.type) || '-'));
  kv.appendChild(drawerRow('Visited', norm(c.visited) || '-'));

  if (norm(c.website)){
    kv.appendChild(drawerRow('Website', `<a href="${c.website}" target="_blank" rel="noopener">Visit</a>`));
  }

  if (norm(c.address)){
    kv.appendChild(drawerRow('Address', `${c.address}`));
  }

  const lat = toNumber(c.lat);
  const lng = toNumber(c.lng);
  if (lat !== null && lng !== null){
    const link = `https://www.google.com/maps?q=${lat},${lng}`;
    kv.appendChild(drawerRow('Map', `<a href="${link}" target="_blank" rel="noopener">Open in Google Maps</a>`));
  }

  el.drawerBody.innerHTML = '';
  el.drawerBody.appendChild(kv);
}

function closeDrawer(){
  el.drawer.classList.remove('is-open');
  el.overlay.hidden = true;
}

function setMode(nextMode){
  mode = nextMode;
  closeDrawer();

  const isGrid = mode === 'grid';
  el.gridBtn.classList.toggle('is-active', isGrid);
  el.mapBtn.classList.toggle('is-active', !isGrid);

  el.grid.hidden = !isGrid;
  el.mapWrap.hidden = isGrid;

  if (!isGrid){
    ensureMap();
    updateMap();
    // Leaflet needs a resize kick after becoming visible
    setTimeout(() => map && map.invalidateSize(), 60);
  }
}

function ensureMap(){
  if (map) return;

  map = L.map(el.mapCanvas, {
    zoomControl: true,
    preferCanvas: true,
  });

  // Dark tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function updateMap(){
  if (!map || !markersLayer) return;

  markersLayer.clearLayers();
  const items = getFiltered();

  const pts = [];
  items.forEach(c => {
    const lat = toNumber(c.lat);
    const lng = toNumber(c.lng);
    if (lat === null || lng === null) return;

    const marker = L.marker([lat, lng]);
    const title = norm(c.name) || 'Club';
    const html = `<strong>${title}</strong><br>${norm(c.country)} / ${norm(c.city)}`;
    marker.bindPopup(html);
    marker.on('click', () => openDrawer(c));
    marker.addTo(markersLayer);
    pts.push([lat, lng]);
  });

  if (pts.length){
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds.pad(0.25), { animate: false });
  } else {
    map.setView([20, 0], 2);
  }
}

function rerender(){
  const items = getFiltered();
  setCount(items.length);
  renderGrid(items);
  if (mode === 'map') updateMap();
}

async function loadClubs(){
  const url = (window.CONFIG && window.CONFIG.CLUBS_JSON_PATH) ? window.CONFIG.CLUBS_JSON_PATH : './clubs.json';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load clubs.json (${res.status})`);
  const data = await res.json();

  CLUBS = (Array.isArray(data) ? data : []).map(c => ({
    name: c.name ?? c.club ?? c.title ?? '',
    country: norm(c.country),
    city: norm(c.city),
    type: norm(c.type),
    visited: norm(c.visited),
    website: norm(c.website),
    address: norm(c.address),
    lat: c.lat,
    lng: c.lng,
  }));
}

function initDom(){
  el.search = document.querySelector('#searchInput');
  el.country = document.querySelector('#countrySelect');
  el.city = document.querySelector('#citySelect');
  el.gridBtn = document.querySelector('#btnGrid');
  el.mapBtn = document.querySelector('#btnMap');
  el.clearBtn = document.querySelector('#btnClear');
  el.count = document.querySelector('#resultsCount');
  el.grid = document.querySelector('#clubsGrid');
  el.mapWrap = document.querySelector('#mapWrap');
  el.mapCanvas = document.querySelector('#map');

  el.overlay = document.querySelector('#drawerOverlay');
  el.drawer = document.querySelector('#clubDrawer');
  el.drawerTitle = document.querySelector('#drawerTitle');
  el.drawerBody = document.querySelector('#drawerBody');
  el.drawerClose = document.querySelector('#drawerClose');

  el.gridBtn.addEventListener('click', () => setMode('grid'));
  el.mapBtn.addEventListener('click', () => setMode('map'));

  el.clearBtn.addEventListener('click', () => {
    el.search.value = '';
    el.country.value = '__ALL__';
    updateCityOptions();
    el.city.value = '__ALL__';
    rerender();
  });

  el.search.addEventListener('input', rerender);
  el.country.addEventListener('change', () => {
    updateCityOptions();
    rerender();
  });
  el.city.addEventListener('change', rerender);

  el.overlay.addEventListener('click', closeDrawer);
  el.drawerClose.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

async function init(){
  initDom();

  const logo = document.getElementById('siteLogo');
  if (logo && window.CONFIG && window.CONFIG.LOGO_PATH) logo.src = window.CONFIG.LOGO_PATH;

  await loadClubs();

  const countries = [...new Set(CLUBS.map(c => c.country).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  buildSelect(el.country, countries, 'Country');
  updateCityOptions();

  setMode('grid');
  rerender();
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error(err);
    const msg = document.createElement('div');
    msg.style.padding = '18px';
    msg.style.color = '#fff';
    msg.textContent = 'Erro a carregar os clubs. Vê a consola.';
    document.querySelector('main')?.prepend(msg);
  });
});
