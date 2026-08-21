// Inject custom titlebar buttons when running inside Electron.
// In a regular browser, this script does nothing.
(function () {
  if (!window.electronAPI) return;

  const css = `
    /* Map view topbar — draggable */
    .topbar { -webkit-app-region: drag; }
    .topbar button, .topbar .progress, .topbar a,
    .topbar .window-controls { -webkit-app-region: no-drag; }

    /* Detail view header — also draggable */
    .detail-header { -webkit-app-region: drag; }
    .detail-header button, .detail-header .chip,
    .detail-header .window-controls,
    .detail-header .videogen-toggle { -webkit-app-region: no-drag; }

    /* Window control buttons — Windows-style with icons */
    .window-controls {
      -webkit-app-region: no-drag;
      display: flex; gap: 2px; align-items: center;
      flex: none;
    }
    .window-controls button {
      width: 32px; height: 28px;
      border: none; cursor: pointer; padding: 0;
      display: flex; align-items: center; justify-content: center;
      background: transparent;
      transition: background .15s ease;
    }
    .window-controls button:hover { background: rgba(0,0,0,.08); }
    .window-controls .wc-close:hover { background: #e8554e; }
    .window-controls .wc-close:hover svg { fill: #fff; }
    .window-controls svg {
      width: 11px; height: 11px; fill: var(--ink-2, #5a6070);
      pointer-events: none;
    }

    /* On map topbar (dark bg), place controls at the right edge */
    .topbar .window-controls { margin-left: auto; order: 99; }
    /* On detail header (light bg), also at right */
    .detail-header .window-controls { margin-left: auto; order: 99; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // SVG icons for the three buttons
  const ICON_MIN = `<svg viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" rx=".5"/></svg>`;
  const ICON_MAX = `<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 12 12"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`;

  function makeControls() {
    const controls = document.createElement("div");
    controls.className = "window-controls";

    const min = document.createElement("button");
    min.className = "wc-minimize";
    min.title = "Minimize";
    min.innerHTML = ICON_MIN;
    min.addEventListener("click", () => window.electronAPI.minimize());

    const max = document.createElement("button");
    max.className = "wc-maximize";
    max.title = "Maximize";
    max.innerHTML = ICON_MAX;
    max.addEventListener("click", () => window.electronAPI.maximize());

    const close = document.createElement("button");
    close.className = "wc-close";
    close.title = "Close";
    close.innerHTML = ICON_CLOSE;
    close.addEventListener("click", () => window.electronAPI.close());

    controls.append(min, max, close);
    return controls;
  }

  function injectInto(selector) {
    const el = document.querySelector(selector);
    if (!el || el.querySelector(".window-controls")) return false;
    el.appendChild(makeControls());
    return true;
  }

  function injectAll() {
    injectInto(".topbar");
    injectInto(".detail-header");
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
