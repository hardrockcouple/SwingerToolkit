import { loadClubs } from "./clubs2-data.js";
import { buildCard, buildRow, renderDrawer } from "./clubs2-render.js";

function $(id){ return document.getElementById(id); }

export async function initClubs2(){

  const search = $("searchInput");
  const country = $("countryFilter");
  const city = $("cityFilter");
  const clear = $("clearFilters");

  const gridView = $("gridView");
  const listView = $("listView");

  const viewGrid = $("viewGrid");
  const viewList = $("viewList");

  const drawer = $("drawer");
  const drawerBody = $("drawerBody");
  const closeDrawer = $("closeDrawer");

  let ALL = [];
  let FILTERED = [];
  let MODE = "grid";

  function openDrawer(item){
    renderDrawer(drawerBody, item);
    drawer.classList.remove("hidden");
  }

  function closeDrawerFn(){
    drawer.classList.add("hidden");
  }

  function render(){

    gridView.classList.toggle("hidden", MODE !== "grid");
    listView.classList.toggle("hidden", MODE !== "list");

    if(MODE === "grid"){
      gridView.innerHTML = "";
      FILTERED.slice(0, 12).forEach(x => gridView.appendChild(buildCard(x, openDrawer)));
    }

    if(MODE === "list"){
      listView.innerHTML = "";
      FILTERED.forEach(x => listView.appendChild(buildRow(x, openDrawer)));
    }

    $("resultsCount").textContent = `${FILTERED.length} results`;
  }

  function applyFilters(){
    const q = search.value.toLowerCase();
    const c = country.value;
    const ci = city.value;

    FILTERED = ALL.filter(x =>
      (!q || x.name.toLowerCase().includes(q)) &&
      (!c || x.country === c) &&
      (!ci || x.city === ci)
    );

    render();
  }

  function rebuildFilters(){
    const countries = [...new Set(ALL.map(x=>x.country).filter(Boolean))].sort();
    country.innerHTML = `<option value="">Country</option>` + countries.map(c=>`<option>${c}</option>`).join("");
  }

  search.addEventListener("input", applyFilters);
  country.addEventListener("change", applyFilters);
  city.addEventListener("change", applyFilters);
  clear.addEventListener("click", ()=>{
    search.value="";
    country.value="";
    city.value="";
    applyFilters();
  });

  viewGrid.addEventListener("click", ()=>{
    MODE="grid";
    viewGrid.classList.add("active");
    viewList.classList.remove("active");
    render();
  });

  viewList.addEventListener("click", ()=>{
    MODE="list";
    viewList.classList.add("active");
    viewGrid.classList.remove("active");
    render();
  });

  closeDrawer.addEventListener("click", closeDrawerFn);
  drawer.addEventListener("click", e=>{
    if(e.target === drawer) closeDrawerFn();
  });

  ALL = await loadClubs();
  FILTERED = [...ALL];
  rebuildFilters();
  render();
}
