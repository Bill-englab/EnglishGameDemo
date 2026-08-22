// ============================================================
// My English Adventure — chapter-world map
// Ten chapter worlds, each painted by a full background illustration.
// ============================================================

import { getChapterTheme, getLevelVisualState, getStableRotation, isFrameDark } from "./map-model.mjs";
import { buildSmoothPath } from "./map-path.mjs";

function prettyChapter(raw) {
  const s = raw.replace(/^\d+-/, "");
  return s.split("-").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
const chapterIndex = (name) => parseInt((name.match(/^(\d+)/) || [0, 1])[1], 10);
const videoURL = (chapter, level, kind) => `/video/${chapter}/${level}/${kind}`;
const uploadURL = (chapter, level, kind) => `/upload/${chapter}/${level}/${kind}`;

// ===== upload helpers (File System Access API + IndexedDB folder memory) =====
// Chrome/Edge support showOpenFilePicker / showDirectoryPicker. The directory
// handle is persisted in IndexedDB so the picker reopens at the same folder
// next time. Falls back to a plain <input type="file"> on unsupported browsers.
const DIR_DB_NAME = "english-adventure";
const DIR_STORE = "handles";
const DIR_KEY = "source-dir";

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DIR_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DIR_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadSavedDirHandle() {
  if (!("indexedDB" in window)) return null;
  try {
    const db = await openHandleDB();
    const tx = db.transaction(DIR_STORE, "readonly");
    const req = tx.objectStore(DIR_STORE).get(DIR_KEY);
    return await new Promise(resolve => { req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); });
  } catch (_) { return null; }
}
async function saveDirHandle(handle) {
  if (!("indexedDB" in window)) return;
  try {
    const db = await openHandleDB();
    const tx = db.transaction(DIR_STORE, "readwrite");
    tx.objectStore(DIR_STORE).put(handle, DIR_KEY);
  } catch (_) { /* non-fatal */ }
}

// Pick a single video file. Uses showOpenFilePicker (Chrome) with a remembered
// start directory, or falls back to <input type=file>. One step — no folder picker.
async function pickVideoFile() {
  if ("showOpenFilePicker" in window) {
    try {
      // Try to load a saved directory handle so the picker reopens at the same spot.
      const dirHandle = await loadSavedDirHandle();
      const opts = {
        multiple: false,
        types: [{
          description: "Video files",
          accept: {
            "video/mp4": [".mp4"],
            "video/quicktime": [".mov"],
            "video/webm": [".webm"],
            "video/x-msvideo": [".avi"],
          },
        }],
      };
      if (dirHandle) opts.startIn = dirHandle;
      const [handle] = await window.showOpenFilePicker(opts);
      // Remember the parent directory of the picked file for next time.
      try {
        const parent = await handle.getParent();
        await saveDirHandle(parent);
      } catch (_) { /* getParent not supported everywhere */ }
      return await handle.getFile();
    } catch (e) {
      if (e.name === "AbortError") return null;  // user cancelled
      // fall through to <input> fallback
    }
  }
  // Fallback: plain file input.
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".mp4,.mov,.webm,.avi,video/*";
    input.onchange = () => resolve(input.files[0] || null);
    input.onerror = () => resolve(null);
    input.click();
  });
}

