// clubs2-app.js
import { loadClubs } from "./clubs2-data.js";
import { buildCard, buildRow, renderModal } from "./clubs2-render.js";

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
  const mapList = $("mapList");

  const viewGrid = $("viewGrid");
  const viewList = $("viewList");
  const viewMap = $("viewMap");

  const errorBox = $("errorBox");

  const modal = $("modal");
  const closeModal = $("closeModal");
  const modalBody = $("modalBody");

  let ALL = [];
  let FILTERED = [];
  let MODE = "grid";

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function hideError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }

  function setMode(mode) {
    MODE = mode;

    viewGrid.classList.toggle("active", mode === "grid");
    viewList.classList.toggle("active", mode === "list");
    viewMap.classList.toggle("active", mode === "map");

    gridView.classList.toggle("hidden", mode !== "grid");
    listView.classList.toggle("hidden", mode !== "list");
    mapView.classList.toggle("hidden", mode !== "map");

    render();
  }

  function openModal(item) {
    renderModal(modalBody, item);
    modal.classList.remove("hidden");
  }

  function closeModalFn() {
    modal.classList.add("hidden");
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

  function render() {
    // grid
    if (MODE === "grid") {
      const pageSize = Number(window.CONFIG?.PAGE_SIZE || 12);
      const slice = FILTERED.slice(0, pageSize);

      gridView.innerHTML = "";
      slice.forEach((item) => gridView.appendChild(buildCard(item, openModal)));
      return;
    }

    // list
    if (MODE === "list") {
      listView.innerHTML = "";
      FILTERED.forEach((item) => listView.appendChild(buildRow(item, openModal)));
      return;
    }

    // map (simple)
    if (MODE === "map") {
      mapList.innerHTML = "";
      FILTERED.forEach((item) => {
        const row = buildRow(item, (it) => window.open(
          (it.lat && it.lng)
            ? `https://www.google.com/maps?q=${encodeURIComponent(it.lat + "," + it.lng)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([it.name, it.city, it.country].filter(Boolean).join(" "))}`,
          "_blank",
          "noreferrer"
        ));
        mapList.appendChild(row);
      });
    }
  }

  // listeners
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
  viewMap.addEventListener("click", () => setMode("map"));

  closeModal.addEventListener("click", closeModalFn);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModalFn();
  });

  // load
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
