// Inject custom titlebar buttons when running inside Electron.
// In a regular browser, this script does nothing.
(function () {
  // Detect Electron: check electronAPI (from preload), or userAgent, or process.versions
  var isElectron = !!window.electronAPI ||
                   (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().indexOf(" electron/") >= 0);
  if (!isElectron) return;

  const css = `
    /* Map view topbar — draggable */
    .topbar { -webkit-app-region: drag; }
    .topbar button, .topbar .progress, .topbar a,
    .topbar .user-menu, .topbar .window-controls { -webkit-app-region: no-drag; }

    /* Detail view header — also draggable */
    .detail-header { -webkit-app-region: drag; }
    .detail-header button, .detail-header .chip,
    .detail-header .videogen-toggle,
    .detail-header .window-controls { -webkit-app-region: no-drag; }

    /* Login page — brand panel is draggable */
    .login-brand { -webkit-app-region: drag; }
    .login-brand img, .login-brand .window-controls { -webkit-app-region: no-drag; }
    /* Form panel not draggable (inputs need interaction) */
    .login-form-panel { -webkit-app-region: no-drag; }

    /* Window control buttons — polished Windows 11 style */
    .window-controls {
      -webkit-app-region: no-drag;
      display: flex; gap: 0; align-items: center;
      flex: none; height: 36px;
    }
    .window-controls button {
      width: 40px; height: 36px;
      border: none; cursor: default; padding: 0;
      display: flex; align-items: center; justify-content: center;
      background: transparent;
      transition: background .12s ease;
    }
    .window-controls button:hover { background: rgba(0,0,0,.07); }
    .window-controls button:active { background: rgba(0,0,0,.14); }
    .window-controls .wc-close:hover { background: #c42b1c; }
    .window-controls .wc-close:hover svg { stroke: #fff; }
    .window-controls svg {
      width: 12px; height: 12px;
      pointer-events: none;
    }

    /* On map topbar, place controls at the right edge */
    .topbar .window-controls { margin-left: auto; order: 99; }
    /* On detail header, also at right */
    .detail-header .window-controls { margin-left: auto; order: 99; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // SVG icons — clean stroke-based, Windows 11 style
  const ICON_MIN = `<svg viewBox="0 0 12 12" fill="none" stroke="#555" stroke-width="1.2"><line x1="2" y1="6" x2="10" y2="6" stroke-linecap="round"/></svg>`;
  const ICON_MAX = `<svg viewBox="0 0 12 12" fill="none" stroke="#555" stroke-width="1.2"><rect x="2.5" y="2.5" width="7" height="7" rx="1"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 12 12" fill="none" stroke="#555" stroke-width="1.3"><path d="M3 3L9 9M9 3L3 9" stroke-linecap="round"/></svg>`;

  // Safe wrapper — works even if preload didn't expose electronAPI
  function winAction(method) {
    if (window.electronAPI && window.electronAPI[method]) {
      window.electronAPI[method]();
    }
  }

  function makeControls() {
    const controls = document.createElement("div");
    controls.className = "window-controls";

    const min = document.createElement("button");
    min.className = "wc-minimize";
    min.title = "Minimize";
    min.innerHTML = ICON_MIN;
    min.addEventListener("click", () => winAction("minimize"));

    const max = document.createElement("button");
    max.className = "wc-maximize";
    max.title = "Maximize";
    max.innerHTML = ICON_MAX;
    max.addEventListener("click", () => winAction("maximize"));

    const close = document.createElement("button");
    close.className = "wc-close";
    close.title = "Close";
    close.innerHTML = ICON_CLOSE;
    close.addEventListener("click", () => winAction("close"));

    controls.append(min, max, close);
    return controls;
  }

  function injectInto(selector) {
    const el = document.querySelector(selector);
    if (!el || el.querySelector(".window-controls")) return false;
    const controls = makeControls();
    // For login-brand, position at top-right corner
    if (selector === ".login-brand") {
      controls.style.position = "absolute";
      controls.style.top = "12px";
      controls.style.right = "12px";
    }
    el.appendChild(controls);
    return true;
  }

  function injectAll() {
    injectInto(".topbar");
    injectInto(".detail-header");
    injectInto(".login-brand");
  }

  // Try immediately, on DOMContentLoaded, and after delays (dynamic rendering)
  injectAll();
  document.addEventListener("DOMContentLoaded", injectAll);
  setTimeout(injectAll, 1000);
  setTimeout(injectAll, 3000);

  // Re-inject when detail view opens (the header is re-rendered each time)
  const observer = new MutationObserver(() => injectAll());
  observer.observe(document.body, { childList: true, subtree: true });
})();
