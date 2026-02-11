(() => {
  const out = document.getElementById("out");
  const statusEl = document.getElementById("status");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnCopy = document.getElementById("btnCopy");
  const btnDownload = document.getElementById("btnDownload");

  function setStatus(msg, kind = "") {
    statusEl.className = "status " + (kind || "");
    statusEl.textContent = msg || "";
  }

  function safeText(v) {
    return String(v ?? "").trim().replace(/^"(.*)"$/, "$1").trim();
  }

  // CSV parser (aspas + vírgulas dentro de campos)
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((x) => String(x).trim() !== "")) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }

    row.push(field);
    if (row.some((x) => String(x).trim() !== "")) rows.push(row);
    return rows;
  }

  function findColIndex(headers, candidates) {
    const norm = (s) => safeText(s).toLowerCase();
    const h = headers.map(norm);
    for (const c of candidates) {
      const idx = h.indexOf(norm(c));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function toNumberOrEmpty(v) {
    const s = safeText(v);
    if (!s) return "";
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : "";
  }

  async function fetchCSV() {
    const url = window.CONFIG?.DATA_SOURCE;
    if (!url) throw new Error("CONFIG.DATA_SOURCE não está definido em config.js");

    setStatus("A carregar CSV…");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falhou a ir buscar o CSV (HTTP ${res.status})`);

    return await res.text();
  }

  function csvToJSON(csvText) {
    const table = parseCSV(csvText);
    if (!table.length) return [];

    const headers = table[0].map(safeText);
    const rows = table.slice(1);

    // agora que tens ID no sheet, mapeamos:
    const idxId = findColIndex(headers, ["id"]);
    const idxCountry = findColIndex(headers, ["country", "país", "pais"]);
    const idxCity = findColIndex(headers, ["city", "cidade"]);
    const idxName = findColIndex(headers, ["name", "nome", "club"]);
    const idxType = findColIndex(headers, ["type", "tipo"]);
    const idxWebsite = findColIndex(headers, ["website", "url", "site", "link"]);
    const idxAddress = findColIndex(headers, ["address", "morada", "endereco", "endereço"]);
    const idxLat = findColIndex(headers, ["lat", "latitude"]);
    const idxLng = findColIndex(headers, ["lng", "lon", "longitude", "long"]);

    const items = [];

    for (const r of rows) {
      const obj = {
        id: idxId >= 0 ? safeText(r[idxId]) : "",
        country: idxCountry >= 0 ? safeText(r[idxCountry]) : "",
        city: idxCity >= 0 ? safeText(r[idxCity]) : "",
        name: idxName >= 0 ? safeText(r[idxName]) : "",
        type: idxType >= 0 ? safeText(r[idxType]) : "",
        website: idxWebsite >= 0 ? safeText(r[idxWebsite]) : "",
        address: idxAddress >= 0 ? safeText(r[idxAddress]) : "",
        lat: idxLat >= 0 ? toNumberOrEmpty(r[idxLat]) : "",
        lng: idxLng >= 0 ? toNumberOrEmpty(r[idxLng]) : ""
      };

      // ignora linhas vazias
      if (!obj.name) continue;

      items.push(obj);
    }

    // validação leve: ids duplicados
    const seen = new Set();
    const dup = new Set();
    for (const it of items) {
      if (!it.id) continue;
      if (seen.has(it.id)) dup.add(it.id);
      seen.add(it.id);
    }
    if (dup.size) {
      console.warn("IDs repetidos:", Array.from(dup));
      setStatus(`Atenção: IDs repetidos (${Array.from(dup).slice(0, 5).join(", ")}${dup.size > 5 ? "…" : ""})`, "err");
    }

    return items;
  }

  async function generate() {
    try {
      setStatus("");
      const csvText = await fetchCSV();
      const data = csvToJSON(csvText);

      out.value = JSON.stringify(data, null, 2);
      setStatus(`OK: ${data.length} registos.`, "ok");
    } catch (e) {
      console.error(e);
      out.value = "[]";
      setStatus(`Erro: ${e.message}`, "err");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(out.value || "[]");
      setStatus("Copiado para a área de transferência.", "ok");
    } catch {
      setStatus("Não consegui copiar (browser bloqueou). Seleciona o texto e copia manualmente.", "err");
    }
  }

  function download() {
    const blob = new Blob([out.value || "[]"], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clubs.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    setStatus("Download gerado (clubs.json).", "ok");
  }

  btnGenerate?.addEventListener("click", generate);
  btnCopy?.addEventListener("click", copy);
  btnDownload?.addEventListener("click", download);
})();
