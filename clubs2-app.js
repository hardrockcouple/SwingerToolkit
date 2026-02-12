import { loadClubs } from "./clubs2-data.js";
import { buildCard, buildRow, renderDrawer } from "./clubs2-render.js";

function $(id) {
  return document.getElementById(id);
}

function safeText(v) {
  return String(v ?? "").trim();
}

function uniq(list) {
  return Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function initClubs2() {
  const searchInput = $("searchInput");
  const countryFilter = $("countryFilter");
  const cityFilter = $("cityFilter");
  const clearBtn = $("clearFilters");
  const resultsCount = $("resultsCount");

  const gridView = $("gridView");
  const listView = $("listView");
  const mapView = $("mapView");
  const mapCanvas = $("mapCanvas");
  const mapHint = $("mapHint") || document.querySelector(".mapHint");

  const viewGrid = $("viewGrid");
  const viewList = $("viewList");
  const viewMap = $("viewMap");

  const errorBox = $("errorBox");

  // Suporte a duas variantes de UI:
  // - "drawer" (novo): #drawer, #drawerClose, #drawerBody
  // - "panel" (antigo): #panelOverlay, #panelClose, #panelBody
  const drawer = $("drawer") || $("panelOverlay");
  const panel = $("panel"); // só existe na variante "panel"
  const drawerClose = $("drawerClose") || $("closePanel") || $("panelClose");
  const drawerBody = $("drawerBody") || $("panelBody");

  let ALL = [];
  let FILTERED = [];
  let MODE = "grid";

  let MAP = null;
  let MAP_MARKERS = null;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function hideError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }

  function openDrawer(item) {
    if (!drawer || !drawerBody) return;
    renderDrawer(drawerBody, item);

    // drawer -> classe "open" ; panelOverlay -> remover "hidden"
    if (drawer.id === "panelOverlay") {
      drawer.classList.remove("hidden");
      if (panel) panel.classList.remove("hidden");
    } else {
      drawer.classList.add("open");
    }
  }

  function closeDrawer() {
    if (!drawer) return;
    if (drawer.id === "panelOverlay") {
      drawer.classList.add("hidden");
      if (panel) panel.classList.add("hidden");
    } else {
      drawer.classList.remove("open");
    }
  }

  function setMode(mode) {
    MODE = mode;

    viewGrid.classList.toggle("active", mode === "grid");
    viewList.classList.toggle("active", mode === "list");
    if (viewMap) viewMap.classList.toggle("active", mode === "map");

    gridView.classList.toggle("hidden", mode !== "grid");
    listView.classList.toggle("hidden", mode !== "list");
    if (mapView) mapView.classList.toggle("hidden", mode !== "map");

    render();
  }

  function rebuildFilters() {
    const countries = uniq(ALL.map((x) => x.country));
    countryFilter.innerHTML =
      `<option value="">Country</option>` +
      countries.map((c) => `<option value="${c}">${c}</option>`).join("");

    rebuildCities("");
  }

  function rebuildCities(country) {
    const subset = country ? ALL.filter((x) => x.country === country) : ALL;
    const cities = uniq(subset.map((x) => x.city));
    cityFilter.innerHTML =
      `<option value="">City</option>` +
      cities.map((c) => `<option value="${c}">${c}</option>`).join("");

    cityFilter.disabled = !country;
    if (!country) cityFilter.value = "";
  }

  function applyFilters() {
    const q = safeText(searchInput.value).toLowerCase();
    const ctry = safeText(countryFilter.value);
    const city = safeText(cityFilter.value);

    FILTERED = ALL.filter((x) => {
      const okName = !q || safeText(x.name).toLowerCase().includes(q);
      const okCountry = !ctry || x.country === ctry;
      const okCity = !city || x.city === city;
      return okName && okCountry && okCity;
    });

    if (resultsCount) resultsCount.textContent = `${FILTERED.length} results`;
    render();
  }

  function hasCoords(it) {
    return it && typeof it.latNum === "number" && typeof it.lngNum === "number" && !Number.isNaN(it.latNum) && !Number.isNaN(it.lngNum);
  }

  function initMap() {
    if (!mapCanvas) return;
    const L = window.L;
    if (!L) return;

    MAP = L.map(mapCanvas, { preferCanvas: true, zoomControl: true });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(MAP);

    MAP_MARKERS = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 25,
      maxClusterRadius: 60
    });

    MAP.addLayer(MAP_MARKERS);
    MAP.setView([20, 0], 2);
  }

  function renderMap() {
    if (!mapView || !mapCanvas) return;

    if (!MAP) initMap();
    if (!MAP || !MAP_MARKERS || !window.L) return;

    MAP_MARKERS.clearLayers();

    const withCoords = FILTERED.filter(hasCoords);
    const withoutCoords = FILTERED.length - withCoords.length;

    const CAP = 6000;
    const slice = withCoords.slice(0, CAP);

    const L = window.L;
    slice.forEach((it) => {
      const m = L.marker([it.latNum, it.lngNum], { title: it.name || "" });
      m.on("click", () => openDrawer(it));
      MAP_MARKERS.addLayer(m);
    });

    if (slice.length) {
      const bounds = L.latLngBounds(slice.map((it) => [it.latNum, it.lngNum]));
      MAP.fitBounds(bounds.pad(0.15));
    } else {
      MAP.setView([20, 0], 2);
    }

    if (mapHint) {
      const capNote = withCoords.length > CAP ? ` (showing first ${CAP})` : "";
      mapHint.textContent = `${withCoords.length} clubs with coordinates${capNote}. ${withoutCoords} without coordinates.`;
    }

    setTimeout(() => MAP.invalidateSize(), 60);
  }

  function render() {
    if (MODE === "grid") {
      const pageSize = Number(window.CONFIG?.PAGE_SIZE || 12);
      const slice = FILTERED.slice(0, pageSize);

      gridView.innerHTML = "";
      slice.forEach((item) => gridView.appendChild(buildCard(item, openDrawer)));
      return;
    }

    if (MODE === "list") {
      listView.innerHTML = "";
      FILTERED.forEach((item) => listView.appendChild(buildRow(item, openDrawer)));
      return;
    }

    if (MODE === "map") {
      renderMap();
    }
  }

  searchInput.addEventListener("input", applyFilters);
  countryFilter.addEventListener("change", () => {
    rebuildCities(safeText(countryFilter.value));
    applyFilters();
  });
  cityFilter.addEventListener("change", applyFilters);

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    countryFilter.value = "";
    cityFilter.value = "";
    rebuildCities("");
    applyFilters();
  });

  viewGrid.addEventListener("click", () => setMode("grid"));
  viewList.addEventListener("click", () => setMode("list"));
  if (viewMap) viewMap.addEventListener("click", () => setMode("map"));

  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) closeDrawer();
    });
  }

  try {
    hideError();
    ALL = await loadClubs();
    FILTERED = [...ALL];
    rebuildFilters();
    applyFilters();
  } catch (e) {
    showError(safeText(e.message || e));
  }
}