// Upload a File to the given chapter/level/kind with progress reporting.
// Returns true on success. onProgress(percent) is called during upload.
async function uploadVideo(level, kind, onProgress) {
  const file = await pickVideoFile();
  if (!file) return false;
  const fd = new FormData();
  fd.append("file", file, file.name || "video.mp4");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadURL(level.chapter, level.level, kind));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(true);
      else reject(new Error(`upload ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(fd);
  });
}

// Build a small "Replace" button for the demo area (dad's tool, not the kid's).
function makeActionButton(label, level, kind, onDone) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "action-btn";
  btn.textContent = label;
  btn.disabled = false;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const orig = btn.textContent;
    // Replace button text with a progress bar
    const bar = document.createElement("div");
    bar.className = "upload-progress";
    bar.innerHTML = `<div class="upload-progress__fill" style="width:0%"></div><span class="upload-progress__text">0%</span>`;
    btn.textContent = "";
    btn.appendChild(bar);
    const fill = bar.querySelector(".upload-progress__fill");
    const text = bar.querySelector(".upload-progress__text");
    try {
      await uploadVideo(level, kind, (pct) => {
        fill.style.width = pct + "%";
        text.textContent = pct + "%";
      });
      await loadLibrary();
      onDone();
    } catch (e) {
      console.error("Upload failed", e);
      btn.textContent = "Failed — retry";
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
      return;
    }
    btn.textContent = "Done!";
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
  });
  return btn;
}

// ===== in-browser recording (getUserMedia + MediaRecorder) =====
// The child performs in front of the PC's webcam. One button toggles start/stop
// (red circle → square). A 5-minute hard cap auto-stops to prevent OOM and
// oversize uploads. After stop, the recording plays back immediately with
// Redo / Save buttons — no grading, just "keep it or try again".
const MAX_RECORD_MS = 5 * 60 * 1000;

// Pick the best MIME type the browser's MediaRecorder actually supports.
// Chrome/Firefox → video/webm; Safari → video/mp4. The chosen type is logged
// to the console and sent to the server so it stores the right extension.
function pickRecorderMime() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const mt of candidates) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return "";
}

// Start a full recording session inside the given container element.
// Replaces the container's contents with: camera preview → record button →
// (on stop) playback + Redo/Save.
async function startRecordingSession(level, container) {
  container.innerHTML = "";

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
  } catch (err) {
    renderRecordError(container, level, err);
    return;
  }

  renderRecordingUI(container, stream, level);
}

function renderRecordingUI(container, stream, level) {
  container.innerHTML = "";

  // Live camera preview (muted so there's no echo from the mic).
  const preview = document.createElement("video");
  preview.className = "record-preview";
  preview.srcObject = stream;
  preview.muted = true;
  preview.playsInline = true;
  preview.autoplay = true;
  container.appendChild(preview);

  // Recording indicator: blinking red dot + timer (hidden until recording).
  const indicator = document.createElement("div");
  indicator.className = "record-indicator hidden";
  indicator.innerHTML = `<span class="rec-dot"></span><span class="rec-timer">00:00</span>`;

  // One button, two states: red circle (idle) → square (recording).
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "record-btn";  // starts as red circle via CSS
  btn.setAttribute("aria-label", "Start recording");

  const controls = document.createElement("div");
  controls.className = "record-controls";
  controls.append(indicator, btn);
  container.appendChild(controls);

  let mediaRecorder = null;
  let chunks = [];
  let timerInterval = null;
  let startTime = 0;
  let autoStopTimer = null;
  let chosenMime = "";

  btn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function startRecording() {
    chosenMime = pickRecorderMime();
    console.log("[recorder] MediaRecorder mimeType:", chosenMime);

    try {
      mediaRecorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : {});
    } catch (e) {
      console.error("[recorder] cannot create MediaRecorder:", e);
      return;
    }

    chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blobType = chosenMime || "video/webm";
      const blob = new Blob(chunks, { type: blobType });
      console.log("[recorder] recorded blob:", blob.size, "bytes, type:", blob.type);
      renderPlayback(container, blob, stream, level, blobType);
    };

    mediaRecorder.start();
    btn.classList.add("recording");  // circle → square
    btn.setAttribute("aria-label", "Stop recording");
    indicator.classList.remove("hidden");

    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 250);

    autoStopTimer = setTimeout(() => {
      console.log("[recorder] auto-stop at 5 min");
      stopRecording();
    }, MAX_RECORD_MS);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    clearInterval(timerInterval);
    clearTimeout(autoStopTimer);
    btn.classList.remove("recording");
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    indicator.querySelector(".rec-timer").textContent = `${mm}:${ss}`;
  }
}

// After recording stops: play back the recording with Redo / Save.
function renderPlayback(container, blob, stream, level, mimeType) {
  // Release the camera — we're done recording.
  stream.getTracks().forEach(t => t.stop());

  container.innerHTML = "";

  const video = document.createElement("video");
  video.className = "record-playback";
  video.src = URL.createObjectURL(blob);
  video.controls = true;
  video.playsInline = true;
  video.autoplay = true;
  container.appendChild(video);

  const actions = document.createElement("div");
  actions.className = "record-actions";

  const redoBtn = document.createElement("button");
  redoBtn.type = "button";
  redoBtn.className = "record-action record-action--redo";
  redoBtn.textContent = "⟲ Redo";
  redoBtn.addEventListener("click", () => {
    URL.revokeObjectURL(video.src);
    startRecordingSession(level, container);
  });

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "record-action record-action--save";
  saveBtn.textContent = "✓ Save";
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    redoBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      await uploadRecording(level, blob, mimeType);
      await loadLibrary();
      reopenDetail(level.chapter, level.level);
    } catch (e) {
      console.error("Save failed", e);
      saveBtn.textContent = "Failed — retry";
      saveBtn.disabled = false;
      redoBtn.disabled = false;
    }
  });

  actions.append(redoBtn, saveBtn);
  container.appendChild(actions);
}

// Upload a recorded blob to the server. Sends the actual MIME type so the
// backend stores the correct extension (.webm / .mp4).
async function uploadRecording(level, blob, mimeType) {
  const fd = new FormData();
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  fd.append("file", blob, `performance.${ext}`);
  fd.append("mimeType", mimeType);
  const res = await fetch(uploadURL(level.chapter, level.level, "performance"), {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return true;
}

// When the camera is blocked or missing, show a friendly message and a
// fallback button to upload a video file instead.
function renderRecordError(container, level, err) {
  container.innerHTML = "";
  const msg = document.createElement("div");
  msg.className = "record-error";
  if (err.name === "NotAllowedError") {
    msg.innerHTML = `<p>Camera access was blocked.</p><p class="record-error__hint">Allow camera in your browser, or upload a file instead.</p>`;
  } else if (err.name === "NotFoundError") {
    msg.innerHTML = `<p>No camera found.</p><p class="record-error__hint">Upload a video file instead.</p>`;
  } else {
    msg.innerHTML = `<p>Couldn't start the camera.</p><p class="record-error__hint">Upload a video file instead.</p>`;
  }
  const fallback = document.createElement("button");
  fallback.type = "button";
  fallback.className = "action-btn";
  fallback.textContent = "Choose file";
  fallback.addEventListener("click", async () => {
    // Show progress bar inside the button
    fallback.disabled = true;
    const bar = document.createElement("div");
    bar.className = "upload-progress";
    bar.innerHTML = `<div class="upload-progress__fill" style="width:0%"></div><span class="upload-progress__text">0%</span>`;
    fallback.textContent = "";
    fallback.appendChild(bar);
    const fill = bar.querySelector(".upload-progress__fill");
    const text = bar.querySelector(".upload-progress__text");
    try {
      await uploadVideo(level, "performance", (pct) => {
        fill.style.width = pct + "%";
        text.textContent = pct + "%";
      });
      await loadLibrary();
      reopenDetail(level.chapter, level.level);
    } catch (e) {
      console.error("File upload fallback failed", e);
      fallback.textContent = "Choose file";
      fallback.disabled = false;
    }
  });
  msg.appendChild(fallback);
  container.appendChild(msg);
}

