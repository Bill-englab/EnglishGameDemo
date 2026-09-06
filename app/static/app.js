// ============================================================
// My English Adventure — chapter-world map
// Ten chapter worlds, each painted by a full background illustration.
// ============================================================

import { getChapterTheme, resolveMapPresentation, resolveMapBackground, isFrameDark } from "./map-model.mjs";
import { buildSmoothPath, getScenicRouteOffset } from "./map-path.mjs";
import { groupDialogueByPart, normalizeReplayCards, promptParts, withChapterContext } from "./lesson-view.mjs";
import { resolveMediaView } from "./detail-media.mjs";
import { summarizeAdventure } from "./adventure-navigation.mjs";
import { createAdventureShell } from "./adventure-shell.mjs";
import { createCelebrationQueue, createCelebrationEffects, createCurrentLessonAction, resolveCompletionTransition, showMapLoadState, showMapLoadError } from "./map-interactions.mjs";

const scrollToCurrentLesson = createCurrentLessonAction({ root: document, view: window });
const celebrationQueue = createCelebrationQueue();
const chapterCelebrationQueue = createCelebrationQueue();
const celebrationEffects = createCelebrationEffects({ view: window });

const adventureShell = createAdventureShell({
  root: document,
  onOpenLesson: openDetail,
  onCurrentLesson: scrollToCurrentLesson,
  onProfile: () => document.getElementById("profile-open").click(),
});

let detailVisit = 0;
let recordingGeneration = 0;
let releaseRecording = () => {};
let cameraActive = false;
let selectedMedia = "performance";
const mobileMedia = window.matchMedia("(max-width: 767px)");

function updateMediaView() {
  const state = resolveMediaView({ mobile: mobileMedia.matches, selected: selectedMedia, cameraActive });
  selectedMedia = state.selected;
  for (const [kind, visible] of [["performance", state.showPerformance], ["demo", state.showDemo]]) {
    const panel = document.getElementById(`media-panel-${kind}`);
    const tab = document.getElementById(`media-tab-${kind}`);
    if (!visible) panel.querySelectorAll("video").forEach(video => video.pause());
    panel.hidden = !visible;
    panel.setAttribute("role", mobileMedia.matches ? "tabpanel" : "region");
    tab.setAttribute("aria-selected", String(kind === state.selected));
    tab.tabIndex = kind === state.selected ? 0 : -1;
    tab.disabled = kind === "demo" && cameraActive && mobileMedia.matches;
  }
}

function disposeDetailMedia() {
  detailVisit += 1;
  recordingGeneration += 1;
  releaseRecording();
  releaseRecording = () => {};
  cameraActive = false;
  document.querySelectorAll("#detail-view video").forEach(video => {
    video.pause();
    video.srcObject = null;
    video.removeAttribute("src");
    video.load();
  });
}

function prettyChapter(raw) {
  const s = raw.replace(/^\d+-/, "");
  return s.split("-").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
const chapterIndex = (name) => parseInt((name.match(/^(\d+)/) || [0, 1])[1], 10);
const videoURL = (chapter, level, kind) => `/video/${chapter}/${level}/${kind}?t=${Date.now()}`;
const uploadURL = (chapter, level, kind) => `/upload/${chapter}/${level}/${kind}`;
const levelKey = ({ chapter, level }) => `${chapter}/${level}`;

function _fallbackCopy(text, onSuccess) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); if (onSuccess) onSuccess(); } catch(_) {}
  document.body.removeChild(ta);
}

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
    input.oncancel = () => resolve(null);
    input.onerror = () => resolve(null);
    input.click();
  });
}

