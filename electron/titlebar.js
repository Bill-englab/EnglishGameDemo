// Inject custom titlebar buttons when running inside Electron.
// In a regular browser, this script does nothing.
(function () {
  if (!window.electronAPI) return;

  // Inject styles
  const css = `
    .topbar { -webkit-app-region: drag; }
    .topbar button, .topbar .progress, .topbar a { -webkit-app-region: no-drag; }
    .window-controls {
      -webkit-app-region: no-drag;
      display: flex; gap: 8px; align-items: center;
      margin-left: 16px; flex: none;
    }
    .window-controls button {
      width: 14px; height: 14px; border-radius: 50%;
      border: none; cursor: pointer; padding: 0;
      transition: opacity .15s ease;
    }
    .window-controls button:hover { opacity: .7; }
    .wc-minimize { background: #f5b73d; }
    .wc-maximize { background: #4caf50; }
    .wc-close { background: #e8554e; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Inject buttons into the topbar once it exists
  function injectControls() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || topbar.querySelector(".window-controls")) return;

    const controls = document.createElement("div");
    controls.className = "window-controls";

    const min = document.createElement("button");
    min.className = "wc-minimize";
    min.title = "Minimize";
    min.addEventListener("click", () => window.electronAPI.minimize());

    const max = document.createElement("button");
    max.className = "wc-maximize";
    max.title = "Maximize";
    max.addEventListener("click", () => window.electronAPI.maximize());

    const close = document.createElement("button");
    close.className = "wc-close";
    close.title = "Close";
    close.addEventListener("click", () => window.electronAPI.close());

    controls.append(min, max, close);
    // Insert at the start of topbar (leftmost), before the title
    topbar.insertBefore(controls, topbar.firstChild);
  }

  // Try immediately and also after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectControls);
  } else {
    injectControls();
  }
  // Also try after a delay in case topbar is rendered dynamically
  setTimeout(injectControls, 2000);
})();
