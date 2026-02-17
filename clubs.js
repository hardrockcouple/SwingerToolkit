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
    els.modalTitle.textContent = c.name;

    const websiteHtml = c.website
      ? `<a href="${escapeHtmlAttr(c.website)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span style="opacity:.6">—</span>';

    const mapLink = (c.lat != null && c.lng != null)
      ? `<a href="https://www.google.com/maps?q=${c.lat},${c.lng}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>`
      : '<span style="opacity:.6">—</span>';

    els.modalBody.innerHTML = `
      <div class="kv"><div class="k">Country</div><div class="v">${escapeHtml(c.country || '—')}</div></div>
      <div class="kv"><div class="k">City</div><div class="v">${escapeHtml(c.city || '—')}</div></div>
      <div class="kv"><div class="k">Website</div><div class="v">${websiteHtml}</div></div>
      <div class="kv"><div class="k">Map</div><div class="v">${mapLink}</div></div>
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