// Upload a File to the given chapter/level/kind with progress reporting.
// Returns true on success. onProgress(percent) is called during upload.
async function uploadVideo(level, kind, onProgress, isCurrent = () => true) {
  const file = await pickVideoFile();
  if (!file || !isCurrent()) return false;
  const fd = new FormData();
  fd.append("file", file, file.name || "video.mp4");
  fd.append("mimeType", file.type || (file.name?.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4"));
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
  const visit = detailVisit;
  const isCurrent = () => visit === detailVisit;
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
    const performanceBefore = kind === "performance" ? getCompletionSnapshot(level) : null;
    try {
      const uploaded = await uploadVideo(level, kind, (pct) => {
        if (!isCurrent()) return;
        fill.style.width = pct + "%";
        text.textContent = pct + "%";
        // Upload done (100%) but server still processing — show spinner
        if (pct >= 100) {
          bar.innerHTML = `<span class="upload-processing"><span class="spinner"></span>Processing…</span>`;
        }
      }, isCurrent);
      if (!uploaded) {
        if (!isCurrent()) return;
        btn.textContent = orig;
        btn.disabled = false;
        return;
      }
      const refreshed = kind === "performance"
        ? await refreshPerformanceSave(level, performanceBefore)
        : await loadLibrary({ isCurrent });
      if (!isCurrent()) return;
      if (!refreshed) throw new Error("Unable to refresh the saved video");
      onDone();
    } catch (e) {
      if (!isCurrent()) return;
      console.error("Upload failed", e);
      btn.textContent = "Failed — retry";
      setTimeout(() => { if (isCurrent()) { btn.textContent = orig; btn.disabled = false; } }, 2000);
      return;
    }
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
  releaseRecording();
  releaseRecording = () => {};
  const generation = ++recordingGeneration;
  const visit = detailVisit;
  const isCurrent = () => visit === detailVisit && generation === recordingGeneration;
  container.querySelectorAll("video").forEach(video => video.pause());
  container.innerHTML = "";
  cameraActive = true;
  updateMediaView();

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
  } catch (err) {
    if (!isCurrent()) return;
    cameraActive = false;
    updateMediaView();
    renderRecordError(container, level, err);
    return;
  }
  if (!isCurrent()) {
    stream.getTracks().forEach(track => track.stop());
    return;
  }
  renderRecordingUI(container, stream, level, isCurrent);
}

function renderRecordingUI(container, stream, level, isCurrent) {
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

  releaseRecording = () => {
    clearInterval(timerInterval);
    clearTimeout(autoStopTimer);
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    }
    stream.getTracks().forEach(track => track.stop());
    preview.srcObject = null;
  };

  btn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function startRecording() {
    try {
      chosenMime = pickRecorderMime();
      console.log("[recorder] MediaRecorder mimeType:", chosenMime);
      mediaRecorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : {});
    } catch (e) {
      recordingFailed(e);
      return;
    }

    chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      clearInterval(timerInterval);
      clearTimeout(autoStopTimer);
      if (!isCurrent()) return;
      const blobType = chosenMime || "video/webm";
      const blob = new Blob(chunks, { type: blobType });
      console.log("[recorder] recorded blob:", blob.size, "bytes, type:", blob.type);
      renderPlayback(container, blob, stream, level, blobType, isCurrent);
    };

    try {
      mediaRecorder.start();
    } catch (e) {
      recordingFailed(e);
      return;
    }
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
      // The stop event is asynchronous. Prevent a second click from creating
      // another recorder and replacing the chunks before playback is ready.
      btn.disabled = true;
      mediaRecorder.stop();
    }
    clearInterval(timerInterval);
    clearTimeout(autoStopTimer);
    btn.classList.remove("recording");
  }

  function recordingFailed(error) {
    console.error("[recorder] cannot start MediaRecorder:", error);
    releaseRecording();
    cameraActive = false;
    updateMediaView();
    renderRecordError(container, level, error);
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    indicator.querySelector(".rec-timer").textContent = `${mm}:${ss}`;
  }
}