// ===== svg bits =====
const PLAY_BTN_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#fff"/></svg>`;
const LOCK_SVG = `<svg class="lock" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.4" fill="#b6a99a"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#b6a99a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="15.4" r="1.7" fill="#fff7ec"/></svg>`;

const STAR_PATH = "M12 17.27 L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z";
const starSVG = (lit) => {
  const fill = lit ? "#ffd23f" : "#e6ddca";
  const stroke = lit ? "#f0a500" : "#c2b7a2";
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/></svg>`;
};

// ===== frame extraction for the level cover =====
// Seeks to 20% of the demo video, draws to a canvas, inspects pixels,
// and only returns a JPEG data URL when isFrameDark is false. Resolves null
// on timeout, media error, zero dimensions, canvas/tainted error, OR a dark frame.
const frameCache = new Map();
const frameKey = (ch, lv, kind) => `${ch}/${lv}/${kind}`;
function extractSafeCover(level, theme, ratio = 0.2) {
  const key = frameKey(level.chapter, level.level, "demo");
  if (frameCache.has(key)) return Promise.resolve(frameCache.get(key));
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.src = videoURL(level.chapter, level.level, "demo");
    let done = false;
    const finish = (val) => {
      if (done) return; done = true; clearTimeout(to);
      v.removeAttribute("src"); v.load();
      frameCache.set(key, val); resolve(val);
    };
    const to = setTimeout(() => finish(null), 4500);
    v.addEventListener("loadedmetadata", () => {
      if (!v.videoWidth || !v.videoHeight) { finish(null); return; }
      const d = v.duration || 1;
      v.currentTime = Math.min(Math.max(0.3, d * ratio), d - 0.05);
    });
    v.addEventListener("seeked", () => {
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) { finish(null); return; }
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.drawImage(v, 0, 0, cv.width, cv.height);
        const imageData = ctx.getImageData(0, 0, cv.width, cv.height);
        if (isFrameDark(imageData.data)) { finish(null); return; }
        finish(cv.toDataURL("image/jpeg", 0.82));
      } catch (_) { finish(null); }
    });
    v.addEventListener("error", () => finish(null));
  });
}

// ===== map rendering =====
let revealObserver = null;
let mapScrollY = 0;
let currentLibrary = [];        // full chapter tree, kept for detail navigation
let flatLevels = [];            // flattened level list with chapter context for prev/next
let bgSlides = [];              // background slides, kept so closeDetail can refresh them

// Gold star badge for completed nodes. Placed OUTSIDE the cover-clipping layer
// on the overflow:visible .level-node so it is never cropped.
const STAR_BADGE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="#ffd23f" stroke="#f0a500" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

// Small play badge shown on locked nodes that still have a demo to preview.
const DEMO_BADGE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fff" opacity=".92"/><path d="M9.5 7.5v9l7-4.5z" fill="#ff9d4d"/></svg>`;

// Builds the level node for every state (completed / current / locked).
// Any state with a demo shows the demo screenshot as its cover; the
// state-specific overlay (star / play button / lock) sits on top.
function createLevelNode(level, index, theme) {
  const state = getLevelVisualState(level);

  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = `level-node-wrap level-node-wrap--${state}`;
  wrap.setAttribute("aria-label", level.title);

  const node = document.createElement("span");
  node.className = `level-node level-node--${state}`;

  // Demo screenshot cover — shown for any state that has a demo so
  // uncompleted levels aren't just blank white.
  if (level.has_demo) {
    const cover = document.createElement("span");
    cover.className = "level-node__cover";
    node.appendChild(cover);

    extractSafeCover(level, theme).then(url => {
      if (url) {
        cover.style.backgroundImage = `url("${url}")`;
      } else {
        cover.classList.add("level-node--fallback");
        cover.style.setProperty("--fallback-accent", theme.accent);
      }
      requestAnimationFrame(drawMapPath);
    });
  }

  if (state === "completed") {
    node.style.setProperty("--polaroid-rotation", getStableRotation(index) + "deg");
    // Star wrapper (positioning + slow rotation) holds the inner star element
    // (pop + twinkle). Splitting transforms across two elements lets rotation
    // and scale coexist without fighting each other.
    const starWrap = document.createElement("span");
    starWrap.className = "level-node__star-wrap";
    const star = document.createElement("span");
    star.className = "level-node__star";
    star.innerHTML = STAR_BADGE_SVG;
    starWrap.appendChild(star);
    node.appendChild(starWrap);
  } else if (state === "current") {
    const playBtn = document.createElement("span");
    playBtn.className = "play-btn";
    playBtn.innerHTML = PLAY_BTN_SVG;
    node.appendChild(playBtn);
  } else {
    // locked — dim overlay sits between cover and lock
    if (level.has_demo) {
      const dim = document.createElement("span");
      dim.className = "level-node__dim";
      node.appendChild(dim);
    }
    const lockWrap = document.createElement("span");
    lockWrap.className = "lock-wrap";
    lockWrap.innerHTML = LOCK_SVG;
    node.appendChild(lockWrap);
    if (level.has_demo) {
      const badge = document.createElement("span");
      badge.className = "level-node__demo-badge";
      badge.innerHTML = DEMO_BADGE_SVG;
      node.appendChild(badge);
    }
  }

  const title = document.createElement("span");
  title.className = "level-title";
  title.textContent = level.title;

  wrap.appendChild(node);
  wrap.appendChild(title);
  wrap.addEventListener("click", () => openDetail(level));

  return wrap;
}

// Background images live on a fixed layer (parallax: bg stays put while content scrolls).
// Images are probed at startup; chapters without their own image cycle through
// the available ones (index % count) so the map always has a painted background.
const bgImageCache = new Set();  // URLs known to load successfully
const EXTENSIONS = ["jpg", "png", "webp"];

// Probe a single chapter image (tries .jpg, .png, .webp). Resolves to URL or null.
function probeChapterImage(chapterName) {
  for (const ext of EXTENSIONS) {
    const url = `/static/worlds/${chapterName}.${ext}`;
    if (bgImageCache.has(url)) return url;
  }
  return null;  // not yet probed — caller should async-probe
}

// Async-probe one chapter; returns the working URL or null (caches result).
function asyncProbeChapterImage(chapterName) {
  const cached = probeChapterImage(chapterName);
  if (cached) return Promise.resolve(cached);
  // Try each extension in order; first hit wins.
  return new Promise(resolve => {
    let i = 0;
    const tryNext = () => {
      if (i >= EXTENSIONS.length) return resolve(null);
      const ext = EXTENSIONS[i++];
      const url = `/static/worlds/${chapterName}.${ext}`;
      const img = new Image();
      img.onload = () => { bgImageCache.add(url); resolve(url); };
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
  });
}

let bgScrollTicking = false;
let activeChapter = null;
function buildBgLayer(library) {
  const layer = document.getElementById("bg-layer");
  layer.innerHTML = "";
  const slides = [];

  // Phase 1: create all slides immediately (placeholder by default).
  for (const chapter of library) {
    const theme = getChapterTheme(chapter.name);
    const slide = document.createElement("div");
    slide.className = "bg-layer__slide bg-layer__slide--placeholder";
    slide.dataset.chapter = chapter.name;
    slide.style.setProperty("--slide-accent", theme.accent);
    layer.appendChild(slide);
    slides.push(slide);
  }

  // Phase 2: probe each chapter's own image. Chapters that have one get it
  // directly. Chapters that don't will cycle through the ones that do.
  const probePromises = library.map(ch => asyncProbeChapterImage(ch.name));
  Promise.all(probePromises).then(urls => {
    const available = urls.filter(Boolean);  // URLs that loaded successfully
    if (available.length === 0) return;      // no images at all — keep placeholders

    library.forEach((chapter, idx) => {
      const slide = slides[idx];
      const ownUrl = urls[idx];
      // Use the chapter's own image if it exists; otherwise cycle through
      // available images by index (so every chapter gets a painted bg).
      const url = ownUrl || available[idx % available.length];
      slide.classList.remove("bg-layer__slide--placeholder");
      slide.style.backgroundImage = `url("${url}")`;
    });
  });

  return slides;
}

// Background cross-fade: on scroll, find which chapter section's vertical
// span contains the viewport center point, and activate its slide. Using a
// scroll listener (not IntersectionObserver) because IO only reports *changed*
// entries per callback — it can miss the chapter that's still closest to center,
// causing mid-chapter flicker.
function updateBgOnScroll(slides) {
  const centerY = window.innerHeight / 2;
  const sections = document.querySelectorAll(".chapter-world");
  let found = null;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    // Chapter is "active" if the viewport center falls within its bounds.
    if (centerY >= r.top && centerY <= r.bottom) { found = s.dataset.chapter; break; }
  }
  if (found && found !== activeChapter) {
    slides.forEach(s => s.classList.toggle("is-active", s.dataset.chapter === found));
    activeChapter = found;
  }
}

function observeBgSwitch(slides) {
  activeChapter = null;
  // Run once immediately to set the initial slide.
  updateBgOnScroll(slides);
  // Throttled scroll listener via requestAnimationFrame.
  window.addEventListener("scroll", () => {
    if (bgScrollTicking) return;
    bgScrollTicking = true;
    requestAnimationFrame(() => { updateBgOnScroll(slides); bgScrollTicking = false; });
  }, { passive: true });
}

function renderMap(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";

  // Keep the library for detail-view navigation (prev/next).
  currentLibrary = library;
  flatLevels = library.flatMap(ch => ch.levels.map(lv => ({ ...lv, chapter: ch.name })));

  const total = library.reduce((n, ch) => n + ch.levels.length, 0);
  const done = library.reduce((n, ch) => n + ch.levels.filter(l => l.has_performance).length, 0);
  document.getElementById("star-total").textContent = total;
  document.getElementById("star-count").textContent = done;

  // ---- chapters top-to-bottom, level 1 at the top ----
  let gIdx = 0;
  for (const chapter of library) {
    const ci = chapterIndex(chapter.name);
    const theme = getChapterTheme(chapter.name);

    const section = document.createElement("section");
    section.className = "chapter-world";
    section.dataset.chapter = chapter.name;
    section.style.setProperty("--chapter-accent", theme.accent);
    section.dataset.world = theme.world;

    const main = document.createElement("div");
    main.className = "chapter-main";

    const heading = document.createElement("header");
    heading.className = "chapter-heading";
    heading.innerHTML = `<span class="ch-no">Ch ${String(ci).padStart(2, "0")}</span><span class="ch-name">${prettyChapter(chapter.name)}</span>`;
    main.appendChild(heading);

    const levelsCol = document.createElement("div");
    levelsCol.className = "chapter-levels";

    let inChapter = 0;
    for (const level of chapter.levels) {
      const i = gIdx++;
      const wrap = createLevelNode(level, i, theme);
      wrap.style.setProperty("--d", (inChapter++ * 0.07).toFixed(2) + "s");
      levelsCol.appendChild(wrap);
    }

    main.appendChild(levelsCol);
    section.appendChild(main);
    map.appendChild(section);
  }

  // Build the fixed background layer and wire cross-fade on scroll.
  bgSlides = buildBgLayer(library);

  requestAnimationFrame(() => {
    drawMapPath();
    observeReveal();
    observeBgSwitch(bgSlides);
  });
}

function observeReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("seen");
        revealObserver.unobserve(e.target);
      }
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  document.querySelectorAll(".chapter-world, .level-node-wrap").forEach(el => revealObserver.observe(el));
}

