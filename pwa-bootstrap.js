(() => {
  'use strict';
  const CURRENT_VERSION = 'V150-PWA-1.0.1';
  const MAP_PACKAGE_KEY = 'TBA110_TEMPLATE_REPORT_PACKAGE_V136';
  const MAP_REGISTRY_KEY = 'TBA110_TEMPLATE_REPORT_REGISTRY_V142';
  let deferredInstallPrompt = null;
  let registration = null;
  let reloadOnControllerChange = false;
  let lastReportConfig = null;
  let lastMapSource = '';
  let lastSelectionKey = '';
  let scanPromise = null;

  const $ = id => document.getElementById(id);
  const text = value => value == null ? '' : String(value).trim();
  const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const setStatus = (message, kind = 'info') => {
    const el = $('scadaPwaStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  };
  const setMapStatus = (message, kind = 'info') => {
    const el = $('scadaPwaMapStatus');
    if (el) {
      el.textContent = message;
      el.dataset.kind = kind;
    }
    try {
      if (typeof window.log === 'function') window.log('[PWA MAP] ' + message);
    } catch (_) {}
  };

  function injectPanel() {
    if ($('scadaPwaPanel')) return;
    const style = document.createElement('style');
    style.textContent = `
      #scadaPwaPanel{position:fixed;right:12px;bottom:12px;z-index:2147483000;background:#fff;border:1px solid #b8d6d2;border-radius:12px;box-shadow:0 10px 32px #0f172a33;padding:8px;max-width:430px;font:12px Arial,sans-serif;color:#0f172a}
      #scadaPwaPanel .pwa-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
      #scadaPwaPanel button,#scadaPwaPanel a.pwa-button{border:0;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer;background:#0f766e;color:#fff;text-decoration:none;display:inline-block}
      #scadaPwaPanel button.secondary,#scadaPwaPanel a.secondary{background:#e2e8f0;color:#0f172a}
      #scadaPwaPanel button[hidden]{display:none}
      #scadaPwaStatus,#scadaPwaMapStatus{margin-top:6px;line-height:1.35;color:#475569}
      #scadaPwaStatus[data-kind="ok"],#scadaPwaMapStatus[data-kind="ok"]{color:#047857}
      #scadaPwaStatus[data-kind="warn"],#scadaPwaMapStatus[data-kind="warn"]{color:#b45309}
      #scadaPwaStatus[data-kind="error"],#scadaPwaMapStatus[data-kind="error"]{color:#b91c1c}
      #scadaPwaPanel.pwa-collapsed .pwa-detail{display:none}
      @media(max-width:700px){#scadaPwaPanel{left:8px;right:8px;bottom:8px;max-width:none}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'scadaPwaPanel';
    panel.innerHTML = `
      <div class="pwa-row">
        <strong>SCADA PWA</strong>
        <span>${CURRENT_VERSION}</span>
        <button id="scadaPwaInstall" hidden>Cài ứng dụng</button>
        <button id="scadaPwaUpdate">Kiểm tra cập nhật</button>
        <button id="scadaPwaCollapse" class="secondary" title="Thu gọn">−</button>
      </div>
      <div class="pwa-detail">
        <div class="pwa-row" style="margin-top:6px">
          <button id="scadaPwaRestoreMaps">Khôi phục map từ gói đã chọn</button>
          <a class="pwa-button secondary" href="./CAP_NHAT_PWA.html">Làm mới cache PWA</a>
        </div>
        <div id="scadaPwaStatus">Đang khởi tạo PWA...</div>
        <div id="scadaPwaMapStatus">Map báo cáo: chưa quét gói cấu hình.</div>
      </div>`;
    document.body.appendChild(panel);

    $('scadaPwaCollapse').addEventListener('click', () => {
      panel.classList.toggle('pwa-collapsed');
      $('scadaPwaCollapse').textContent = panel.classList.contains('pwa-collapsed') ? '+' : '−';
    });
    $('scadaPwaInstall').addEventListener('click', installApp);
    $('scadaPwaUpdate').addEventListener('click', checkForUpdate);
    $('scadaPwaRestoreMaps').addEventListener('click', async () => {
      try {
        const result = await scanSelectedConfigMaps(true);
        if (!result) setMapStatus('Không tìm thấy map trong các file đang chọn. Hãy chọn gói JSON/XLSX có reportTemplateMaps.', 'warn');
      } catch (error) {
        setMapStatus('Lỗi khôi phục map: ' + error.message, 'error');
      }
    });
  }

  function reportMapStats(config) {
    const result = {templates: 0, mappedTemplates: 0, mappedEntries: 0, customTemplates: 0};
    const templates = config && Array.isArray(config.templates) ? config.templates : [];
    result.templates = templates.length;
    for (const template of templates) {
      if (Number(template && template.type) === 4) result.customTemplates++;
      const mapping = template && template.mapping && typeof template.mapping === 'object' ? template.mapping : {};
      let entries = 0;
      for (const [key, value] of Object.entries(mapping)) {
        if (key === '__customDraftUpdatedAt') continue;
        if (key === '__customCells' || key === '__customTables') {
          if (Array.isArray(value)) entries += value.filter(item => item && item.enabled !== false).length;
          continue;
        }
        if (value && typeof value === 'object') {
          if (text(value.source) || text(value.fixed)) entries++;
          else if (Array.isArray(value.terms)) entries += value.terms.filter(item => item && text(item.source)).length;
        } else if (value !== '' && value != null) entries++;
      }
      if (entries) {
        result.mappedTemplates++;
        result.mappedEntries += entries;
      }
    }
    return result;
  }

  function extractReportConfigFromJson(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw.data && typeof raw.data === 'object' ? raw.data : {};
    const config = data.reportTemplateMaps || raw.reportTemplateMaps || raw.templateReportConfig ||
      ((raw.packageType === 'TBA110K_TEMPLATE_REPORT_CONFIG' && Array.isArray(raw.templates)) ? raw : null);
    return config && Array.isArray(config.templates) ? config : null;
  }

  function workbookRows(workbook, names) {
    if (!workbook || !window.XLSX) return [];
    const targetNames = names.map(normalize);
    const sheetName = (workbook.SheetNames || []).find(name => targetNames.includes(normalize(name)));
    if (!sheetName) return [];
    return window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {defval: '', raw: false});
  }

  function reportConfigFromJsonRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    try {
      const json = rows.slice().sort((a, b) => (Number(a.part) || 0) - (Number(b.part) || 0)).map(row => text(row.jsonChunk)).join('');
      const config = JSON.parse(json);
      return config && Array.isArray(config.templates) ? config : null;
    } catch (_) {
      return null;
    }
  }

  function reportConfigFromFlatRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    const groups = new Map();
    rows.forEach((row, index) => {
      const key = text(row.templateIndex) || text(row.signature) || text(row.fileName) || String(index + 1);
      if (!groups.has(key)) groups.set(key, {
        fileName: text(row.fileName), type: Number(row.type) || 0, typeName: text(row.typeName), unit: text(row.unit),
        signature: text(row.signature), structureKey: text(row.structureKey), mapping: {}, targets: []
      });
      const template = groups.get(key);
      const id = text(row.targetId);
      if (!id) return;
      template.targets.push({
        id, label: text(row.targetLabel),
        row: row.targetRow === '' || row.targetRow == null ? null : Number(row.targetRow),
        col: row.targetCol === '' || row.targetCol == null ? null : Number(row.targetCol),
        mode: text(row.targetMode)
      });
      if (text(row.mappingJson)) {
        try { template.mapping[id] = JSON.parse(row.mappingJson); }
        catch (_) { template.mapping[id] = text(row.mappingJson); }
      }
    });
    return groups.size ? {
      packageType: 'TBA110K_TEMPLATE_REPORT_CONFIG', configVersion: 'V150-PWA-1.0.1',
      createdAt: new Date().toISOString(), templateCount: groups.size, templates: [...groups.values()]
    } : null;
  }

  async function extractReportConfigFromFile(file) {
    const name = text(file && file.name).toLowerCase();
    if (!file) return null;
    if (name.endsWith('.json')) {
      return extractReportConfigFromJson(JSON.parse(await file.text()));
    }
    if (!/\.(xlsx|xlsm|xlsb|xls)$/i.test(name) || !window.XLSX) return null;
    const workbook = window.XLSX.read(await file.arrayBuffer(), {type: 'array', cellDates: false, raw: false});
    const jsonConfig = reportConfigFromJsonRows(workbookRows(workbook, ['CFG_REPORT_JSON']));
    if (jsonConfig) return jsonConfig;
    return reportConfigFromFlatRows(workbookRows(workbook, ['CFG_REPORT_TEMPLATE', 'CFG_TEMPLATE_MAP']));
  }

  async function applyReportConfig(config, sourceName) {
    if (!config || !Array.isArray(config.templates) || !config.templates.length) return null;
    lastReportConfig = JSON.parse(JSON.stringify(config));
    lastMapSource = sourceName || 'gói cấu hình';
    try {
      localStorage.setItem(MAP_PACKAGE_KEY, JSON.stringify(lastReportConfig));
      localStorage.setItem(MAP_REGISTRY_KEY, JSON.stringify(lastReportConfig));
    } catch (error) {
      setMapStatus('Không lưu được map vào bộ nhớ trình duyệt: ' + error.message, 'warn');
    }
    let result = {applied: 0, pending: true, total: lastReportConfig.templates.length};
    if (typeof window.applyTemplateReportConfig136 === 'function') {
      result = window.applyTemplateReportConfig136(lastReportConfig) || result;
    } else {
      window.__templateReportConfig136 = lastReportConfig;
    }
    const stats = reportMapStats(lastReportConfig);
    const appliedText = Number(result.applied) ? ' · áp ngay ' + result.applied + ' mẫu' : ' · lưu chờ nạp mẫu';
    setMapStatus('Đã nhận ' + stats.templates + ' cấu hình mẫu, ' + stats.mappedTemplates + ' mẫu có map, ' + stats.mappedEntries + ' điểm gán, ' + stats.customTemplates + ' mẫu tùy chỉnh từ ' + lastMapSource + appliedText + '.', stats.mappedEntries ? 'ok' : 'warn');
    return {config: lastReportConfig, stats, result};
  }

  function selectedFilesKey(files) {
    return files.map(file => [file.name, file.size, file.lastModified].join(':')).sort().join('|');
  }

  async function scanSelectedConfigMaps(force = false) {
    const input = $('fileInput');
    const files = input && input.files ? [...input.files] : [];
    if (!files.length) return null;
    const key = selectedFilesKey(files);
    if (!force && key === lastSelectionKey && lastReportConfig) return {config: lastReportConfig, stats: reportMapStats(lastReportConfig)};
    if (scanPromise) return scanPromise;
    scanPromise = (async () => {
      const candidates = files.filter(file => /\.json$/i.test(file.name) || (/cau.?hinh|config|goi|package/i.test(normalize(file.name)) && /\.(xlsx|xlsm|xlsb|xls)$/i.test(file.name)));
      const found = [];
      for (const file of candidates) {
        try {
          const config = await extractReportConfigFromFile(file);
          if (config) found.push({file, config, stats: reportMapStats(config)});
        } catch (error) {
          console.warn('PWA map bridge không đọc được ' + file.name, error);
        }
      }
      lastSelectionKey = key;
      if (!found.length) return null;
      found.sort((a, b) => b.stats.mappedEntries - a.stats.mappedEntries || b.stats.mappedTemplates - a.stats.mappedTemplates || b.stats.templates - a.stats.templates);
      return applyReportConfig(found[0].config, found[0].file.name);
    })();
    try { return await scanPromise; }
    finally { scanPromise = null; }
  }

  async function reapplyAfterTemplateLoad(expectedCount) {
    if (!lastReportConfig) return;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      let count = 0;
      try {
        const summary = typeof window.getLoadedTemplateReportSummary136 === 'function' ? window.getLoadedTemplateReportSummary136() : null;
        count = Number(summary && summary.count) || 0;
      } catch (_) {}
      if (count && (!expectedCount || count >= expectedCount)) {
        await applyReportConfig(lastReportConfig, lastMapSource || 'gói đã lưu');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    setMapStatus('Đã lưu map nhưng chưa xác nhận được quá trình nạp mẫu hoàn tất.', 'warn');
  }

  function installMapBridge() {
    const genericInput = $('fileInput');
    if (genericInput && !genericInput.dataset.pwaMapBridge) {
      genericInput.dataset.pwaMapBridge = '1';
      genericInput.addEventListener('change', () => {
        scanSelectedConfigMaps(true).catch(error => setMapStatus('Lỗi đọc map: ' + error.message, 'error'));
      });
    }
    const templateInput = $('tplFiles121');
    if (templateInput && !templateInput.dataset.pwaMapBridge) {
      templateInput.dataset.pwaMapBridge = '1';
      templateInput.addEventListener('change', () => {
        const count = templateInput.files ? templateInput.files.length : 0;
        reapplyAfterTemplateLoad(count);
      });
    }
    const templateLoad = $('tplLoad121');
    if (templateLoad && !templateLoad.dataset.pwaMapBridge) {
      templateLoad.dataset.pwaMapBridge = '1';
      templateLoad.addEventListener('click', () => {
        const count = templateInput && templateInput.files ? templateInput.files.length : 0;
        reapplyAfterTemplateLoad(count);
      });
    }
    const mapInput = $('tplImportMap121');
    if (mapInput && !mapInput.dataset.pwaMapBridge) {
      mapInput.dataset.pwaMapBridge = '1';
      mapInput.addEventListener('change', async () => {
        const file = mapInput.files && mapInput.files[0];
        if (!file) return;
        try {
          const config = await extractReportConfigFromFile(file);
          if (config) await applyReportConfig(config, file.name);
        } catch (error) {
          setMapStatus('Không đọc được map từ ' + file.name + ': ' + error.message, 'error');
        }
      }, true);
    }
  }

  function wrapDynamicFunctions() {
    const loadFiles = window.loadFiles;
    if (typeof loadFiles === 'function' && !loadFiles.__pwaMapBridgeWrapped) {
      const wrapped = async function() {
        try { await scanSelectedConfigMaps(false); } catch (error) { setMapStatus('Không quét được map trước khi nạp: ' + error.message, 'warn'); }
        return loadFiles.apply(this, arguments);
      };
      wrapped.__pwaMapBridgeWrapped = true;
      wrapped.__pwaMapBridgeOriginal = loadFiles;
      window.loadFiles = wrapped;
    }
    const loadTemplates = window.loadTemplateReportFiles136;
    if (typeof loadTemplates === 'function' && !loadTemplates.__pwaMapBridgeWrapped) {
      const wrapped = async function(files) {
        const result = await loadTemplates.apply(this, arguments);
        if (lastReportConfig) await applyReportConfig(lastReportConfig, lastMapSource || 'gói đã lưu');
        return result;
      };
      wrapped.__pwaMapBridgeWrapped = true;
      wrapped.__pwaMapBridgeOriginal = loadTemplates;
      window.loadTemplateReportFiles136 = wrapped;
    }
  }

  function restoreStoredConfig() {
    try {
      const stored = JSON.parse(localStorage.getItem(MAP_PACKAGE_KEY) || localStorage.getItem(MAP_REGISTRY_KEY) || 'null');
      if (stored && Array.isArray(stored.templates) && stored.templates.length) {
        lastReportConfig = stored;
        lastMapSource = 'bộ nhớ PWA';
        const stats = reportMapStats(stored);
        setMapStatus('Bộ nhớ PWA có ' + stats.templates + ' cấu hình mẫu, ' + stats.mappedTemplates + ' mẫu có map, ' + stats.mappedEntries + ' điểm gán.', stats.mappedEntries ? 'ok' : 'warn');
      }
    } catch (_) {}
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      setStatus('Trình duyệt chưa cấp yêu cầu cài đặt. Mở bằng Edge/Chrome qua HTTPS hoặc localhost rồi thử lại.', 'warn');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $('scadaPwaInstall').hidden = true;
    setStatus(choice.outcome === 'accepted' ? 'Đã chấp nhận cài PWA.' : 'Đã hủy cài PWA.', choice.outcome === 'accepted' ? 'ok' : 'warn');
  }

  async function readServerVersion() {
    const response = await fetch('./version.json?t=' + Date.now(), {cache: 'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  async function checkForUpdate() {
    if (!registration) {
      setStatus('Service worker chưa sẵn sàng.', 'warn');
      return;
    }
    setStatus('Đang kiểm tra phiên bản mới...');
    try {
      const serverInfo = await readServerVersion();
      await registration.update();
      const waiting = registration.waiting;
      if (waiting) {
        reloadOnControllerChange = true;
        waiting.postMessage({type: 'SKIP_WAITING'});
        setStatus('Đang kích hoạt ' + (serverInfo.version || 'phiên bản mới') + '...', 'ok');
        return;
      }
      if (serverInfo.version && serverInfo.version !== CURRENT_VERSION) {
        setStatus('Đã tìm thấy ' + serverInfo.version + '. Hãy tải lại trang sau khi service worker cài xong.', 'warn');
      } else {
        setStatus('Đang dùng phiên bản mới nhất: ' + CURRENT_VERSION + '.', 'ok');
      }
    } catch (error) {
      setStatus('Không kiểm tra được cập nhật: ' + error.message, 'error');
    }
  }

  async function registerPwa() {
    injectPanel();
    restoreStoredConfig();
    installMapBridge();
    wrapDynamicFunctions();
    setInterval(() => { installMapBridge(); wrapDynamicFunctions(); }, 1200);
    if (location.protocol === 'file:') {
      setStatus('PWA không hoạt động bằng file://. Chạy CHAY_PWA.cmd hoặc triển khai lên HTTPS.', 'warn');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      setStatus('Trình duyệt không hỗ trợ service worker.', 'error');
      return;
    }
    try {
      registration = await navigator.serviceWorker.register('./sw.js?v=1.0.1', {scope: './', updateViaCache: 'none'});
      await navigator.serviceWorker.ready;
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      setStatus(standalone ? 'Đang chạy dưới dạng ứng dụng · ' + CURRENT_VERSION : 'Đã sẵn sàng ngoại tuyến · ' + CURRENT_VERSION, 'ok');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setStatus('Có phiên bản mới. Bấm “Kiểm tra cập nhật” để kích hoạt.', 'warn');
        });
      });
    } catch (error) {
      setStatus('Không đăng ký được PWA: ' + error.message, 'error');
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const button = $('scadaPwaInstall');
    if (button) button.hidden = false;
    setStatus('Có thể cài SCADA Report Studio lên máy.', 'ok');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const button = $('scadaPwaInstall');
    if (button) button.hidden = true;
    setStatus('Đã cài SCADA Report Studio.', 'ok');
  });
  window.addEventListener('online', () => setStatus('Đã kết nối mạng · ' + CURRENT_VERSION, 'ok'));
  window.addEventListener('offline', () => setStatus('Đang chạy ngoại tuyến · ' + CURRENT_VERSION, 'warn'));
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnControllerChange) location.reload();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', registerPwa);
  else registerPwa();
})();
