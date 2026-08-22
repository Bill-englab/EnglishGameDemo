const { contextBridge, ipcRenderer } = require("electron");

console.log("PRELOAD: running, contextBridge available:", !!contextBridge);

try {
  contextBridge.exposeInMainWorld("electronAPI", {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
    isElectron: true,
  });
  console.log("PRELOAD: electronAPI exposed successfully");
} catch(e) {
  console.error("PRELOAD: error exposing electronAPI:", e.message);
}
