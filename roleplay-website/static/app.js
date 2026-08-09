// ============================================================
// My English Adventure — chapter-world map
// Ten deterministic chapter worlds; each is a 3-column grid.
// ============================================================

import { getChapterTheme, getLevelVisualState, getStableRotation, isFrameDark } from "./map-model.mjs";
import { buildSceneSpec, renderChapterScenery } from "./map-scenes.mjs";

function prettyChapter(raw) {
  const s = raw.replace(/^\d+-/, "");
  return s.split("-").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
const chapterIndex = (name) => parseInt((name.match(/^(\d+)/) || [0, 1])[1], 10);
const videoURL = (chapter, level, kind) => `/video/${chapter}/${level}/${kind}`;

// ===== svg bits =====
const PLAY_BTN_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#fff"/></svg>`;
const LOCK_SVG = `<svg class="lock" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.4" fill="#b6a99a"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#b6a99a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="15.4" r="1.7" fill="#fff7ec"/></svg>`;

const STAR_PATH = "M12 17.27 L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z";
const starSVG = (lit) => {
  const fill = lit ? "#ffd23f" : "#e6ddca";
  const stroke = lit ? "#f0a500" : "#c2b7a2";
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/></svg>`;
};

// ===== frame extraction for the child's face cover =====
// Seeks to 20% of the performance video, draws to a canvas, inspects pixels,
// and only returns a JPEG data URL when isFrameDark is false. Resolves null
// on timeout, media error, zero dimensions, canvas/tainted error, OR a dark frame.
const frameCache = new Map();
const frameKey = (ch, lv, kind) => `${ch}/${lv}/${kind}`;
function extractSafeCover(level, theme, ratio = 0.2) {
  const key = frameKey(level.chapter, level.level, "performance");
  if (frameCache.has(key)) return Promise.resolve(frameCache.get(key));
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.src = videoURL(level.chapter, level.level, "performance");
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
        const scale = Math.min(1, 280 / Math.max(w, h));
        const cv = document.createElement("canvas");
        cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
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
let currentNodes = [];
let revealObserver = null;
let mapScrollY = 0;

// Gold star badge for completed nodes. Placed OUTSIDE the cover-clipping layer
// on the overflow:visible .level-node so it is never cropped.
const STAR_BADGE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="#ffd23f" stroke="#f0a500" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

// Builds the level node for every state (completed / current / locked).
// Returns a <button class="level-node-wrap level-node-wrap--STATE"> with an
// inner .level-node (sized via CSS) and a .level-title beneath it. Every state
// is clickable (no disabled attribute) and opens the detail view.
function createLevelNode(level, index, theme) {
  const state = getLevelVisualState(level);

  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = `level-node-wrap level-node-wrap--${state}`;
  wrap.setAttribute("aria-label", level.title);

  const node = document.createElement("span");
  node.className = `level-node level-node--${state}`;

  if (state === "completed") {
    node.style.setProperty("--polaroid-rotation", getStableRotation(index) + "deg");

    const cover = document.createElement("span");
    cover.className = "level-node__cover";
    node.appendChild(cover);

    // Gold star sits OUTSIDE the cover-clipping layer (the .level-node has
    // overflow:visible; only the __cover layer clips).
    const star = document.createElement("span");
    star.className = "level-node__star";
    star.innerHTML = STAR_BADGE_SVG;
    node.appendChild(star);

    extractSafeCover(level, theme).then(url => {
      if (url) {
        cover.style.backgroundImage = `url("${url}")`;
      } else {
        cover.classList.add("level-node--fallback");
        cover.style.setProperty("--fallback-accent", theme.accent);
      }
    });
  } else if (state === "current") {
    node.innerHTML = `<span class="play-btn">${PLAY_BTN_SVG}</span>`;
  } else {
    node.innerHTML = LOCK_SVG;
  }

  const title = document.createElement("span");
  title.className = "level-title";
  title.textContent = level.title;

  wrap.appendChild(node);
  wrap.appendChild(title);
  wrap.addEventListener("click", () => openDetail(level));

  return wrap;
}

function renderMap(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";
  currentNodes = [];

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
    section.style.setProperty("--chapter-gradient", theme.gradient);
    section.style.setProperty("--chapter-accent", theme.accent);
    section.dataset.world = theme.world;

    const leftSide = document.createElement("div");
    leftSide.className = "chapter-side chapter-side--left";
    leftSide.setAttribute("aria-hidden", "true");

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
      currentNodes.push({ node: wrap.querySelector(".level-node"), level });
    }

    main.appendChild(levelsCol);

    const rightSide = document.createElement("div");
    rightSide.className = "chapter-side chapter-side--right";
    rightSide.setAttribute("aria-hidden", "true");

    section.appendChild(leftSide);
    section.appendChild(main);
    section.appendChild(rightSide);

    renderChapterScenery(leftSide, rightSide, buildSceneSpec(chapter.name, ci * 7919 + 13));

    map.appendChild(section);
  }

  requestAnimationFrame(() => {
    drawPath();
    observeReveal();
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

function drawPath() {
  const svg = document.getElementById("path-svg");
  const scroll = document.getElementById("map-scroll");
  if (!scroll) return;
  const w = scroll.clientWidth, h = scroll.scrollHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  const base = scroll.getBoundingClientRect();
  const pts = [];
  for (const { node } of currentNodes) {
    const r = node.getBoundingClientRect();
    pts.push([r.left + r.width / 2 - base.left + scroll.scrollLeft,
              r.top + r.height / 2 - base.top + scroll.scrollTop]);
  }
  if (pts.length >= 2) svg.innerHTML = `<path class="trail" d="${smoothPath(pts)}"/>`;
  else svg.innerHTML = "";
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const t = 0.16;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
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

  const sceneEl = document.getElementById("detail-scene");
  sceneEl.textContent = level.scene || "";
  sceneEl.style.display = level.scene ? "" : "none";

  const demoWrap = document.getElementById("detail-demo");
  demoWrap.innerHTML = "";
  if (level.has_demo) {
    const v = document.createElement("video");
    v.src = videoURL(level.chapter, level.level, "demo");
    v.controls = true; v.preload = "metadata"; v.playsInline = true;
    v.playbackRate = 0.75;
    demoWrap.appendChild(v);
  } else {
    demoWrap.innerHTML = `<div class="coming-soon">Demo coming soon</div>`;
  }

  const lit = level.has_performance;
  const starRow = document.getElementById("detail-star");
  starRow.innerHTML = "";
  const star = document.createElement("span");
  star.className = "big-star";
  star.innerHTML = starSVG(lit);
  const cap = document.createElement("span");
  cap.className = "star-cap";
  cap.textContent = lit
    ? "You did it! Your show is saved below."
    : "Practice together, then add performance.mp4 to light the star!";
  starRow.appendChild(star);
  starRow.appendChild(cap);

  const perfWrap = document.getElementById("detail-perf");
  perfWrap.innerHTML = "";
  if (level.has_performance) {
    const lbl = document.createElement("div");
    lbl.className = "perf-cap";
    lbl.textContent = "Your show";
    const v = document.createElement("video");
    v.src = videoURL(level.chapter, level.level, "performance");
    v.controls = true; v.preload = "metadata"; v.playsInline = true;
    v.playbackRate = 1.0;
    perfWrap.appendChild(lbl);
    perfWrap.appendChild(v);
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

  document.getElementById("map-view").classList.add("hidden");
  view.classList.remove("hidden");
  view.classList.add("open");
  window.scrollTo(0, 0);
}

function closeDetail() {
  document.querySelectorAll("#detail-view video").forEach(v => {
    v.pause(); v.removeAttribute("src"); v.load();
  });
  const view = document.getElementById("detail-view");
  view.classList.remove("open");
  view.classList.add("hidden");
  document.getElementById("map-view").classList.remove("hidden");
  requestAnimationFrame(() => {
    drawPath();
    window.scrollTo(0, mapScrollY);
  });
}

// ===== init =====
async function init() {
  const library = await (await fetch("/api/library")).json();
  renderMap(library);
  document.getElementById("back-btn").addEventListener("click", closeDetail);

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawPath);
  setTimeout(drawPath, 700);

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(drawPath, 120);
  });
}
init();