// After recording stops: play back the recording with Redo / Save.
function renderPlayback(container, blob, stream, level, mimeType, isCurrent) {
  // Release the camera — we're done recording.
  stream.getTracks().forEach(t => t.stop());
  cameraActive = false;
  updateMediaView();

  container.innerHTML = "";

  const video = document.createElement("video");
  video.className = "record-playback";
  video.src = URL.createObjectURL(blob);
  video.controls = true;
  video.playsInline = true;
  video.autoplay = true;
  container.appendChild(video);
  const blobURL = video.src;
  releaseRecording = () => {
    video.pause();
    URL.revokeObjectURL(blobURL);
  };

  const actions = document.createElement("div");
  actions.className = "record-actions";

  const redoBtn = document.createElement("button");
  redoBtn.type = "button";
  redoBtn.className = "record-action record-action--redo";
  redoBtn.textContent = "⟲ Redo";
  redoBtn.addEventListener("click", () => {
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
      const performanceBefore = getCompletionSnapshot(level);
      await uploadRecording(level, blob, mimeType);
      const refreshed = await refreshPerformanceSave(level, performanceBefore);
      if (!isCurrent()) return;
      if (!refreshed) throw new Error("Unable to refresh the saved recording");
      reopenDetail(level.chapter, level.level);
    } catch (e) {
      if (!isCurrent()) return;
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
async function uploadRecording(level, blob, mimeType, kind = "performance") {
  const fd = new FormData();
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  fd.append("file", blob, `performance.${ext}`);
  fd.append("mimeType", mimeType);
  const res = await fetch(uploadURL(level.chapter, level.level, kind), {
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
  const fallback = makeActionButton("Choose file", level, "performance",
    () => reopenDetail(level.chapter, level.level));
  msg.appendChild(fallback);
  container.appendChild(msg);
}


// ===== frame extraction for the level cover =====
// Tries to load a pre-generated server-side thumbnail. Falls back to null
// (which triggers the accent-color fallback) if the thumbnail is missing.
const frameCache = new Map();
const frameKey = (ch, lv) => `${ch}/${lv}`;
function extractSafeCover(level, theme) {
  const key = frameKey(level.chapter, level.level);
  if (frameCache.has(key)) return Promise.resolve(frameCache.get(key));
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = (val) => {
      if (done) return; done = true;
      frameCache.set(key, val); resolve(val);
    };
    img.onload = () => finish(`/thumb/${level.chapter}/${level.level}`);
    img.onerror = () => finish(null);
    img.src = `/thumb/${level.chapter}/${level.level}`;
  });
}

// ===== map rendering =====
let revealObserver = null;
let mapScrollY = 0;
let currentLibrary = [];        // full chapter tree, kept for detail navigation
let flatLevels = [];            // flattened level list with chapter context for prev/next
let bgSlides = [];              // background slides, kept so closeDetail can refresh them

function getCompletionSnapshot(level) {
  const chapter = currentLibrary.find(item => item.name === level.chapter);
  const levels = chapter?.levels || [];
  const current = levels.find(item => item.level === level.level);
  return {
    hasPerformance: Boolean(current?.has_performance ?? level.has_performance),
    chapterCompleted: levels.filter(item => item.has_performance).length,
    chapterTotal: levels.length,
  };
}

async function refreshPerformanceSave(level, before) {
  const refreshed = await loadLibrary();
  if (!refreshed) return false;
  const after = getCompletionSnapshot(level);
  const transition = resolveCompletionTransition(before, after);
  if (!transition.lesson) return true;

  celebrationQueue.queue(levelKey(level));
  if (transition.chapter) chapterCelebrationQueue.queue(level.chapter);
  if (!document.getElementById("map-view").classList.contains("hidden")) {
    celebratePendingCompletion();
  }
  return true;
}

const MAP_MARKERS = {
  star: '<path d="m12 3.1 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9Z" fill="currentColor" stroke="none"/>',
  locator: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
};

// Builds the level node for every state (completed / current / locked).
// Any state with a demo shows the demo screenshot as its cover; the
// state-specific marker (star / locator / lock) sits outside the cover.
function createLevelNode(level, index, theme) {
  const { state, number, showCover, marker } = resolveMapPresentation(level, index);

  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = `level-node-wrap level-node-wrap--${state}`;
  wrap.dataset.levelKey = levelKey(level);
  const stateLabel = { completed: "Completed", current: "Current lesson", locked: "Locked" }[state];
  wrap.setAttribute("aria-label", `${level.title} — ${stateLabel}`);
  if (state === "current") {
    wrap.dataset.currentLesson = `${level.chapter}/${level.level}`;
    wrap.setAttribute("aria-current", "step");
  }

  const node = document.createElement("span");
  node.className = `level-node level-node--${state}`;
  const numberEl = document.createElement("span");
  numberEl.className = "level-node__number";
  numberEl.textContent = number;
  numberEl.setAttribute("aria-hidden", "true");
  node.appendChild(numberEl);

  // Demo screenshot cover — shown for any state that has a demo so
  // uncompleted levels aren't just blank white.
  if (showCover) {
    const cover = document.createElement("span");
    cover.className = "level-node__cover";
    node.appendChild(cover);

    extractSafeCover(level, theme).then(url => {
      if (url) {
        cover.style.backgroundImage = `url("${url}")`;
      } else {
        cover.remove();
      }
      requestAnimationFrame(drawMapPath);
    });
  }

  const markerEl = document.createElement("span");
  markerEl.className = `level-node__marker level-node__marker--${marker}`;
  markerEl.setAttribute("aria-hidden", "true");
  markerEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MAP_MARKERS[marker]}</svg>`;
  node.appendChild(markerEl);

  const title = document.createElement("span");
  title.className = "level-title";
  title.textContent = level.title;
  if (state === "current") {
    const label = document.createElement("span");
    label.className = "level-title__status";
    label.textContent = "Current lesson";
    title.prepend(label);
  }

  wrap.appendChild(node);
  wrap.appendChild(title);
  wrap.addEventListener("click", () => openDetail(level));

  return wrap;
}

// Background images stay untinted on a fixed layer. Each world owns its fallback.
const bgImageCache = new Set();  // URLs known to load successfully
const mapMobile = window.matchMedia("(max-width: 767px)");
let backgroundGeneration = 0;
function probeBackgroundCandidates(urls) {
  return new Promise(resolve => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) return resolve(null);
      const url = urls[i++];
      if (bgImageCache.has(url)) return resolve(url);
      const img = new Image();
      img.onload = () => { bgImageCache.add(url); resolve(url); };
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
  });
}

function selectMapBackgrounds(slides) {
  const generation = ++backgroundGeneration;
  const width = mapMobile.matches ? 767 : 768;
  slides.forEach(slide => {
    probeBackgroundCandidates(resolveMapBackground(slide.dataset.world, width)).then(url => {
      if (generation !== backgroundGeneration || !slide.isConnected) return;
      slide.classList.toggle("bg-layer__slide--placeholder", !url);
      slide.style.backgroundImage = url ? `url("${url}")` : "";
    });
  });
}
mapMobile.addEventListener("change", () => selectMapBackgrounds(bgSlides));

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
    slide.dataset.world = theme.world;
    slide.style.setProperty("--slide-accent", theme.accent);
    layer.appendChild(slide);
    slides.push(slide);
  }

  selectMapBackgrounds(slides);

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

let removeBgScrollListeners = () => {};
function observeBgSwitch(slides) {
  removeBgScrollListeners();
  activeChapter = null;
  // Run once immediately to set the initial slide.
  updateBgOnScroll(slides);
  // Throttled scroll listener — listen on #map-view (the actual scroll container)
  // AND window (fallback for non-Electron browsers where body scrolls).
  const scrollHandler = () => {
    if (bgScrollTicking) return;
    bgScrollTicking = true;
    requestAnimationFrame(() => { updateBgOnScroll(slides); bgScrollTicking = false; });
  };
  const mapView = document.getElementById("map-view");
  if (mapView) mapView.addEventListener("scroll", scrollHandler, { passive: true });
  window.addEventListener("scroll", scrollHandler, { passive: true });
  removeBgScrollListeners = () => {
    mapView?.removeEventListener("scroll", scrollHandler);
    window.removeEventListener("scroll", scrollHandler);
  };
}

function renderMap(library) {
  celebrationEffects.clear();
  const map = document.getElementById("map");
  map.innerHTML = "";

  // Keep the library for detail-view navigation (prev/next).
  currentLibrary = library;
  flatLevels = library.flatMap(ch => ch.levels.map(lv => withChapterContext(lv, ch)));

  adventureShell.render(summarizeAdventure(library));

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
    const chapterNumberEl = document.createElement("span");
    chapterNumberEl.className = "ch-no";
    chapterNumberEl.textContent = String(ci).padStart(2, "0");
    const chapterNameEl = document.createElement("span");
    chapterNameEl.className = "ch-name";
    chapterNameEl.textContent = chapter.title || prettyChapter(chapter.name);
    const chapterProgressEl = document.createElement("span");
    chapterProgressEl.className = "ch-progress";
    const completed = chapter.levels.filter(level => level.has_performance).length;
    chapterProgressEl.textContent = `★ ${completed}/${chapter.levels.length}`;
    heading.append(chapterNumberEl, chapterNameEl, chapterProgressEl);
    main.appendChild(heading);

    const levelsCol = document.createElement("div");
    levelsCol.className = "chapter-levels";

    let inChapter = 0;
    for (const rawLevel of chapter.levels) {
      const level = withChapterContext(rawLevel, chapter);
      const i = gIdx++;
      const wrap = createLevelNode(level, i, theme);
      const routeOffset = getScenicRouteOffset(i);
      wrap.style.setProperty("--route-x-desktop", `${routeOffset.desktopPx}px`);
      wrap.style.setProperty("--route-x-mobile", `${routeOffset.mobilePx}px`);
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
  document.fonts?.ready.then(() => requestAnimationFrame(drawMapPath));
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
// has an ivory body with a gold completed inner line and a teal current transition.
// Centers are measured from raw layout —
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

  // All layers retain the full route's control points. Only the emitted
  // segment range changes; the connector after current remains ivory.
  const d = buildSmoothPath(pts);
  let html = "";
  for (const layer of ["ground-shadow", "contact-shadow", "sidewall", "surface", "highlight", "seams"]) {
    html += `<path class="trail trail--${layer}" d="${d}"/>`;
  }
  const hasCurrent = [...nodes].some(node => node.classList.contains("level-node--current"));
  const completedEnd = splitIdx - (hasCurrent ? 2 : 1);
  if (completedEnd >= 1) {
    html += `<g class="trail--done"><path class="trail trail__progress" d="${buildSmoothPath(pts, { endIndex: completedEnd })}"/></g>`;
  }
  if (hasCurrent && completedEnd >= 0) {
    html += `<path class="trail trail--current" d="${buildSmoothPath(pts, { startIndex: completedEnd, endIndex: completedEnd + 1 })}"/>`;
  }
  svg.innerHTML = html;
}

// ===== level detail view =====
// A demo upload owns only this panel. Reopening the whole lesson would discard
// a camera session or unsaved playback started while that upload was pending.
function renderDetailDemo(level) {
  const demoWrap = document.getElementById("detail-demo");
  demoWrap.querySelectorAll("video").forEach(video => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  demoWrap.innerHTML = "";
  const refreshDemo = () => {
    const fresh = flatLevels.find(item => item.chapter === level.chapter && item.level === level.level);
    if (fresh) renderDetailDemo(fresh);
  };
  if (level.has_demo) {
    const video = document.createElement("video");
    video.src = videoURL(level.chapter, level.level, "demo");
    video.controls = true; video.preload = "metadata"; video.playsInline = true;
    demoWrap.append(video, makeActionButton("Replace", level, "demo", refreshDemo));
  } else {
    const slot = document.createElement("div");
    slot.className = "video-slot--empty video-slot--demo";
    slot.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/></svg><p>No demo yet</p>`;
    slot.appendChild(makeActionButton("Add demo", level, "demo", refreshDemo));
    demoWrap.appendChild(slot);
  }
}

function openDetail(level) {
  celebrationEffects.clear();
  adventureShell.close();
  adventureShell.selectLesson(level);
  disposeDetailMedia();
  const visit = detailVisit;
  const isCurrent = () => visit === detailVisit;
  selectedMedia = "performance";
  const mapView = document.getElementById("map-view");
  if (!mapView.classList.contains("hidden")) mapScrollY = mapView.scrollTop;
  const view = document.getElementById("detail-view");

  document.getElementById("detail-chapter").textContent = level.chapterTitle || prettyChapter(level.chapter);
  document.getElementById("detail-title").textContent = level.title;
  document.getElementById("detail-can-do").textContent = level.can_do || "";
  document.getElementById("detail-trigger").textContent = level.trigger || "";

  const patterns = document.getElementById("detail-patterns");
  patterns.innerHTML = "";
  (level.patterns || []).forEach(pat => {
    const pill = document.createElement("span");
    pill.className = "pattern-pill";
    pill.textContent = pat;
    patterns.appendChild(pill);
  });
  patterns.style.display = (level.patterns && level.patterns.length) ? "" : "none";

  renderDetailDemo(level);

  // Retain the existing status mount without duplicating the map's stars.
  const lit = level.has_performance;
  const starRow = document.getElementById("detail-star");
  starRow.innerHTML = "";
  if (lit) {
    const cap = document.createElement("span");
    cap.className = "star-cap";
    cap.textContent = "Your show is saved.";
    starRow.appendChild(cap);
  }

  // --- Performance video slot: recording if empty, playback if present ---
  const perfWrap = document.getElementById("detail-perf");
  perfWrap.innerHTML = "";
  if (level.has_performance) {
    const v = document.createElement("video");
    v.src = videoURL(level.chapter, level.level, "performance");
    v.controls = true; v.preload = "metadata"; v.playsInline = true;
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
    // The child's recording is the primary action, separate from demo uploads.
    const slot = document.createElement("div");
    slot.className = "video-slot--empty";
    slot.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v4m-3 0h6"/></svg><p>Record your roleplay</p>`;
    perfWrap.appendChild(slot);
    const recordBtn = document.createElement("button");
    recordBtn.type = "button";
    recordBtn.className = "action-btn record-start";
    recordBtn.textContent = "Start recording";
    recordBtn.addEventListener("click", () => startRecordingSession(level, perfWrap));
    perfWrap.appendChild(recordBtn);
  }

  const dialogueEl = document.getElementById("detail-dialogue");
  dialogueEl.innerHTML = "";
  const beatLabels = { goal: "Goal", change: "Something changes", resolve: "Resolve" };
  groupDialogueByPart(level.dialogue || []).forEach(group => {
    if (group.id) {
      const divider = document.createElement("div");
      divider.className = "dialogue-part";
      divider.textContent = `Part ${group.id} · ${beatLabels[group.beat] || group.beat}`;
      dialogueEl.appendChild(divider);
    }
    group.turns.forEach(turn => {
      const t = document.createElement("div");
      t.className = "turn " + (turn.speaker === "Child" ? "child" : "partner");
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = turn.speaker;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = turn.line;
      t.append(who, bubble);
      dialogueEl.appendChild(t);
    });
  });
  dialogueEl.style.display = (level.dialogue && level.dialogue.length) ? "" : "none";

  const replayWrap = document.getElementById("detail-replay-cards");
  replayWrap.innerHTML = "";
  normalizeReplayCards(level.replay_cards || []).forEach(card => {
    const article = document.createElement("article");
    article.className = "replay-card";
    const title = document.createElement("h3");
    title.textContent = card.title;
    article.appendChild(title);
    for (const [label, value] of [["Setting", card.setting], ["Change", card.change], ["Challenge", card.challenge]]) {
      if (!value) continue;
      const row = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      row.append(strong, document.createTextNode(value));
      article.appendChild(row);
    }
    replayWrap.appendChild(article);
  });

  const supportWrap = document.getElementById("detail-parent-support");
  supportWrap.innerHTML = "";
  (level.parent_support || []).forEach(tip => {
    const item = document.createElement("li");
    item.textContent = tip;
    supportWrap.appendChild(item);
  });

  // Fetch and render optional Sora prompts (A/B/C) for this level.
  const promptWrap = document.getElementById("detail-prompts");
  promptWrap.innerHTML = `<div class="prompt-loading">Loading prompts…</div>`;
  fetch(`/api/prompts/${level.chapter}/${level.level}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!isCurrent()) return;
      promptWrap.innerHTML = "";
      const parts = data ? promptParts(data) : [];
      if (parts.length === 0) {
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
          const done = () => { copyBtn.textContent = "Copied!"; setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500); };
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(() => _fallbackCopy(text, done));
          } else {
            _fallbackCopy(text, done);
          }
        });
        summary.append(labelEl, copyBtn);
        const pre = document.createElement("pre");
        pre.textContent = text;
        wrap.append(summary, pre);
        return wrap;
      };
      parts.forEach(part => {
        const block = makeBlock(part.label, part.text);
        if (block) promptWrap.appendChild(block);
      });
    })
    .catch(() => { if (isCurrent()) promptWrap.innerHTML = `<div class="prompt-empty">No prompts available</div>`; });

  // Prev / Next navigation — find this level in the flat list and wire buttons.
  const navWrap = document.getElementById("detail-nav");
  navWrap.innerHTML = "";
  const idx = flatLevels.findIndex(lv => lv.chapter === level.chapter && lv.level === level.level);
  if (idx >= 0) {
    const makeBtn = (label, offset, disabled) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `nav-btn nav-btn--${offset < 0 ? "prev" : "next"}`;
      const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${offset < 0 ? 'M19 12H5m7-7-7 7 7 7' : 'M5 12h14m-7-7 7 7-7 7'}"/></svg>`;
      btn.innerHTML = offset < 0 ? arrow : "";
      btn.appendChild(document.createTextNode(label));
      if (offset > 0) btn.insertAdjacentHTML("beforeend", arrow);
      if (disabled) { btn.disabled = true; }
      else { btn.addEventListener("click", () => openDetail(flatLevels[idx + offset])); }
      return btn;
    };
    navWrap.appendChild(makeBtn("Previous", -1, idx <= 0));
    navWrap.appendChild(makeBtn("Next", 1, idx >= flatLevels.length - 1));
  }

  mapView.classList.add("hidden");
  document.getElementById("bg-layer").classList.add("hidden");
  view.classList.remove("hidden");
  view.classList.add("open");
  view.querySelectorAll(".detail-disclosure").forEach(disclosure => { disclosure.open = false; });
  updateMediaView();
  view.scrollTop = 0;
  document.getElementById("back-btn").focus({ preventScroll: true });
}

