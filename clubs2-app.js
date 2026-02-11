import { loadClubs } from "./clubs2-data.js";
import { buildCard, buildRow, renderDrawer } from "./clubs2-render.js";

function $(id){ return document.getElementById(id); }

export async function initClubs2(){

  const searchInput = $("searchInput");
  const countryFilter = $("countryFilter");
  const cityFilter = $("cityFilter");
  const clearBtn = $("clearFilters");
  const resultsCount = $("resultsCount");

  const gridView = $("gridView");
  const listView = $("listView");
  const mapView = $("mapView");

  const viewGrid = $("viewGrid");
  const viewList = $("viewList");
  const viewMap = $("viewMap");

  const drawer = $("drawer");
  const drawerBody = $("drawerBody");
  const closeDrawer = $("closeDrawer");

  let ALL = [];
  let FILTERED = [];
  let MODE = "grid";
  let MAP;
  let MARKERS = [];

  function setMode(mode){
    MODE = mode;

    viewGrid.classList.toggle("active", mode==="grid");
    viewList.classList.toggle("active", mode==="list");
    viewMap.classList.toggle("active", mode==="map");

    gridView.classList.toggle("hidden", mode!=="grid");
    listView.classList.toggle("hidden", mode!=="list");
    mapView.classList.toggle("hidden", mode!=="map");

    render();
  }

  function openDrawer(item){
    renderDrawer(drawerBody,item);
    drawer.classList.remove("hidden");
  }

  function closeDrawerFn(){
    drawer.classList.add("hidden");
  }

  function applyFilters(){
    const q = searchInput.value.toLowerCase();
    const c = countryFilter.value;
    const city = cityFilter.value;

    FILTERED = ALL.filter(x=>{
      return (!q || x.name.toLowerCase().includes(q))
        && (!c || x.country===c)
        && (!city || x.city===city);
    });

    resultsCount.textContent = `${FILTERED.length} results`;
    render();
  }

  function render(){

    if(MODE==="grid"){
      gridView.innerHTML="";
      FILTERED.forEach(item=>gridView.appendChild(buildCard(item,openDrawer)));
    }

    if(MODE==="list"){
      listView.innerHTML="";
      FILTERED.forEach(item=>listView.appendChild(buildRow(item,openDrawer)));
    }

    if(MODE==="map"){
      if(!MAP){
        MAP = L.map('map').setView([40,0],5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          attribution:'© OpenStreetMap'
        }).addTo(MAP);
      }

      MARKERS.forEach(m=>MAP.removeLayer(m));
      MARKERS=[];

      FILTERED.forEach(item=>{
        if(item.lat && item.lng){
          const m=L.marker([item.lat,item.lng]).addTo(MAP);
          m.bindPopup(`<b>${item.name}</b><br>${item.city || ""}`);
          MARKERS.push(m);
        }
      });
    }
  }

  searchInput.addEventListener("input",applyFilters);
  countryFilter.addEventListener("change",applyFilters);
  cityFilter.addEventListener("change",applyFilters);
  clearBtn.addEventListener("click",()=>{
    searchInput.value="";
    countryFilter.value="";
    cityFilter.value="";
    applyFilters();
  });

  viewGrid.addEventListener("click",()=>setMode("grid"));
  viewList.addEventListener("click",()=>setMode("list"));
  viewMap.addEventListener("click",()=>setMode("map"));

  closeDrawer.addEventListener("click",closeDrawerFn);
  drawer.addEventListener("click",(e)=>{
    if(e.target===drawer) closeDrawerFn();
  });

  ALL = await loadClubs();
  FILTERED = [...ALL];

  const countries=[...new Set(ALL.map(x=>x.country))].filter(Boolean);
  countryFilter.innerHTML="<option value=''>Country</option>"+countries.map(c=>`<option>${c}</option>`).join("");

  applyFilters();
}
