import { initLogo, setActiveNav } from "./ui-common.js";
import { loadClubsJson, uniqueSorted } from "./clubs2-data.js";
import { buildCard, renderModal } from "./clubs2-render.js";

function $(id) { return document.getElementById(id); }
function safeText(v) { return String(v ?? "").trim(); }

let ALL = [];
let FILTERED = [];
let PAGE = 1;
let VIEW = "grid"; // grid | list | map (map disabled)

const cardsContainer = $("cardsContainer");
const searchInput = $("searchInput");
const countryFilter = $("countryFilter");
const cityFilter = $("cityFilter");
const clearBtn = $("clearFilters");
const resultsCount = $("resultsCount");
const errorBox = $("errorBox");

// view buttons
const viewGrid = $("viewGrid");
const viewList = $("viewList");
const viewMap = $("viewMap");

// modal
const modal = $("modal");
const closeModal = $("closeModal");
const modalBody = $("modalBody");

function setError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function clearError() {
  if (!errorBox) return;
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function rebuildCountryOptions() {
  const countries = uniqueSorted(ALL.map((x) => x.country).filter(Boolean));
  countryFilter.innerHTML =
    `<option value="">Country</option>` +
    countries.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function rebuildCityOptions(countryValue) {
  const subset = countryValue ? ALL.filter((x) => x.country === countryValue) : ALL;
  const cities = uniqueSorted(subset.map((x) => x.city).filter(Boolean));
  cityFilter.innerHTML =
    `<option value="">City</option>` +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");

  cityFilter.disabled = !countryValue;
  if (!countryValue) cityFilter.value = "";
}

function applyFilters(resetPage = true) {
  const q = safeText(searchInput.value).toLowerCase();
  const ctry = safeText(countryFilter.value);
  const city = safeText(cityFilter.value);

  FILTERED = ALL.filter((x) => {
    const okName = !q || safeText(x.name).toLowerCase().includes(q);
    const okCountry = !ctry || x.country === ctry;
    const okCity = !city || x.city === city;
    return okName && okCountry && okCity;
  });

  if (resetPage) PAGE = 1;
  render();
}

function setView(v) {
  VIEW = v;
  viewGrid.classList.toggle("active", v === "grid");
  viewList.classList.toggle("active", v === "list");
  viewMap.classList.toggle("active", v === "map");

  cardsContainer.classList.toggle("is-list", v === "list");
  applyFilters(false);
}

function renderPagination(totalPages) {
  const p = document.querySelector(".pagination");
  if (!p) return;
  p.innerHTML = "";
  if (totalPages <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const b = document.createElement("button");
    b.className = "pageBtn";
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    if (opts.active) b.classList.add("active");
    b.addEventListener("click", () => {
      PAGE = page;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return b;
  };

  p.appendChild(makeBtn("‹", Math.max(1, PAGE - 1), { disabled: PAGE === 1 }));

  for (let i = 1; i <= totalPages; i++) {
    p.appendChild(makeBtn(String(i), i, { active: i === PAGE }));
  }

  p.appendChild(makeBtn("›", Math.min(totalPages, PAGE + 1), { disabled: PAGE === totalPages }));
}

function openModal(item) {
  renderModal(modalBody, item);
  modal.classList.remove("hidden");
}

function closeModalFn() {
  modal.classList.add("hidden");
}

function render() {
  clearError();

  // Map view (disabled for now)
  if (VIEW === "map") {
    cardsContainer.innerHTML = `<div style="padding:18px;color:#cfcfcf;">Map view (soon).</div>`;
    resultsCount.textContent = `${FILTERED.length} results`;
    renderPagination(1);
    return;
  }

  const pageSize = Number(CONFIG?.PAGE_SIZE || 12);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  PAGE = Math.min(PAGE, totalPages);

  const start = (PAGE - 1) * pageSize;
  const slice = FILTERED.slice(start, start + pageSize);

  cardsContainer.innerHTML = "";
  slice.forEach((item) => cardsContainer.appendChild(buildCard(item, openModal)));

  resultsCount.textContent = `${total} results`;
  renderPagination(totalPages);
}

async function init() {
  setActiveNav();
  initLogo();

  // listeners
  searchInput.addEventListener("input", () => applyFilters(true));
  countryFilter.addEventListener("change", () => {
    rebuildCityOptions(safeText(countryFilter.value));
    applyFilters(true);
  });
  cityFilter.addEventListener("change", () => applyFilters(true));

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    countryFilter.value = "";
    cityFilter.value = "";
    rebuildCityOptions("");
    applyFilters(true);
  });

  viewGrid.addEventListener("click", () => setView("grid"));
  viewList.addEventListener("click", () => setView("list"));
  viewMap.addEventListener("click", () => setView("map"));

  closeModal.addEventListener("click", closeModalFn);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModalFn();
  });

  // load
  try {
    ALL = await loadClubsJson();
    FILTERED = [...ALL];
    rebuildCountryOptions();
    rebuildCityOptions("");
    setView("grid");
  } catch (err) {
    console.error(err);
    setError(err?.message || "Error loading data");
  }
}

document.addEventListener("DOMContentLoaded", init);