// Reads every .level-node center in DOM order and draws the trail. The path
// splits at the first locked level: the "traveled" segment (completed +
// current levels) is golden and glowing; the "upcoming" segment (locked
// levels) stays white and dimmer. Centers are measured from raw layout —
// .level-node carries no ambient transform, so hover/scene animations can
// never shift the measured points.
function drawMapPath() {
  const svg = document.getElementById("path-svg");
  const scroll = document.getElementById("map-scroll");
  if (!svg || !scroll) return;

  const w = scroll.clientWidth, h = scroll.scrollHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  const base = scroll.getBoundingClientRect();
  const nodes = scroll.querySelectorAll(".level-node");
  const pts = [];
  let splitIdx = nodes.length;  // index of first locked level (default: no split)

  nodes.forEach((node, i) => {
    const r = node.getBoundingClientRect();
    if (!r.width && !r.height) return;
    pts.push({
      x: r.left + r.width / 2 - base.left + scroll.scrollLeft,
      y: r.top + r.height / 2 - base.top + scroll.scrollTop,
    });
    // The first locked node marks where "upcoming" begins.
    if (splitIdx === nodes.length && node.classList.contains("level-node--locked")) {
      splitIdx = i;
    }
  });

  if (pts.length < 2) { svg.innerHTML = ""; return; }

  // Traveled = pts[0 .. splitIdx-1] — stops at the current level, does NOT
  //   include the first locked level (so the connector to the next locked
  //   level stays white).
  // Upcoming = pts[splitIdx-1 .. end] — starts at the current level so the
  //   two segments visually connect at the current node.
  const traveledPts = pts.slice(0, splitIdx);
  const upcomingPts = pts.slice(splitIdx > 0 ? splitIdx - 1 : 0);

  let html = "";
  if (traveledPts.length >= 2) {
    html += `<path class="trail trail--done" d="${buildSmoothPath(traveledPts)}"/>`;
  }
  if (upcomingPts.length >= 2) {
    html += `<path class="trail trail--todo" d="${buildSmoothPath(upcomingPts)}"/>`;
  }
  svg.innerHTML = html;
}

