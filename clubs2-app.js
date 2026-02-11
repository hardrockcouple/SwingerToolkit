<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Clubs 2.0</title>

    <link rel="stylesheet" href="./styles.css" />
    <link rel="stylesheet" href="./clubs2.css" />
  </head>

  <body>
    <header class="navbar">
      <div class="nav-left">
        <img id="siteLogo" class="logo-img" alt="Logo" />
        <nav class="navLinks">
          <a href="index.html">Home</a>
          <a href="clubs.html">Clubs</a>
          <a href="clubs2.html">Clubs 2.0</a>
          <a href="shopping.html">Shopping</a>
          <a href="capdagde.html">Cap D'Agde</a>
          <a href="outras.html">Others</a>
        </nav>
      </div>
    </header>

    <div class="filtersBar">
      <div class="filtersInner">
        <input id="searchInput" class="searchInput" type="search" placeholder="Search by name..." />

        <select id="countryFilter" class="select">
          <option value="">Country</option>
        </select>

        <select id="cityFilter" class="select" disabled>
          <option value="">City</option>
        </select>

        <div class="viewSwitch">
          <button id="viewGrid" class="segBtn active" type="button">Grid</button>
          <button id="viewList" class="segBtn" type="button">List</button>
          <button id="viewMap" class="segBtn" type="button">Map</button>
        </div>

        <button id="clearFilters" class="btn" type="button">Clear</button>

        <div id="resultsCount" class="count">0 results</div>
      </div>
    </div>

    <main class="content">
      <div id="errorBox" class="errorBox hidden"></div>

      <div id="gridView" class="grid"></div>
      <div id="listView" class="list hidden"></div>

      <div id="mapView" class="mapWrap hidden">
        <div class="mapHint">(Simple mode) Click a club to open Google Maps.</div>
        <div id="mapList" class="list"></div>
      </div>
    </main>

    <!-- Drawer (painel lateral) -->
    <div id="drawerOverlay" class="drawerOverlay hidden" aria-hidden="true">
      <aside id="drawer" class="drawer" role="dialog" aria-modal="true" aria-label="Club details">
        <button id="closeDrawer" class="drawerClose" aria-label="Close">×</button>
        <div id="drawerBody"></div>
      </aside>
    </div>

    <script src="./config.js"></script>

    <script type="module">
      import { initLogo, setActiveNav } from "./ui-common.js";
      import { initClubs2 } from "./clubs2-app.js";

      initLogo();
      setActiveNav();
      initClubs2();
    </script>
  </body>
</html>
