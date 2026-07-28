(() => {
  'use strict';

  const FIELD_ORDER = [
    'id',
    'country',
    'city',
    'name',
    'type',
    'website',
    'address',
    'address_on_request',
    'lat',
    'lng',
    'email',
    'phone',
    'open_time_monday',
    'open_time_tuesday',
    'open_time_wednesday',
    'open_time_thursday',
    'open_time_friday',
    'open_time_saturday',
    'open_time_sunday',
    'open_time_notes',
    'entry_policy',
    'singles_policy',
    'entry_notes',
    'pricing_model',
    'pricing_notes',
    'price_range',
    'price_couples_min',
    'price_couples_max',
    'price_currency',
    'smoking_policy',
    'parking_policy',
    'has_sauna',
    'has_pool',
    'has_darkroom',
    'has_private_rooms',
    'has_lockers',
    'has_bar',
    'has_outdoor_area',
    'has_dancefloor',
    'visited',
  ];

  const SUGGESTIONS = {
    country: 'countriesList',
    city: 'citiesList',
    type: 'typesList',
    entry_policy: 'entryPoliciesList',
    singles_policy: 'singlesPoliciesList',
    pricing_model: 'pricingModelsList',
    parking_policy: 'parkingPoliciesList',
    smoking_policy: 'smokingPoliciesList',
    price_currency: 'currenciesList',
  };

  const state = {
    records: [],
    selectedIndex: null,
    fileHandle: null,
    fileName: 'clubs.json',
    saveMode: 'download',
    rootKind: 'array',
    rootKey: null,
    rootObject: null,
    savedText: '',
    dirty: false,
    toastTimer: null,
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    startScreen: $('startScreen'),
    adminApp: $('adminApp'),
    startMessage: $('startMessage'),
    btnOpenJson: $('btnOpenJson'),
    fileInput: $('fileInput'),
    fileActions: $('fileActions'),
    btnChangeFile: $('btnChangeFile'),
    btnBackup: $('btnBackup'),
    btnSaveJson: $('btnSaveJson'),
    btnSaveBottom: $('btnSaveBottom'),
    fileName: $('fileName'),
    saveMode: $('saveMode'),
    recordsCount: $('recordsCount'),
    emptyRecordsNote: $('emptyRecordsNote'),
    btnCleanEmpty: $('btnCleanEmpty'),
    btnNewClub: $('btnNewClub'),
    recordSearch: $('recordSearch'),
    sortRecords: $('sortRecords'),
    recordsList: $('recordsList'),
    emptySelection: $('emptySelection'),
    clubForm: $('clubForm'),
    editorTitle: $('editorTitle'),
    editorLocation: $('editorLocation'),
    validationBanner: $('validationBanner'),
    btnDuplicate: $('btnDuplicate'),
    btnDelete: $('btnDelete'),
    toast: $('toast'),
  };

  const formControls = Array.from(els.clubForm.elements).filter((control) => control.name);

  function text(value) {
    return (value ?? '').toString().trim();
  }

  function isYes(value) {
    const normalized = text(value).toLowerCase();
    return ['yes', 'true', '1', 'sim', 'y'].includes(normalized);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return text(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function blankClub() {
    return {
      id: generateId(),
      country: '',
      city: '',
      name: '',
      type: 'club',
      website: '',
      address: '',
      address_on_request: 'FALSE',
      lat: '',
      lng: '',
      email: '',
      phone: '',
      open_time_monday: 'closed',
      open_time_tuesday: 'closed',
      open_time_wednesday: 'closed',
      open_time_thursday: 'closed',
      open_time_friday: 'closed',
      open_time_saturday: 'closed',
      open_time_sunday: 'closed',
      open_time_notes: '',
      entry_policy: '',
      singles_policy: '',
      entry_notes: '',
      pricing_model: '',
      pricing_notes: '',
      price_range: '',
      price_couples_min: '',
      price_couples_max: '',
      price_currency: 'EUR',
      smoking_policy: '',
      parking_policy: '',
      has_sauna: 'no',
      has_pool: 'no',
      has_darkroom: 'no',
      has_private_rooms: 'no',
      has_lockers: 'no',
      has_bar: 'no',
      has_outdoor_area: 'no',
      has_dancefloor: 'no',
      visited: 'no',
    };
  }

  function generateId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const used = new Set(state.records.map((record) => text(record.id).toUpperCase()));
    let id = '';

    do {
      id = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    } while (used.has(id));

    return id;
  }

  function normalizeRecordOrder(record) {
    const ordered = {};

    FIELD_ORDER.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        ordered[key] = record[key];
      }
    });

    Object.keys(record).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
        ordered[key] = record[key];
      }
    });

    return ordered;
  }

  function buildRootData() {
    const records = state.records.map(normalizeRecordOrder);

    if (state.rootKind === 'array') return records;

    const output = clone(state.rootObject || {});
    output[state.rootKey] = records;
    return output;
  }

  function serializeData() {
    return `${JSON.stringify(buildRootData(), null, 2)}\n`;
  }

  function setDirty(value = true) {
    state.dirty = value;
    const label = state.dirty ? 'Guardar JSON •' : 'Guardar JSON';
    els.btnSaveJson.textContent = label;
    els.btnSaveBottom.textContent = label;
    document.title = `${state.dirty ? '• ' : ''}SWTK — Editor de clubes`;
  }

  function showToast(message, type = 'success') {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('error', type === 'error');
    els.toast.classList.add('show');
    state.toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  function parseJson(source) {
    const data = JSON.parse(source);

    if (Array.isArray(data)) {
      return {
        records: data,
        rootKind: 'array',
        rootKey: null,
        rootObject: null,
      };
    }

    if (data && typeof data === 'object') {
      const rootKey = ['clubs', 'items'].find((key) => Array.isArray(data[key]));
      if (rootKey) {
        return {
          records: data[rootKey],
          rootKind: 'object',
          rootKey,
          rootObject: data,
        };
      }
    }

    throw new Error('O JSON não contém uma lista de clubes válida.');
  }

  function loadJson(source, fileName, fileHandle = null) {
    const parsed = parseJson(source);

    state.records = parsed.records.map((record) => (
      record && typeof record === 'object' && !Array.isArray(record) ? clone(record) : {}
    ));
    state.rootKind = parsed.rootKind;
    state.rootKey = parsed.rootKey;
    state.rootObject = parsed.rootObject ? clone(parsed.rootObject) : null;
    state.fileName = fileName || 'clubs.json';
    state.fileHandle = fileHandle;
    state.saveMode = fileHandle ? 'direct' : 'download';
    state.selectedIndex = null;
    state.savedText = serializeData();
    setDirty(false);

    els.startScreen.classList.add('is-hidden');
    els.adminApp.classList.remove('is-hidden');
    els.fileActions.classList.remove('is-hidden');
    els.fileName.textContent = state.fileName;
    els.saveMode.textContent = fileHandle ? 'gravação direta' : 'guarda por download';
    els.saveMode.classList.toggle('download', !fileHandle);
    els.recordSearch.value = '';
    els.validationBanner.classList.add('is-hidden');

    renderAll();

    const firstIndex = getVisibleRecordIndexes()[0];
    if (firstIndex !== undefined) selectRecord(firstIndex);

    showToast(`${countNamedRecords()} clubes carregados.`);
  }

  async function openWithPicker() {
    els.startMessage.textContent = '';

    if (!window.showOpenFilePicker) {
      els.fileInput.click();
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'Ficheiro JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const file = await handle.getFile();
      loadJson(await file.text(), file.name, handle);
    } catch (error) {
      if (error.name !== 'AbortError') {
        els.startMessage.textContent = `Não foi possível abrir o ficheiro: ${error.message}`;
      }
    }
  }

  async function openFromInput(event) {
    const [file] = event.target.files;
    if (!file) return;

    try {
      loadJson(await file.text(), file.name, null);
    } catch (error) {
      els.startMessage.textContent = `Não foi possível abrir o ficheiro: ${error.message}`;
    } finally {
      event.target.value = '';
    }
  }

  function getNamedRecordIndexes() {
    return state.records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => text(record.name))
      .map(({ index }) => index);
  }

  function getEmptyRecordIndexes() {
    return state.records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => !text(record.name))
      .map(({ index }) => index);
  }

  function countNamedRecords() {
    return getNamedRecordIndexes().length;
  }

  function getVisibleRecordIndexes() {
    const query = text(els.recordSearch.value).toLocaleLowerCase('pt');
    const indexes = getNamedRecordIndexes().filter((index) => {
      const record = state.records[index];
      const haystack = [
        record.name,
        record.city,
        record.country,
        record.type,
        record.id,
      ].map(text).join(' ').toLocaleLowerCase('pt');
      return !query || haystack.includes(query);
    });

    if (els.sortRecords.value === 'original') return indexes;

    const collator = new Intl.Collator('pt', { sensitivity: 'base', numeric: true });
    indexes.sort((a, b) => {
      const left = state.records[a];
      const right = state.records[b];

      if (els.sortRecords.value === 'country') {
        const countryCompare = collator.compare(text(left.country), text(right.country));
        if (countryCompare) return countryCompare;

        const cityCompare = collator.compare(text(left.city), text(right.city));
        if (cityCompare) return cityCompare;
      }

      return collator.compare(text(left.name), text(right.name));
    });

    return indexes;
  }

  function renderAll() {
    renderSummary();
    renderList();
    renderSuggestions();
    renderSelectedHeader();
  }

  function renderSummary() {
    const namedCount = countNamedRecords();
    const emptyCount = getEmptyRecordIndexes().length;

    els.recordsCount.textContent = `${namedCount} ${namedCount === 1 ? 'clube' : 'clubes'}`;
    els.emptyRecordsNote.textContent = emptyCount
      ? `${emptyCount} registos vazios continuam guardados no JSON.`
      : 'O JSON não contém registos vazios.';
    els.btnCleanEmpty.disabled = emptyCount === 0;
  }

  function renderList() {
    const indexes = getVisibleRecordIndexes();

    if (!indexes.length) {
      els.recordsList.innerHTML = `
        <div class="no-results">
          ${countNamedRecords() ? 'Nenhum clube corresponde à pesquisa.' : 'Ainda não existem clubes preenchidos.'}
        </div>
      `;
      return;
    }

    els.recordsList.innerHTML = indexes.map((index) => {
      const record = state.records[index];
      const meta = [text(record.city), text(record.country)].filter(Boolean).join(' · ') || 'Localização por preencher';
      const active = index === state.selectedIndex;
      return `
        <button
          class="record-button${active ? ' active' : ''}"
          type="button"
          role="option"
          aria-selected="${active}"
          data-record-index="${index}"
        >
          <span class="record-name">${escapeHtml(record.name)}</span>
          <span class="record-meta">${escapeHtml(meta)}</span>
        </button>
      `;
    }).join('');
  }

  function renderSuggestions() {
    Object.entries(SUGGESTIONS).forEach(([fieldName, listId]) => {
      const values = Array.from(new Set(
        state.records.map((record) => text(record[fieldName])).filter(Boolean),
      )).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));

      $(listId).innerHTML = values
        .map((value) => `<option value="${escapeHtml(value)}"></option>`)
        .join('');
    });
  }

  function renderSelectedHeader() {
    if (state.selectedIndex === null || !state.records[state.selectedIndex]) return;

    const record = state.records[state.selectedIndex];
    els.editorTitle.textContent = text(record.name) || 'Novo clube';
    els.editorLocation.textContent = [text(record.city), text(record.country)].filter(Boolean).join(', ');
  }

  function selectRecord(index) {
    if (!state.records[index]) return;

    state.selectedIndex = index;
    const record = state.records[index];

    formControls.forEach((control) => {
      const value = record[control.name];

      if (control.type === 'checkbox') {
        control.checked = isYes(value);
      } else {
        control.value = value ?? '';
      }

      control.classList.remove('invalid');
    });

    els.emptySelection.classList.add('is-hidden');
    els.clubForm.classList.remove('is-hidden');
    els.validationBanner.classList.add('is-hidden');
    renderList();
    renderSelectedHeader();
  }

  function valueFromControl(control) {
    if (control.type === 'checkbox') {
      return control.dataset.boolean === 'true-false'
        ? (control.checked ? 'TRUE' : 'FALSE')
        : (control.checked ? 'yes' : 'no');
    }

    if (control.name === 'lat' || control.name === 'lng') {
      const value = control.value.trim();
      if (!value) return '';
      const number = Number(value);
      return Number.isFinite(number) ? number : value;
    }

    return control.value;
  }

  function onFormInput(event) {
    const control = event.target;
    if (!control.name || state.selectedIndex === null) return;

    state.records[state.selectedIndex][control.name] = valueFromControl(control);
    control.classList.remove('invalid');
    els.validationBanner.classList.add('is-hidden');
    setDirty(serializeData() !== state.savedText);
    renderSummary();
    renderList();
    renderSelectedHeader();

    if (Object.prototype.hasOwnProperty.call(SUGGESTIONS, control.name)) {
      renderSuggestions();
    }
  }

  function validateRecords() {
    const errors = [];
    const usedIds = new Map();

    state.records.forEach((record, index) => {
      if (!text(record.name)) return;

      const id = text(record.id).toUpperCase();
      if (!id) {
        errors.push({ index, field: 'id', message: `${record.name}: falta o ID.` });
      } else if (usedIds.has(id)) {
        errors.push({
          index,
          field: 'id',
          message: `O ID “${id}” está repetido em ${record.name} e ${state.records[usedIds.get(id)].name}.`,
        });
      } else {
        usedIds.set(id, index);
      }

      if (!text(record.country)) {
        errors.push({ index, field: 'country', message: `${record.name}: falta o país.` });
      }

      if (!text(record.city)) {
        errors.push({ index, field: 'city', message: `${record.name}: falta a cidade.` });
      }

      const lat = text(record.lat);
      const lng = text(record.lng);
      if (lat && (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90)) {
        errors.push({ index, field: 'lat', message: `${record.name}: latitude inválida.` });
      }
      if (lng && (!Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)) {
        errors.push({ index, field: 'lng', message: `${record.name}: longitude inválida.` });
      }
    });

    return errors;
  }

  function showValidationErrors(errors) {
    const first = errors[0];
    selectRecord(first.index);

    const control = formControls.find((item) => item.name === first.field);
    if (control) {
      control.classList.add('invalid');
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => control.focus(), 250);
    }

    els.validationBanner.innerHTML = `
      <strong>Corrige antes de guardar:</strong><br />
      ${errors.slice(0, 4).map((error) => escapeHtml(error.message)).join('<br />')}
      ${errors.length > 4 ? `<br />… e mais ${errors.length - 4}.` : ''}
    `;
    els.validationBanner.classList.remove('is-hidden');
    showToast('Existem campos obrigatórios ou valores inválidos.', 'error');
  }

  async function saveJson() {
    const errors = validateRecords();
    if (errors.length) {
      showValidationErrors(errors);
      return;
    }

    const source = serializeData();

    try {
      if (state.fileHandle) {
        const writable = await state.fileHandle.createWritable();
        await writable.write(source);
        await writable.close();
      } else if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: state.fileName || 'clubs.json',
          types: [{
            description: 'Ficheiro JSON',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(source);
        await writable.close();
        state.fileHandle = handle;
        state.fileName = handle.name;
        state.saveMode = 'direct';
        els.fileName.textContent = handle.name;
        els.saveMode.textContent = 'gravação direta';
        els.saveMode.classList.remove('download');
      } else {
        downloadText(source, state.fileName || 'clubs.json');
      }

      state.savedText = source;
      setDirty(false);
      showToast(
        state.fileHandle
          ? `${state.fileName} guardado com sucesso.`
          : 'Novo clubs.json descarregado.',
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        showToast(`Não foi possível guardar: ${error.message}`, 'error');
      }
    }
  }

  function downloadText(source, fileName) {
    const blob = new Blob([source], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBackup() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '-',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');
    downloadText(serializeData(), `clubs-backup-${stamp}.json`);
    showToast('Cópia de segurança criada.');
  }

  function newClub() {
    const record = blankClub();
    state.records.push(record);
    state.selectedIndex = state.records.length - 1;
    els.recordSearch.value = '';
    setDirty(true);
    renderAll();
    selectRecord(state.selectedIndex);

    const nameInput = formControls.find((control) => control.name === 'name');
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => nameInput.focus(), 250);
  }

  function duplicateClub() {
    if (state.selectedIndex === null) return;

    const record = clone(state.records[state.selectedIndex]);
    record.id = generateId();
    record.name = `${text(record.name) || 'Novo clube'} — cópia`;
    state.records.push(normalizeRecordOrder(record));
    state.selectedIndex = state.records.length - 1;
    els.recordSearch.value = '';
    setDirty(true);
    renderAll();
    selectRecord(state.selectedIndex);
    showToast('Clube duplicado. Altera o nome e os dados necessários.');
  }

  function deleteClub() {
    if (state.selectedIndex === null) return;

    const record = state.records[state.selectedIndex];
    const label = text(record.name) || `registo ${text(record.id)}`;
    if (!window.confirm(`Apagar “${label}” do JSON?`)) return;

    const deletedIndex = state.selectedIndex;
    state.records.splice(deletedIndex, 1);
    state.selectedIndex = null;
    setDirty(true);
    renderAll();

    const nextIndex = getVisibleRecordIndexes().find((index) => index >= Math.max(0, deletedIndex - 1))
      ?? getVisibleRecordIndexes().at(-1);

    if (nextIndex !== undefined) {
      selectRecord(nextIndex);
    } else {
      els.clubForm.classList.add('is-hidden');
      els.emptySelection.classList.remove('is-hidden');
    }

    showToast(`${label} apagado.`);
  }

  function cleanEmptyRecords() {
    const emptyIndexes = getEmptyRecordIndexes();
    if (!emptyIndexes.length) return;

    const message = `Remover definitivamente ${emptyIndexes.length} registos vazios do JSON?`;
    if (!window.confirm(message)) return;

    const selectedRecord = state.selectedIndex === null ? null : state.records[state.selectedIndex];
    state.records = state.records.filter((record) => text(record.name));
    state.selectedIndex = selectedRecord ? state.records.indexOf(selectedRecord) : null;
    setDirty(true);
    renderAll();

    if (state.selectedIndex !== null && state.selectedIndex >= 0) {
      selectRecord(state.selectedIndex);
    } else {
      const firstIndex = getVisibleRecordIndexes()[0];
      if (firstIndex !== undefined) selectRecord(firstIndex);
    }

    showToast(`${emptyIndexes.length} registos vazios removidos.`);
  }

  function changeFile() {
    if (state.dirty && !window.confirm('Existem alterações por guardar. Queres trocar de ficheiro sem as guardar?')) {
      return;
    }
    openWithPicker();
  }

  function wireEvents() {
    els.btnOpenJson.addEventListener('click', openWithPicker);
    els.fileInput.addEventListener('change', openFromInput);
    els.btnChangeFile.addEventListener('click', changeFile);
    els.btnBackup.addEventListener('click', downloadBackup);
    els.btnSaveJson.addEventListener('click', saveJson);
    els.btnSaveBottom.addEventListener('click', saveJson);
    els.btnNewClub.addEventListener('click', newClub);
    els.btnDuplicate.addEventListener('click', duplicateClub);
    els.btnDelete.addEventListener('click', deleteClub);
    els.btnCleanEmpty.addEventListener('click', cleanEmptyRecords);

    els.recordSearch.addEventListener('input', renderList);
    els.sortRecords.addEventListener('change', renderList);

    els.recordsList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-record-index]');
      if (!button) return;
      selectRecord(Number(button.dataset.recordIndex));
    });

    els.clubForm.addEventListener('input', onFormInput);
    els.clubForm.addEventListener('change', onFormInput);

    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!els.adminApp.classList.contains('is-hidden')) saveJson();
      }
    });

    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  wireEvents();

  if (!window.showOpenFilePicker) {
    els.btnOpenJson.textContent = 'Importar clubs.json';
  }
})();