// ===== level detail view =====
function openDetail(level) {
  mapScrollY = window.scrollY;
  const view = document.getElementById("detail-view");

  document.getElementById("detail-chapter").textContent = prettyChapter(level.chapter);
  document.getElementById("detail-title").textContent = level.title;

  const patterns = document.getElementById("detail-patterns");
  patterns.innerHTML = "";
  (level.patterns || []).forEach(pat => {
    const pill = document.createElement("span");
    pill.className = "pattern-pill";
    pill.textContent = pat;
    patterns.appendChild(pill);
  });
  patterns.style.display = (level.patterns && level.patterns.length) ? "" : "none";

  // --- Demo video slot: video if present, else clickable + placeholder ---
  const demoWrap = document.getElementById("detail-demo");
  demoWrap.innerHTML = "";
  if (level.has_demo) {
    const v = document.createElement("video");
    v.src = videoURL(level.chapter, level.level, "demo");
    v.controls = true; v.preload = "auto"; v.playsInline = true;
    v.addEventListener("loadedmetadata", () => { v.playbackRate = 0.75; });
    demoWrap.appendChild(v);
    // Subtle replace button below the video for dad.
    demoWrap.appendChild(makeActionButton("Replace", level, "demo",
      () => reopenDetail(level.chapter, level.level)));
  } else {
    // Empty placeholder: click anywhere to trigger upload.
    const slot = document.createElement("div");
    slot.className = "video-slot--empty";
    slot.innerHTML = `<span class="plus">+</span>`;
    slot.addEventListener("click", async () => {
      // Replace + with progress bar
      slot.innerHTML = `<div class="upload-progress"><div class="upload-progress__fill" style="width:0%"></div><span class="upload-progress__text">0%</span></div>`;
      const fill = slot.querySelector(".upload-progress__fill");
      const text = slot.querySelector(".upload-progress__text");
      try {
        await uploadVideo(level, "demo", (pct) => {
          fill.style.width = pct + "%";
          text.textContent = pct + "%";
        });
        await loadLibrary();
        reopenDetail(level.chapter, level.level);
      } catch (e) {
        console.error("Demo upload failed", e);
        slot.innerHTML = `<span class="plus">+</span>`;
        slot.style.opacity = "1";
      }
    });
    demoWrap.appendChild(slot);
  }

  // --- Star row (no path hint — that moved to the "?" tooltip) ---
  const lit = level.has_performance;
  const starRow = document.getElementById("detail-star");
  starRow.innerHTML = "";
  const star = document.createElement("span");
  star.className = "big-star";
  star.innerHTML = starSVG(lit);
  const cap = document.createElement("span");
  cap.className = "star-cap";
  cap.textContent = lit
    ? "You did it! Your show is saved."
    : "Practice together, then upload your show!";
  starRow.appendChild(star);
  starRow.appendChild(cap);

  // --- "?" tooltip on "Your Turn" shows where the recording file lives ---
  const tooltipTrigger = document.querySelector(".rec-tooltip-trigger");
  if (tooltipTrigger) {
    tooltipTrigger.title = `recordings/${level.chapter}/${level.level}/performance.mp4`;
  }

  // --- Performance video slot: recording if empty, playback if present ---
  const perfWrap = document.getElementById("detail-perf");
  perfWrap.innerHTML = "";
  if (level.has_performance) {
    const v = document.createElement("video");
    v.src = videoURL(level.chapter, level.level, "performance");
    v.controls = true; v.preload = "auto"; v.playsInline = true;
    v.addEventListener("loadedmetadata", () => { v.playbackRate = 1.0; });
    perfWrap.appendChild(v);
    // "Record again" triggers the in-browser recorder (not file upload).
    const redoBtn = document.createElement("button");
    redoBtn.type = "button";
    redoBtn.className = "action-btn";
    redoBtn.textContent = "Record again";
    redoBtn.addEventListener("click", () => startRecordingSession(level, perfWrap));
    perfWrap.appendChild(redoBtn);
  } else {
    // Empty slot: click + to start the camera and record directly.
    const slot = document.createElement("div");
    slot.className = "video-slot--empty";
    slot.innerHTML = `<span class="plus">+</span>`;
    slot.addEventListener("click", () => startRecordingSession(level, perfWrap));
    perfWrap.appendChild(slot);
  }

  const dialogueEl = document.getElementById("detail-dialogue");
  dialogueEl.innerHTML = "";
  (level.dialogue || []).forEach(turn => {
    const t = document.createElement("div");
    t.className = "turn " + (turn.speaker === "Child" ? "child" : "dad");
    t.innerHTML = `<div class="who">${turn.speaker}</div><div class="bubble"></div>`;
    t.querySelector(".bubble").textContent = turn.line;
    dialogueEl.appendChild(t);
  });
  dialogueEl.style.display = (level.dialogue && level.dialogue.length) ? "" : "none";

  document.getElementById("detail-variations").textContent = level.variations || "";

  // Fetch and render Sora prompts (a + b) for this level.
  const promptWrap = document.getElementById("detail-prompts");
  promptWrap.innerHTML = `<div class="prompt-loading">Loading prompts…</div>`;
  fetch(`/api/prompts/${level.chapter}/${level.level}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      promptWrap.innerHTML = "";
      if (!data || (!data.a && !data.b)) {
        promptWrap.innerHTML = `<div class="prompt-empty">No prompts available</div>`;
        return;
      }
      const makeBlock = (label, text) => {
        if (!text) return null;
        const wrap = document.createElement("details");
        wrap.className = "prompt-block";
        // Summary acts as the collapsible header: label + copy button.
        // Clicking copy won't toggle (e.stopPropagation), only label toggles.
        const summary = document.createElement("summary");
        const labelEl = document.createElement("span");
        labelEl.className = "prompt-block__label";
        labelEl.textContent = label;
        const copyBtn = document.createElement("button");
        copyBtn.className = "prompt-copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
          });
        });
        summary.append(labelEl, copyBtn);
        const pre = document.createElement("pre");
        pre.textContent = text;
        wrap.append(summary, pre);
        return wrap;
      };
      const a = makeBlock("Part A", data.a);
      const b = makeBlock("Part B", data.b);
      if (a) promptWrap.appendChild(a);
      if (b) promptWrap.appendChild(b);
    })
    .catch(() => { promptWrap.innerHTML = `<div class="prompt-empty">No prompts available</div>`; });

  // Prev / Next navigation — find this level in the flat list and wire buttons.
  const navWrap = document.getElementById("detail-nav");
  navWrap.innerHTML = "";
  const idx = flatLevels.findIndex(lv => lv.chapter === level.chapter && lv.level === level.level);
  if (idx >= 0) {
    const makeBtn = (label, offset, disabled) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `nav-btn nav-btn--${offset < 0 ? "prev" : "next"}`;
      btn.textContent = label;
      if (disabled) { btn.disabled = true; }
      else { btn.addEventListener("click", () => openDetail(flatLevels[idx + offset])); }
      return btn;
    };
    navWrap.appendChild(makeBtn("\u2190 Prev", -1, idx <= 0));
    navWrap.appendChild(makeBtn("Next \u2192", 1, idx >= flatLevels.length - 1));
  }

  document.getElementById("map-view").classList.add("hidden");
  document.getElementById("bg-layer").classList.add("hidden");
  view.classList.remove("hidden");
  view.classList.add("open");
  window.scrollTo(0, 0);
  // Re-inject window controls into the freshly-rendered detail header
  if (window.__injectTitlebar) window.__injectTitlebar();
}

// Re-open detail for the same level after an upload refreshes the library.
// Finds the updated level object in flatLevels (which loadLibrary repopulated).
function reopenDetail(chapter, level) {
  const fresh = flatLevels.find(lv => lv.chapter === chapter && lv.level === level);
  if (fresh) openDetail(fresh);
}

function closeDetail() {
  document.querySelectorAll("#detail-view video").forEach(v => {
    v.pause(); v.removeAttribute("src"); v.load();
  });
  const view = document.getElementById("detail-view");
  view.classList.remove("open");
  view.classList.add("hidden");
  document.getElementById("map-view").classList.remove("hidden");
  document.getElementById("bg-layer").classList.remove("hidden");
  requestAnimationFrame(() => {
    drawMapPath();
    window.scrollTo(0, mapScrollY);
    activeChapter = null;
    // Delay bg refresh slightly so scroll position is restored first
    setTimeout(() => updateBgOnScroll(bgSlides), 50);
  });
}

// ===== resilient library loading (loading / error / retry) =====
// toggles ONLY these three; never hides the detail view
function showOnly(id) {
  for (const el of ["map-loading", "map-error", "map-scroll"]) {
    document.getElementById(el).classList.toggle("hidden", el !== id);
  }
}
async function loadLibrary() {
  showOnly("map-loading");
  try {
    const response = await fetch("/api/library", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`library ${response.status}`);
    const library = await response.json();
    renderMap(library);
    showOnly("map-scroll");
  } catch (error) {
    console.error("Unable to load library", error);
    showOnly("map-error");
  }
}
document.getElementById("map-retry").addEventListener("click", loadLibrary);

// ===== admin user management (popup) =====
async function loadAdminUsers() {
  try {
    const res = await fetch("/api/admin/users", { credentials: "same-origin" });
    const data = await res.json();
    const list = document.getElementById("admin-user-list");
    if (!list) return;
    list.innerHTML = "";
    for (const u of data.users) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${u}</span>`;
      const del = document.createElement("button");
      del.className = "del-user";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        const r = await fetch("/api/admin/users", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", username: u }),
        });
        if (r.ok) loadAdminUsers();
      });
      li.appendChild(del);
      list.appendChild(li);
    }
  } catch (e) { console.error("Failed to load admin users", e); }
}