// Re-open detail for the same level after an upload refreshes the library.
// Finds the updated level object in flatLevels (which loadLibrary repopulated).
function reopenDetail(chapter, level) {
  const fresh = flatLevels.find(lv => lv.chapter === chapter && lv.level === level);
  if (fresh) openDetail(fresh);
}

function closeDetail() {
  disposeDetailMedia();
  const view = document.getElementById("detail-view");
  view.classList.remove("open");
  view.classList.add("hidden");
  const mapView = document.getElementById("map-view");
  mapView.classList.remove("hidden");
  document.getElementById("bg-layer").classList.remove("hidden");
  celebratePendingCompletion();
  requestAnimationFrame(() => {
    drawMapPath();
    mapView.scrollTop = mapScrollY;
    activeChapter = null;
    // Delay bg refresh slightly so scroll position is restored first
    setTimeout(() => updateBgOnScroll(bgSlides), 50);
  });
}

function celebratePendingCompletion() {
  const map = document.getElementById("map-view");
  if (map.classList.contains("hidden")) return;

  const lessons = new Map([...map.querySelectorAll(".level-node-wrap--completed")]
    .filter(wrap => wrap.querySelector(".level-node__marker--star"))
    .map(wrap => [wrap.dataset.levelKey, wrap]));
  for (const key of celebrationQueue.drain(lessons.keys())) {
    const wrap = lessons.get(key);
    celebrationEffects.play(wrap, "level-node-wrap--just-completed", wrap.querySelector(".level-node__marker--star"));
  }

  const chapters = new Map([...map.querySelectorAll(".chapter-world")]
    .filter(chapter => chapter.querySelector(".chapter-heading")
      && !chapter.querySelector(".level-node-wrap:not(.level-node-wrap--completed)"))
    .map(chapter => [chapter.dataset.chapter, chapter]));
  for (const key of chapterCelebrationQueue.drain(chapters.keys())) {
    const chapter = chapters.get(key);
    celebrationEffects.play(chapter, "chapter-world--just-completed", chapter.querySelector(".chapter-heading"));
  }
}

