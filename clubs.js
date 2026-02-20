/* Clubs (Grid + Map) */

(function () {
  const $ = (id) => document.getElementById(id);

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

    const lat = Number(raw.lat ?? raw.latitude ?? raw.Latitude ?? raw.LAT);
    const lng = Number(raw.lng ?? raw.lon ?? raw.long ?? raw.longitude ?? raw.Longitude ?? raw.LNG);

    if (!name) return null;

    return {
      ...raw,
      name,
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

  function normalizeTel(phone) {
    return safeText(phone).replace(/[^\d+]/g, '');
  }

  function euroRange(c) {
    const min = safeText(c.price_couples_min);
    const max = safeText(c.price_couples_max);
    const cur = safeText(c.price_currency || 'EUR');
    if (min && max) return `${min} – ${max} (${cur})`;
    if (min) return `${min} (${cur})`;
    if (max) return `${max} (${cur})`;
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

    return `
      <div class="hours-wrap">
        <table class="hours-table"><tbody>${rows}</tbody></table>
      </div>
    `;
  }

  function openModal(c) {
    const typeBadge = safeText(c.type)
      ? `<span class="modal-type-badge">${escapeHtml(c.type)}</span>`
      : '';

    els.modalTitle.innerHTML = `
      <span class="modal-title-text">${escapeHtml(c.name || '—')}</span>
      ${typeBadge}
    `;

    const websiteBtn = c.website
      ? `<a class="modal-btn primary" href="${escapeHtmlAttr(c.website)}" target="_blank">Website</a>`
      : '';

    const location = [safeText(c.city), safeText(c.country)].filter(Boolean).join(', ') || '—';
    const address = safeText(c.address) || '—';
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
      <div class="modal-actions">${websiteBtn}</div>

      <div class="modal-section">
        <div class="modal-section-title">Info</div>
        <div class="kv"><div class="k">Location</div><div class="v">${escapeHtml(location)}</div></div>
        <div class="kv"><div class="k">Address</div><div class="v pre">${escapeHtml(address)}</div></div>

        <div class="modal-columns">
          <div class="modal-panel">
            <div class="modal-panel-title">Hours</div>
            ${hoursTable}
          </div>

          <div class="modal-panel">
            <div class="modal-panel-title">Entry</div>
            <div class="kv"><div class="k">Entry policy</div><div class="v">${escapeHtml(entryPolicy)}</div></div>
            <div class="kv"><div class="k">Singles policy</div><div class="v">${escapeHtml(singlesPolicy)}</div></div>
            <div class="kv"><div class="k">Couples</div><div class="v">${escapeHtml(coupleRange)}</div></div>
            <div class="kv"><div class="k">Price range</div><div class="v">${escapeHtml(priceRange)}</div></div>
            <div class="kv"><div class="k">Pricing model</div><div class="v">${escapeHtml(pricingModel)}</div></div>

            ${notes.length
              ? `
                <div class="modal-subsection" style="margin-top: 12px;">
                  <div class="modal-subtitle">Notes</div>
                  <ul class="notes">
                    ${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
                  </ul>
                </div>
              `
              : ''
            }
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Amenities</div>
        ${amenitiesHtml}
      </div>
    `;

    els.overlay.classList.add('open');
    els.modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

})();