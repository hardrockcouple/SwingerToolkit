/* Clubs (Grid + Map) */

(function () {
  const $ = (id) => document.getElementById(id);

  // Mantém a altura dos filtros em CSS var para o layout (top padding / drawers)
  function updateFiltersVar() {
    const bar = document.querySelector('.clubs-toolbar');
    if (!bar) return;
    document.documentElement.style.setProperty('--filters-h', `${bar.offsetHeight}px`);
  }

  const els = {
    search: $('searchInput'),
    country: $('countrySelect'),
    city: $('citySelect'),
    btnGrid: $('btnGrid'),
    btnMap: $('btnMap'),
    btnClear: $('btnClear'),
    count: $('resultsCount'),
    gridView: $('gridView'),
    mapView: $('mapView'),
    mapEl: $('clubsMap'),
    overlay: $('modalOverlay'),
    modal: $('clubModal'),
    modalTitle: $('modalTitle'),
    modalBody: $('modalBody'),
    modalClose: $('modalClose'),
  };

  let allClubs = [];
  let filtered = [];

  let mode = 'grid';
  let map = null;
  let markersLayer = null;

  // calcula já e mantém actualizado
  updateFiltersVar();
  window.addEventListener('resize', () => requestAnimationFrame(updateFiltersVar));
  window.addEventListener('orientationchange', () => requestAnimationFrame(updateFiltersVar));

  function safeText(v) {
    return (v ?? '').toString().trim();
  }

  function normalizeClub(raw) {
    const name = safeText(raw.name || raw.club || raw.title);
    const country = safeText(raw.country);
    const city = safeText(raw.city || raw.town);
    const website = safeText(raw.website || raw.url);

    // geo may come in many shapes
    const lat = Number(raw.lat ?? raw.latitude ?? raw.Latitude ?? raw.LAT);
    const lng = Number(raw.lng ?? raw.lon ?? raw.long ?? raw.longitude ?? raw.Longitude ?? raw.LNG);

    if (!name) return null;

    return {
      ...raw,
      name: name,
      country: country || '',
      city: city || '',
      website: website || '',
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      visited: !!raw.visited,
    };
  }

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function setMode(nextMode) {
    mode = nextMode;
    closeModal();

    els.btnGrid.classList.toggle('active', mode === 'grid');
    els.btnMap.classList.toggle('active', mode === 'map');

    els.gridView.style.display = mode === 'grid' ? 'grid' : 'none';
    els.mapView.classList.toggle('active', mode === 'map');

    if (mode === 'map') {
      ensureMap();
      refreshMap();
      // Leaflet needs invalidateSize after display
      setTimeout(() => map && map.invalidateSize(), 50);
    }
  }

  function applyFilters() {
    const q = safeText(els.search.value).toLowerCase();
    const ctry = safeText(els.country.value);
    const city = safeText(els.city.value);

    filtered = allClubs.filter((c) => {
      if (ctry && c.country !== ctry) return false;
      if (city && c.city !== city) return false;
      if (q) {
        const hay = `${c.name} ${c.country} ${c.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    els.count.textContent = `${filtered.length} results`;

    renderGrid();
    if (mode === 'map') refreshMap();
  }

  function fillCountries() {
    const countries = uniqSorted(allClubs.map((c) => c.country));
    els.country.innerHTML = '<option value="">Country</option>' +
      countries.map((c) => `<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function fillCities() {
    const ctry = safeText(els.country.value);
    const cities = uniqSorted(allClubs.filter((c) => !ctry || c.country === ctry).map((c) => c.city));

    els.city.disabled = cities.length === 0;
    els.city.innerHTML = '<option value="">City</option>' +
      cities.map((c) => `<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function clearFilters() {
    els.search.value = '';
    els.country.value = '';
    els.city.value = '';
    fillCities();
    applyFilters();
  }

  function escapeHtml(s) {
    return safeText(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeHtmlAttr(s) {
    return escapeHtml(s).replaceAll('`', '&#096;');
  }

function formatOpeningHoursTable(c) {

  const days = [
    ['monday', 'Mon'],
    ['tuesday', 'Tue'],
    ['wednesday', 'Wed'],
    ['thursday', 'Thu'],
    ['friday', 'Fri'],
    ['saturday', 'Sat'],
    ['sunday', 'Sun']
  ];

  const rows = days.map(([key, label]) => {

    const raw = (c[`open_time_${key}`] || '').trim();

    const isClosed =
      !raw ||
      raw.toLowerCase() === 'closed';

    const display = isClosed ? 'Closed' : raw;

    return `
      <tr class="${isClosed ? 'closed' : 'open'}">
        <td class="day">${label}</td>
        <td class="time">${escapeHtml(display)}</td>
      </tr>
    `;

  }).join('');

  return `
    <table class="hours-table">
      ${rows}
    </table>
  `;
}

  function renderGrid() {
    els.gridView.innerHTML = '';

    const frag = document.createDocumentFragment();

    filtered.forEach((c) => {
      const card = document.createElement('article');
      card.className = 'club-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Abrir detalhes: ${c.name}`);

      const stamp = document.createElement('div');
      stamp.className = 'stamp' + (c.visited ? '' : ' is-hidden');
      stamp.textContent = 'VISITED';

      card.innerHTML = `
        <h3 class="club-name">${escapeHtml(c.name)}</h3>
        <div class="club-meta">
          <div>${escapeHtml(c.country || '')}</div>
          <div>${escapeHtml(c.city || '')}</div>
        </div>
      `;
      card.appendChild(stamp);

      card.addEventListener('click', () => openModal(c));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(c);
        }
      });

      frag.appendChild(card);
    });

    els.gridView.appendChild(frag);
  }

  function starsFromClassificacao(val) {
  // aceita "****" ou "4" ou "4/5"
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes('*')) return (s.match(/\*/g) || []).length;
  const n = parseInt(s, 10);
  if (Number.isFinite(n)) return Math.max(0, Math.min(5, n));
  return 0;
}

function prettyDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return String(url).replace(/^https?:\/\//, '').replace(/^www\./, '');
  }
}

function normalizeTel(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '').trim();
}

function formatOpeningHours(c) {
  const days = [
    ['monday', 'Mon'],
    ['tuesday', 'Tue'],
    ['wednesday', 'Wed'],
    ['thursday', 'Thu'],
    ['friday', 'Fri'],
    ['saturday', 'Sat'],
    ['sunday', 'Sun']
  ];

  const open = days
    .map(([key, label]) => ({ key, label, val: (c[`open_time_${key}`] || '').trim() }))
    .filter(x => x.val && x.val.toLowerCase() !== 'closed');

  if (!open.length) return '—';

  // se todos os dias abertos têm o mesmo horário, mostra "Tue–Sun 21:00–04:00"
  const allSame = open.every(x => x.val === open[0].val);
  if (allSame) {
    const first = open[0].label;
    const last = open[open.length - 1].label;
    return `${first}–${last} ${open[0].val}`;
  }

  // senão, lista curta por linhas
  return open.map(x => `${x.label}: ${escapeHtml(x.val)}`).join('<br>');
}

function euroRange(c) {
  const min = (c.price_couples_min || '').toString().trim();
  const max = (c.price_couples_max || '').toString().trim();
  const cur = (c.price_currency || 'EUR').toString().trim();

  const clean = (v) => v.replace(/\s+/g, ' ').trim();
  const a = clean(min);
  const b = clean(max);

  if (a && b) return `${a} – ${b} (${escapeHtml(cur)})`;
  if (a) return `${a} (${escapeHtml(cur)})`;
  if (b) return `${b} (${escapeHtml(cur)})`;
  return '—';
}

function yes(v) {
  return String(v || '').trim().toLowerCase() === 'yes';
}

function amenitiesFromClub(c) {
  const items = [
    ['Sauna', yes(c.has_sauna)],
    ['Pool', yes(c.has_pool)],
    ['Darkroom', yes(c.has_darkroom)],
    ['Private rooms', yes(c.has_private_rooms)],
    ['Lockers', yes(c.has_lockers)],
    ['Bar', yes(c.has_bar)],
    ['Dancefloor', yes(c.has_dancefloor)],
    ['Outdoor', yes(c.has_outdoor_area)]
  ];
  return items.filter(([, ok]) => ok).map(([name]) => name);
}

function openModal(c) {
  const starCount = starsFromClassificacao(c.Classificação);
  const stars = starCount
    ? `<span class="modal-stars" title="${starCount}/5">${'★'.repeat(starCount)}<span class="dim">${'★'.repeat(5 - starCount)}</span></span>`
    : '';

  els.modalTitle.innerHTML = `
    <span class="modal-title-text">${escapeHtml(c.name || '—')}</span>
    ${stars}
  `;

  // Buttons (top actions)
  const websiteBtn = c.website
    ? `<a class="modal-btn primary" href="${escapeHtmlAttr(c.website)}" target="_blank" rel="noopener noreferrer">
         Website <span class="hint">${escapeHtml(prettyDomain(c.website))}</span>
       </a>`
    : '';

  const mapHref = (c.lat != null && c.lng != null && String(c.lat).trim() && String(c.lng).trim())
    ? `https://www.google.com/maps?q=${encodeURIComponent(String(c.lat).trim() + ',' + String(c.lng).trim())}`
    : '';

  const mapBtn = mapHref
    ? `<a class="modal-btn" href="${escapeHtmlAttr(mapHref)}" target="_blank" rel="noopener noreferrer">Maps</a>`
    : '';

  const tel = normalizeTel(c.phone);
  const phoneBtn = tel
    ? `<a class="modal-btn" href="tel:${escapeHtmlAttr(tel)}">${escapeHtml(String(c.phone).trim())}</a>`
    : '';

  const email = (c.email || '').toString().trim();
  const emailBtn = email
    ? `<a class="modal-btn" href="mailto:${escapeHtmlAttr(email)}">Email</a>`
    : '';

  const location = [c.city, c.country].filter(Boolean).join(', ') || '—';
  const address = (c.address || '').toString().trim() || '—';
  const hoursTable = openingHoursTable(c);

  const entryPolicy = (c.entry_policy || '').toString().trim() || '—';
  const singlesPolicy = (c.singles_policy || '').toString().trim() || '—';
  const pricingModel = (c.pricing_model || '').toString().trim() || '—';
  const priceRange = (c.price_range || '').toString().trim() || '—';
  const coupleRange = euroRange(c);

  const entryNotes = (c.entry_notes || '').toString().trim();
  const pricingNotes = (c.pricing_notes || '').toString().trim();
  const obsGerais = (c["Obs Gerais"] || '').toString().trim();

  const notes = [entryNotes, pricingNotes, obsGerais].filter(Boolean);

  const amenities = amenitiesFromClub(c);
  const amenitiesHtml = amenities.length
    ? `<div class="amenities">
         ${amenities.map(a => `<span class="amenity">${escapeHtml(a)}</span>`).join('')}
       </div>`
    : '<span class="muted">—</span>';

  els.modalBody.innerHTML = `
    <div class="modal-actions">
      ${websiteBtn}
      ${mapBtn}
      ${phoneBtn}
      ${emailBtn}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Info</div>

      <div class="kv"><div class="k">Location</div><div class="v">${escapeHtml(location)}</div></div>
      <div class="kv"><div class="k">Address</div><div class="v pre">${escapeHtml(address)}</div></div>
      <div class="kv"><div class="k">Type</div><div class="v">${escapeHtml((c.type || '—').toString())}</div></div>
      <div class="kv kv-hours">
      <div class="k">Hours</div>
      <div class="v">${hoursTable}</div>
      </div>
      </div>

    <div class="modal-section">
      <div class="modal-section-title">Entry</div>

      <div class="kv"><div class="k">Entry policy</div><div class="v">${escapeHtml(entryPolicy)}</div></div>
      <div class="kv"><div class="k">Singles policy</div><div class="v">${escapeHtml(singlesPolicy)}</div></div>
      <div class="kv"><div class="k">Couples</div><div class="v">${escapeHtml(coupleRange)}</div></div>
      <div class="kv"><div class="k">Price range</div><div class="v">${escapeHtml(priceRange)}</div></div>
      <div class="kv"><div class="k">Pricing model</div><div class="v">${escapeHtml(pricingModel)}</div></div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Amenities</div>
      ${amenitiesHtml}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      ${
        notes.length
          ? `<ul class="notes">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
          : `<span class="muted">—</span>`
      }
    </div>
  `;

  els.overlay.classList.add('open');
  els.modal.classList.add('open');
  els.overlay.setAttribute('aria-hidden', 'false');
  els.modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => els.modalClose.focus(), 0);
}

function formatOpeningHours(c) {

  const days = [
    ['monday', 'Mon'],
    ['tuesday', 'Tue'],
    ['wednesday', 'Wed'],
    ['thursday', 'Thu'],
    ['friday', 'Fri'],
    ['saturday', 'Sat'],
    ['sunday', 'Sun']
  ];

  const openDays = days
    .filter(d => c[`open_time_${d[0]}`] && c[`open_time_${d[0]}`] !== 'closed');

  if (!openDays.length) return '—';

  const first = openDays[0][1];
  const last = openDays[openDays.length - 1][1];
  const hours = c[`open_time_${openDays[0][0]}`];

  return `${first}–${last} ${hours}`;
}

  function closeModal() {
    els.overlay.classList.remove('open');
    els.modal.classList.remove('open');
    els.overlay.setAttribute('aria-hidden', 'true');
    els.modal.setAttribute('aria-hidden', 'true');
  }

  function ensureMap() {
    if (map) return;

    if (!window.L) {
      console.error('Leaflet (L) not found.');
      return;
    }

    map = L.map(els.mapEl, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([39.5, -3.5], 5);

    // Dark basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
  }

  function refreshMap() {
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const points = [];

    filtered.forEach((c) => {
      if (c.lat == null || c.lng == null) return;
      points.push([c.lat, c.lng]);

      const m = L.circleMarker([c.lat, c.lng], {
        radius: 7,
        weight: 2,
        color: '#d3a94a',
        fillColor: '#d3a94a',
        fillOpacity: 0.35,
      });

      const popup = `<b>${escapeHtml(c.name)}</b><br>${escapeHtml(c.city || '')}${c.city && c.country ? ', ' : ''}${escapeHtml(c.country || '')}`;
      m.bindPopup(popup);
      m.on('click', () => openModal(c));
      m.addTo(markersLayer);
    });

    if (points.length) {
      try {
        map.fitBounds(points, { padding: [30, 30] });
      } catch (_) {
        // ignore
      }
    }
  }

  async function loadClubs() {
    try {
      // cache-bust to avoid GH Pages caching surprises
      const url = `clubs.json?v=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Data can be an array or object with key
      const list = Array.isArray(data) ? data : (data.clubs || data.items || []);
      // Normalize and drop placeholder rows (missing name) to avoid "(no name)" cards.
      allClubs = list.map(normalizeClub).filter(Boolean);

      fillCountries();
      fillCities();

      filtered = [...allClubs];
      applyFilters();
    } catch (err) {
      console.error('Erro a carregar clubs.json:', err);
      els.count.textContent = '0 results';
      els.gridView.innerHTML = '<div style="max-width:1100px;margin:0 auto;color:rgba(255,255,255,.75)">Erro a carregar os clubs. Vê a consola.</div>';
    }
  }

  function wireEvents() {
    els.search.addEventListener('input', () => applyFilters());

    els.country.addEventListener('change', () => {
      fillCities();
      applyFilters();
    });

    els.city.addEventListener('change', () => applyFilters());

    els.btnGrid.addEventListener('click', () => setMode('grid'));
    els.btnMap.addEventListener('click', () => setMode('map'));
    els.btnClear.addEventListener('click', () => clearFilters());

    els.modalClose.addEventListener('click', closeModal);
    els.overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function init() {
    wireEvents();
    setMode('grid');
    loadClubs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
