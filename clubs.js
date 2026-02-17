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

  function yes(v) {
    const s = safeText(v).toLowerCase();
    return s === 'yes' || s === 'true' || v === true || v === 1;
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
      visited: yes(raw.visited),
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

  function starsFromClassificacao(val) {
    if (!val) return 0;
    const s = safeText(val);
    if (s.includes('*')) return (s.match(/\*/g) || []).length;
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return Math.max(0, Math.min(5, n));
    return 0;
  }

  function prettyDomain(url) {
    const u = safeText(url);
    if (!u) return '';
    try {
      const parsed = new URL(u);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return u.replace(/^https?:\/\//, '').replace(/^www\./, '');
    }
  }

  function normalizeTel(phone) {
    return safeText(phone).replace(/[^\d+]/g, '');
  }

  function euroRange(c) {
    const min = safeText(c.price_couples_min);
    const max = safeText(c.price_couples_max);
    const cur = safeText(c.price_currency || 'EUR');
    const clean = (v) => v.replace(/\s+/g, ' ').trim();
    const a = clean(min);
    const b = clean(max);
    if (a && b) return `${a} – ${b} (${cur})`;
    if (a) return `${a} (${cur})`;
    if (b) return `${b} (${cur})`;
    return '—';
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
      ['Outdoor', yes(c.has_outdoor_area)],
    ];
    return items.filter(([, ok]) => ok).map(([name]) => name);
  }

  function openingHoursTable(c) {
    const days = [
      ['monday', 'Mon'],
      ['tuesday', 'Tue'],
      ['wednesday', 'Wed'],
      ['thursday', 'Thu'],
      ['friday', 'Fri'],
      ['saturday', 'Sat'],
      ['sunday', 'Sun'],
    ];

    const rows = days.map(([key, label]) => {
      const raw = safeText(c[`open_time_${key}`]);
      const isClosed = !raw || raw.toLowerCase() === 'closed';
      const display = isClosed ? 'Closed' : raw;
      return `
        <tr class="${isClosed ? 'closed' : ''}">
          <td class="d">${label}</td>
          <td class="h">${escapeHtml(display)}</td>
        </tr>
      `;
    }).join('');

    const note = safeText(c.open_time_notes);
    const noteHtml = note ? `<div class="hours-note">${escapeHtml(note)}</div>` : '';

    return `
      <div class="hours-wrap">
        <table class="hours-table"><tbody>${rows}</tbody></table>
        ${noteHtml}
      </div>
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

  function openModal(c) {
    const starCount = starsFromClassificacao(c['Classificação']);
    const stars = starCount
      ? `<span class="modal-stars" title="${starCount}/5">${'★'.repeat(starCount)}<span class="dim">${'★'.repeat(5 - starCount)}</span></span>`
      : '';

    els.modalTitle.innerHTML = `<span class="modal-title-text">${escapeHtml(c.name || '—')}</span>${stars}`;

    const websiteBtn = safeText(c.website)
      ? `<a class="modal-btn primary" href="${escapeHtmlAttr(c.website)}" target="_blank" rel="noopener noreferrer">Website <span class="hint">${escapeHtml(prettyDomain(c.website))}</span></a>`
      : '';

    const mapHref = (c.lat != null && c.lng != null && String(c.lat).trim() && String(c.lng).trim())
      ? `https://www.google.com/maps?q=${encodeURIComponent(String(c.lat).trim() + ',' + String(c.lng).trim())}`
      : '';

    const mapBtn = mapHref
      ? `<a class="modal-btn" href="${escapeHtmlAttr(mapHref)}" target="_blank" rel="noopener noreferrer">Maps</a>`
      : '';

    const tel = normalizeTel(c.phone);
    const phoneBtn = tel
      ? `<a class="modal-btn" href="tel:${escapeHtmlAttr(tel)}">${escapeHtml(safeText(c.phone))}</a>`
      : '';

    const email = safeText(c.email);
    const emailBtn = email
      ? `<a class="modal-btn" href="mailto:${escapeHtmlAttr(email)}">Email</a>`
      : '';

    const location = [safeText(c.city), safeText(c.country)].filter(Boolean).join(', ') || '—';
    const address = safeText(c.address) || '—';
    const type = safeText(c.type) || '—';
    const hoursTable = openingHoursTable(c);

    const entryPolicy = safeText(c.entry_policy) || '—';
    const singlesPolicy = safeText(c.singles_policy) || '—';
    const coupleRange = euroRange(c);
    const priceRange = safeText(c.price_range) || '—';
    const pricingModel = safeText(c.pricing_model) || '—';

    const entryNotes = safeText(c.entry_notes);
    const pricingNotes = safeText(c.pricing_notes);
    const obsGerais = safeText(c['Obs Gerais']);
    const notes = [entryNotes, pricingNotes, obsGerais].filter(Boolean);

    const amenities = amenitiesFromClub(c);
    const amenitiesHtml = amenities.length
      ? `<div class="amenities">${amenities.map(a => `<span class="amenity">${escapeHtml(a)}</span>`).join('')}</div>`
      : `<span class="muted">—</span>`;

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
        <div class="kv"><div class="k">Type</div><div class="v">${escapeHtml(type)}</div></div>
        <div class="kv kv-hours"><div class="k">Hours</div><div class="v">${hoursTable}</div></div>
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
        ${notes.length
          ? `<ul class="notes">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
          : `<span class="muted">—</span>`
        }
      </div>
    `;

    els.overlay.classList.add('open');
    els.modal.classList.add('open');
    els.overlay.setAttribute('aria-hidden', 'false');
    els.modal.setAttribute('aria-hidden', 'false');

    // focus close button for accessibility
    setTimeout(() => els.modalClose.focus(), 0);
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