// ===== resilient library loading (loading / error / retry) =====
// toggles ONLY these three; never hides the detail view
function showOnly(id) {
  showMapLoadState(document, id);
}
async function loadLibrary({ isCurrent = () => true } = {}) {
  // A detail upload refreshes in the background. Keep the existing map usable
  // if the family navigates away before that request finishes.
  if (!currentLibrary.length && !document.getElementById("map-view").classList.contains("hidden")) showOnly("map-loading");
  try {
    const response = await fetch("/api/library", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`library ${response.status}`);
    const library = await response.json();
    if (!isCurrent()) return false;
    renderMap(library);
    showOnly("map-scroll");
    return true;
  } catch (error) {
    if (!isCurrent()) return false;
    console.error("Unable to load library", error);
    showMapLoadError(document, { hasLibrary: currentLibrary.length > 0 });
    return false;
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
import { initProfile } from './profile.mjs';

async function init() {
  let profileUI;
  // Check login status before loading the app
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.username) {
      window.location.href = "/login";
      return;
    }
  // Show username in menu trigger
  profileUI = initProfile(data);
  if (data.isAdmin) {
    const adminSection = document.getElementById("admin-section");
    if (adminSection) adminSection.style.display = "";
  }
  } catch (_) {
    window.location.href = "/login";
    return;
  }

  document.getElementById("back-btn").addEventListener("click", closeDetail);
  for (const kind of ["performance", "demo"]) {
    const tab = document.getElementById(`media-tab-${kind}`);
    tab.addEventListener("click", () => {
      selectedMedia = kind;
      updateMediaView();
    });
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? "performance" : event.key === "End" ? "demo" : kind === "performance" ? "demo" : "performance";
      const target = document.getElementById(`media-tab-${next}`);
      if (!target.disabled) { target.click(); target.focus(); }
    });
  }
  mobileMedia.addEventListener("change", updateMediaView);
  window.addEventListener("pagehide", disposeDetailMedia);

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
    profileUI?.clear();
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
