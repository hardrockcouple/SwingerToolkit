// clubs2-app.js
import { initLogo } from "./ui-common.js";
import { loadClubsJson } from "./clubs2-data.js";
import { renderCards, renderSidebar } from "./clubs2-render.js";

function $(id) {
  return document.getElementById(id);
}

function norm(s) {
  return String(s ?? "").trim();
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
  );
}

function buildPageList(totalPages, currentPage) {
  const pages = [];
  const add = (p) => pages.push(p);

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
    return pages;
  }

  add(1);

  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push("dots");
  for (let p = left; p <= right; p++) add(p);
  if (right < totalPages - 1) pages.push("dots");

  add(totalPages);
  return pages;
}

function makeBtn(label, { disabled = false, active = false } = {}) {
  const btn = document.createElement("button");
  btn.className = "pageBtn" + (active ? " active" : "");
  btn.type = "button";
  btn.textContent = label;
  btn.disabled = disabled;
  return btn;
}

function makeDots() {
  const span = document.createElement("span");
  span.className = "pageDots";
  span.textContent = "…";
  return span;
}

document.addEventListener("DOMContentLoaded", async () => {
  initLogo();

  const cardsContainer = $("cardsContainer");
  const searchEl = $("searchInput");
  const countryEl = $("countryFilter");
  const cityEl = $("cityFilter");
  const clearEl = $("clearFilters");
  const countEl = $("resultsCount");

  const viewGridBtn = $("viewGrid");
  const viewListBtn = $("viewList");
  const viewMapBtn = $("viewMap"); // disabled por agora

  const paginationEl = $("pagination");

  const sidebar = $("sidebar");
  const backdrop = $("backdrop");
  const closeSidebar = $("closeSidebar");
  const sidebarTitleEl = $("sidebarTitle");
  const sidebarSubEl = $("sidebarSub");
  const sidebarBodyEl = $("sidebarBody");

  if (!cardsContainer) return;

  const DATA_URL = (window.CONFIG && window.CONFIG.DATA_SOURCE) ? window.CONFIG.DATA_SOURCE : "./clubs.json";
  const PAGE_SIZE = Number(window.CONFIG?.PAGE_SIZE || 12);

  let ALL = [];
  let FILTERED = [];
  let VIEW_MODE = "grid";
  let PAGE = 1;

  function setViewMode(mode) {
    VIEW_MODE = mode;
    viewGridBtn?.classList.toggle("active", mode === "grid");
    viewListBtn?.classList.toggle("active", mode === "list");
    // map fica futuro

    render();
  }

  function openSidebar(club) {
    renderSidebar(club, { sidebarTitleEl, sidebarSubEl, sidebarBodyEl });
    sidebar?.classList.remove("hidden");
    backdrop?.classList.remove("hidden");
  }

  function closeSidebarFn() {
    sidebar?.classList.add("hidden");
    backdrop?.classList.add("hidden");
  }

  closeSidebar?.addEventListener("click", closeSidebarFn);
  backdrop?.addEventListener("click", closeSidebarFn);

  viewGridBtn?.addEventListener("click", () => setViewMode("grid"));
  viewListBtn?.addEventListener("click", () => setViewMode("list"));
  viewMapBtn?.addEventListener("click", () => setViewMode("map"));

  function updateCountries() {
    const countries = uniqSorted(ALL.map((c) => norm(c.country)));
    countryEl.innerHTML =
      `<option value="">Country</option>` +
      countries.map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  function updateCitiesForCountry(selectedCountry) {
    const cities = uniqSorted(
      ALL.filter((c) => norm(c.country) === selectedCountry).map((c) => norm(c.city))
    );

    cityEl.innerHTML =
      `<option value="">City</option>` +
      cities.map((c) => `<option value="${c}">${c}</option>`).join("");

    if (!selectedCountry) {
      cityEl.disabled = true;
      cityEl.value = "";
    } else {
      cityEl.disabled = false;
      if (!cities.includes(cityEl.value)) cityEl.value = "";
    }
  }

  function applyFilters(resetPage = true) {
    const q = norm(searchEl.value).toLowerCase();
    const country = norm(countryEl.value);
    const city = norm(cityEl.value);

    FILTERED = ALL.filter((c) => {
      if (country && norm(c.country) !== country) return false;
      if (city && norm(c.city) !== city) return false;
      if (q && !norm(c.name).toLowerCase().includes(q)) return false;
      return true;
    });

    if (resetPage) PAGE = 1;
    render();
  }

  function totalPages() {
    return Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  }

  function getPageSlice() {
    const start = (PAGE - 1) * PAGE_SIZE;
    return FILTERED.slice(start, start + PAGE_SIZE);
  }

  function renderPagination() {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";

    const tp = totalPages();
    if (tp <= 1) return;

    const prev = makeBtn("Prev", { disabled: PAGE === 1 });
    prev.addEventListener("click", () => {
      PAGE = Math.max(1, PAGE - 1);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    paginationEl.appendChild(prev);

    const pageList = buildPageList(tp, PAGE);
    pageList.forEach((p) => {
      if (p === "dots") return paginationEl.appendChild(makeDots());
      const btn = makeBtn(String(p), { active: p === PAGE });
      btn.addEventListener("click", () => {
        PAGE = p;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      paginationEl.appendChild(btn);
    });

    const next = makeBtn("Next", { disabled: PAGE === tp });
    next.addEventListener("click", () => {
      PAGE = Math.min(tp, PAGE + 1);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    paginationEl.appendChild(next);
  }

  function render() {
    const tp = totalPages();
    if (PAGE > tp) PAGE = tp;

    const slice = getPageSlice();
    renderCards(cardsContainer, slice, {
      mode: VIEW_MODE === "list" ? "list" : "grid",
      onOpen: openSidebar
    });

    if (countEl) countEl.textContent = `${FILTERED.length} / ${ALL.length}`;
    renderPagination();
  }

  // Events
  searchEl?.addEventListener("input", () => applyFilters(true));
  countryEl?.addEventListener("change", () => {
    updateCitiesForCountry(norm(countryEl.value));
    applyFilters(true);
  });
  cityEl?.addEventListener("change", () => applyFilters(true));
  clearEl?.addEventListener("click", () => {
    searchEl.value = "";
    countryEl.value = "";
    cityEl.value = "";
    cityEl.disabled = true;
    applyFilters(true);
  });

  // Load
  try {
    ALL = await loadClubsJson(DATA_URL);
    FILTERED = [...ALL];

    updateCountries();
    updateCitiesForCountry(norm(countryEl.value));
    applyFilters(false);
  } catch (e) {
    console.error(e);
    cardsContainer.innerHTML = `
      <div style="padding:18px;color:#fff;">
        <div style="font-weight:800;margin-bottom:6px;">Error loading data</div>
        <div style="color:#cfcfcf;">${String(e?.message || e)}</div>
      </div>
    `;
  }
});
