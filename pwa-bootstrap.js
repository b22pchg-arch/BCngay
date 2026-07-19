(() => {
  'use strict';
  const CURRENT_VERSION = "V150-PWA-1.0.0";
  let deferredInstallPrompt = null;
  let registration = null;
  let reloadOnControllerChange = false;

  const $ = id => document.getElementById(id);
  const setStatus = (message, kind = 'info') => {
    const el = $('scadaPwaStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  };

  function injectPanel() {
    if ($('scadaPwaPanel')) return;
    const style = document.createElement('style');
    style.textContent = `
      #scadaPwaPanel{position:fixed;right:12px;bottom:12px;z-index:2147483000;background:#fff;border:1px solid #b8d6d2;border-radius:12px;box-shadow:0 10px 32px #0f172a33;padding:8px;max-width:360px;font:12px Arial,sans-serif;color:#0f172a}
      #scadaPwaPanel .pwa-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
      #scadaPwaPanel button{border:0;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer;background:#0f766e;color:#fff}
      #scadaPwaPanel button.secondary{background:#e2e8f0;color:#0f172a}
      #scadaPwaPanel button[hidden]{display:none}
      #scadaPwaStatus{margin-top:6px;line-height:1.35;color:#475569}
      #scadaPwaStatus[data-kind="ok"]{color:#047857}
      #scadaPwaStatus[data-kind="warn"]{color:#b45309}
      #scadaPwaStatus[data-kind="error"]{color:#b91c1c}
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
        <div id="scadaPwaStatus">Đang khởi tạo PWA...</div>
      </div>`;
    document.body.appendChild(panel);

    $('scadaPwaCollapse').addEventListener('click', () => {
      panel.classList.toggle('pwa-collapsed');
      $('scadaPwaCollapse').textContent = panel.classList.contains('pwa-collapsed') ? '+' : '−';
    });
    $('scadaPwaInstall').addEventListener('click', installApp);
    $('scadaPwaUpdate').addEventListener('click', checkForUpdate);
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      setStatus('Trình duyệt chưa cấp yêu cầu cài đặt. Mở bằng Edge/Chrome qua localhost rồi thử lại.', 'warn');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $('scadaPwaInstall').hidden = true;
    setStatus(choice.outcome === 'accepted' ? 'Đã chấp nhận cài PWA.' : 'Đã hủy cài PWA.', choice.outcome === 'accepted' ? 'ok' : 'warn');
  }

  async function readServerVersion() {
    const response = await fetch(`./version.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        waiting.postMessage({type:'SKIP_WAITING'});
        setStatus(`Đang kích hoạt ${serverInfo.version || 'phiên bản mới'}...`, 'ok');
        return;
      }
      if (serverInfo.version && serverInfo.version !== CURRENT_VERSION) {
        setStatus(`Đã tìm thấy ${serverInfo.version}. Hãy tải lại trang sau khi service worker cài xong.`, 'warn');
      } else {
        setStatus(`Đang dùng phiên bản mới nhất: ${CURRENT_VERSION}.`, 'ok');
      }
    } catch (error) {
      setStatus(`Không kiểm tra được cập nhật: ${error.message}`, 'error');
    }
  }

  async function registerPwa() {
    injectPanel();
    if (location.protocol === 'file:') {
      setStatus('PWA không hoạt động bằng file://. Chạy CHAY_PWA.cmd rồi mở địa chỉ localhost.', 'warn');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      setStatus('Trình duyệt không hỗ trợ service worker.', 'error');
      return;
    }
    try {
      registration = await navigator.serviceWorker.register('./sw.js', {scope:'./'});
      await navigator.serviceWorker.ready;
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      setStatus(standalone ? `Đang chạy dưới dạng ứng dụng · ${CURRENT_VERSION}` : `Đã sẵn sàng ngoại tuyến · ${CURRENT_VERSION}`, 'ok');

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setStatus('Có phiên bản mới. Bấm “Kiểm tra cập nhật” để kích hoạt.', 'warn');
          }
        });
      });
    } catch (error) {
      setStatus(`Không đăng ký được PWA: ${error.message}`, 'error');
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

  window.addEventListener('online', () => setStatus(`Đã kết nối mạng · ${CURRENT_VERSION}`, 'ok'));
  window.addEventListener('offline', () => setStatus(`Đang chạy ngoại tuyến · ${CURRENT_VERSION}`, 'warn'));

  navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnControllerChange) location.reload();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', registerPwa);
  else registerPwa();
})();