// ===== init =====
async function init() {
  // Check login status before loading the app
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.username) {
      window.location.href = "/login";
      return;
    }
  // Show username in menu trigger
  const userEl = document.getElementById("user-name");
  if (userEl) userEl.textContent = data.username;
  if (data.isAdmin) {
    const adminSection = document.getElementById("admin-section");
    if (adminSection) adminSection.style.display = "";
  }
  } catch (_) {
    window.location.href = "/login";
    return;
  }

  document.getElementById("back-btn").addEventListener("click", closeDetail);

  // User menu popup — toggle on click, close on outside click
  const menuTrigger = document.getElementById("user-menu-trigger");
  const menuPopup = document.getElementById("user-menu-popup");
  if (menuTrigger && menuPopup) {
    menuTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menuPopup.style.display = menuPopup.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", (e) => {
      if (!menuPopup.contains(e.target) && !menuTrigger.contains(e.target)) {
        menuPopup.style.display = "none";
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    fetch("/logout", { credentials: "same-origin" }).then(() => {
      window.location.href = "/login";
    });
  });

  // Admin: manage users in popup
  const adminBtn = document.getElementById("admin-btn");
  const adminPanel = document.getElementById("admin-panel");
  if (adminBtn && adminPanel) {
    adminBtn.addEventListener("click", () => {
      adminPanel.style.display = adminPanel.style.display === "none" ? "block" : "none";
      if (adminPanel.style.display === "block") loadAdminUsers();
    });
  }
  const adminAddBtn = document.getElementById("admin-add-btn");
  if (adminAddBtn) adminAddBtn.addEventListener("click", async () => {
    const u = document.getElementById("admin-username").value.trim();
    const p = document.getElementById("admin-password").value;
    if (!u || !p) return;
    const fd = new FormData();
    fd.append("action", "add"); fd.append("username", u); fd.append("password", p);
    const res = await fetch("/admin", { method: "POST", body: fd, credentials: "same-origin" });
    if (res.ok) {
      document.getElementById("admin-username").value = "";
      document.getElementById("admin-password").value = "";
      loadAdminUsers();
    }
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawMapPath);
  setTimeout(drawMapPath, 700);

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(drawMapPath, 120);
  });

  loadLibrary();
}
init();
