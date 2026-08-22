const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const http = require("http");

const APP_DIR = path.join(__dirname, "..", "app");
const PYTHON = path.join(APP_DIR, ".venv", "Scripts", "python.exe");
const URL = "http://127.0.0.1:5000/";
let flaskProcess = null;
let mainWindow = null;

function serverIsUp(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      res.destroy();
      // Any HTTP response (200, 302, etc.) means the server is running.
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(maxWaitMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await serverIsUp(URL)) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function startFlask() {
  if (!require("fs").existsSync(PYTHON)) {
    console.error("Python venv not found at:", PYTHON);
    app.quit();
    return false;
  }
  flaskProcess = spawn(PYTHON, ["app.py"], {
    cwd: APP_DIR,
    windowsHide: true,
    shell: false,
  });
  flaskProcess.stdout.on("data", () => {});
  flaskProcess.stderr.on("data", () => {});
  return true;
}

function killFlask() {
  if (flaskProcess) {
    try { flaskProcess.kill("SIGTERM"); } catch (_) {}
    flaskProcess = null;
  }
  // Belt-and-suspenders: kill anything on port 5000
  try {
    const out = execSync('netstat -ano -p TCP | findstr ":5000" | findstr "LISTENING"', { encoding: "utf8" });
    const pid = out.trim().split(/\s+/).pop();
    if (pid) execSync(`taskkill /F /T /PID ${pid}`, { windowsHide: true });
  } catch (_) {}
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    show: true,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(URL);
  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  if (!startFlask()) return;
  const up = await waitForServer();
  if (!up) {
    console.error("Flask did not start in time");
    killFlask();
    app.quit();
    return;
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  killFlask();
  app.quit();
});

app.on("before-quit", () => { killFlask(); });

// IPC for window controls
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());
