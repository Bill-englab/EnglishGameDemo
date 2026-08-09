// ============================================================
// My English Adventure — minimal glassmorphism map + side decor
// ============================================================

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

// tiger mascot — waves from the start point
const MASCOT_SVG = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="36" cy="110" rx="13" ry="9" fill="#ffae5c" stroke="#4a3327" stroke-width="3.5"/>
  <ellipse cx="84" cy="110" rx="13" ry="9" fill="#ffae5c" stroke="#4a3327" stroke-width="3.5"/>
  <circle cx="60" cy="56" r="44" fill="#ffae5c" stroke="#4a3327" stroke-width="3.5"/>
  <circle cx="29" cy="24" r="15" fill="#ffae5c" stroke="#4a3327" stroke-width="3.5"/>
  <circle cx="91" cy="24" r="15" fill="#ffae5c" stroke="#4a3327" stroke-width="3.5"/>
  <circle cx="29" cy="26" r="7" fill="#ff7a9d"/>
  <circle cx="91" cy="26" r="7" fill="#ff7a9d"/>
  <path d="M45 17 q3 11 1 20" stroke="#4a3327" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M60 12 v22" stroke="#4a3327" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M75 17 q-3 11 -1 20" stroke="#4a3327" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M15 50 h13" stroke="#4a3327" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M92 50 h13" stroke="#4a3327" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M17 62 h10" stroke="#4a3327" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M93 62 h10" stroke="#4a3327" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="35" cy="68" rx="9" ry="6" fill="#ff8fa8" opacity="0.7"/>
  <ellipse cx="85" cy="68" rx="9" ry="6" fill="#ff8fa8" opacity="0.7"/>
  <ellipse cx="60" cy="72" rx="22" ry="15" fill="#fff3e2"/>
  <ellipse cx="45" cy="55" rx="8" ry="10" fill="#2a1a0a"/>
  <ellipse cx="75" cy="55" rx="8" ry="10" fill="#2a1a0a"/>
  <circle cx="47.5" cy="51" r="3" fill="#fff"/>
  <circle cx="77.5" cy="51" r="3" fill="#fff"/>
  <path d="M55 66 q5 -5 10 0 q-1 4 -5 4 q-4 0 -5 -4 z" fill="#3a2a1a"/>
  <path d="M60 70 q-5 6 -11 3" stroke="#3a2a1a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M60 70 q5 6 11 3" stroke="#3a2a1a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M40 71 q-11 -1 -17 -4" stroke="#4a3327" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>
  <path d="M40 75 q-11 2 -17 2" stroke="#4a3327" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>
  <path d="M80 71 q11 -1 17 -4" stroke="#4a3327" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>
  <path d="M80 75 q11 2 17 2" stroke="#4a3327" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>
</svg>`;

const STAR_PATH = "M12 17.27 L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z";
const starSVG = (lit) => {
  const fill = lit ? "#ffd23f" : "#e6ddca";
  const stroke = lit ? "#f0a500" : "#c2b7a2";
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/></svg>`;
};

// ===== side scenery (decorative, animated) =====
const FLOWER_COLORS = ["#ff8fa8", "#ffd23f", "#ff9d4d", "#e85fa0", "#9d6fd6"];
const SCENERY = {
  tree: `<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="50" width="8" height="32" rx="3" fill="#7a4a22"/><circle cx="30" cy="34" r="22" fill="#4aa53a"/><circle cx="16" cy="44" r="14" fill="#5cc14a"/><circle cx="44" cy="44" r="14" fill="#5cc14a"/><circle cx="30" cy="22" r="13" fill="#6dd056"/></svg>`,
  bush: `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="30" rx="15" ry="11" fill="#5cc14a"/><ellipse cx="38" cy="24" rx="19" ry="15" fill="#4aa53a"/><ellipse cx="58" cy="31" rx="14" ry="11" fill="#5cc14a"/></svg>`,
  mushroom: `<svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="8" height="18" rx="3" fill="#fff3e0"/><path d="M5 26 Q20 2 35 26 Z" fill="#e8513f"/><circle cx="14" cy="20" r="2.6" fill="#fff"/><circle cx="25" cy="15" r="2" fill="#fff"/><circle cx="28" cy="22" r="2.4" fill="#fff"/></svg>`,
  rock: `<svg viewBox="0 0 52 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 30 Q7 10 24 8 Q42 6 48 30 Z" fill="#9aa3ab"/><path d="M4 30 Q14 18 26 19 Q38 20 48 30 Z" fill="#b9c0c7"/></svg>`,
  grass: `<svg viewBox="0 0 44 30" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round"><path d="M8 30 Q10 8 15 30" stroke="#4aa53a" stroke-width="3"/><path d="M20 30 Q24 4 28 30" stroke="#5cc14a" stroke-width="3"/><path d="M30 30 Q34 10 38 30" stroke="#4aa53a" stroke-width="3"/></svg>`,
  cloud: `<svg viewBox="0 0 90 42" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="28" rx="17" ry="12" fill="#fff"/><ellipse cx="46" cy="22" rx="22" ry="16" fill="#fff"/><ellipse cx="68" cy="29" rx="16" ry="12" fill="#fff"/><ellipse cx="46" cy="31" rx="30" ry="9" fill="#fff"/></svg>`,
  sun: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"><line x1="32" y1="4" x2="32" y2="13"/><line x1="32" y1="51" x2="32" y2="60"/><line x1="4" y1="32" x2="13" y2="32"/><line x1="51" y1="32" x2="60" y2="32"/><line x1="12" y1="12" x2="18" y2="18"/><line x1="46" y1="46" x2="52" y2="52"/><line x1="52" y1="12" x2="46" y2="18"/><line x1="18" y1="46" x2="12" y2="52"/></g><circle cx="32" cy="32" r="13" fill="#ffd23f"/></svg>`,
};
const flower = (c) => `<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 52 V30" stroke="#3c7d1c" stroke-width="3" stroke-linecap="round"/><path d="M20 40 Q12 34 10 28" stroke="#3c7d1c" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="22" r="6.5" fill="${c}"/><circle cx="28" cy="22" r="6.5" fill="${c}"/><circle cx="20" cy="14" r="6.5" fill="${c}"/><circle cx="20" cy="30" r="6.5" fill="${c}"/><circle cx="20" cy="22" r="5" fill="#ffd23f"/></svg>`;
const butterfly = (c) => `<svg viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="30" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="13" cy="24" rx="8" ry="6" fill="${c}" opacity=".8"/><ellipse cx="29" cy="24" rx="8" ry="6" fill="${c}" opacity=".8"/><rect x="20" y="6" width="2" height="24" rx="1" fill="#3a2a1a"/></svg>`;

// deterministic PRNG so a given chapter always dresses the same way
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function placeScenery(section, o) {
  const el = document.createElement("div");
  el.className = "scenery " + (o.cls || "");
  el.innerHTML = o.svg;
  el.style[o.side] = o.x + "%";
  el.style.top = o.top + "%";
  el.style.width = o.w + "px";
  el.style.setProperty("--d", (o.delay || 0).toFixed(2) + "s");
  if (o.flip) el.classList.add("flip");
  section.appendChild(el);
}

function renderScenery(section, ci) {
  const rand = mulberry32(ci * 2017 + 13);
  const vw = window.innerWidth;
  const s = vw < 520 ? 0.7 : vw < 820 ? 0.85 : 1;

  if (ci % 2 === 1) placeScenery(section, { svg: SCENERY.sun, cls: "floater sun", side: rand() > .5 ? "left" : "right", x: 3 + rand() * 12, top: 2 + rand() * 5, w: 62 * s, delay: 0 });
  const clouds = vw < 520 ? 1 : 2;
  for (let i = 0; i < clouds; i++) placeScenery(section, { svg: SCENERY.cloud, cls: "cloud", side: rand() > .5 ? "left" : "right", x: 2 + rand() * 12, top: 5 + rand() * 14, w: (80 + rand() * 50) * s, delay: rand() * 5 });

  const pool = ["tree", "bush", "flower", "mushroom", "rock", "grass"];
  const groundN = vw < 520 ? 3 : 5;
  for (let i = 0; i < groundN; i++) {
    const type = pool[Math.floor(rand() * pool.length)];
    const svg = type === "flower" ? flower(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]) : SCENERY[type];
    placeScenery(section, { svg, cls: "ground " + type, side: rand() > .5 ? "left" : "right", x: 1 + rand() * 15, top: 10 + rand() * 70, w: (48 + rand() * 46) * s, delay: rand() * 4, flip: rand() > .5 });
  }

  const flies = vw < 520 ? 1 : 2;
  for (let i = 0; i < flies; i++) placeScenery(section, { svg: butterfly(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]), cls: "butterfly", side: rand() > .5 ? "left" : "right", x: 3 + rand() * 13, top: 24 + rand() * 46, w: (28 + rand() * 12) * s, delay: rand() * 3 });
}

// ===== frame extraction for the child's face cover =====
const frameCache = new Map();
const frameKey = (ch, lv, kind) => `${ch}/${lv}/${kind}`;
function extractFrame(chapter, level, kind, ratio = 0.2) {
  const key = frameKey(chapter, level, kind);
  if (frameCache.has(key)) return Promise.resolve(frameCache.get(key));
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    v.src = videoURL(chapter, level, kind);
    let done = false;
    const finish = (val) => {
      if (done) return; done = true; clearTimeout(to);
      v.removeAttribute("src"); v.load();
      frameCache.set(key, val); resolve(val);
    };
    const to = setTimeout(() => finish(null), 4500);
    v.addEventListener("loadedmetadata", () => {
      const d = v.duration || 1;
      v.currentTime = Math.min(Math.max(0.3, d * ratio), d - 0.05);
    });
    v.addEventListener("seeked", () => {
      try {
        const w = v.videoWidth || 320, h = v.videoHeight || 240;
        const scale = Math.min(1, 280 / Math.max(w, h));
        const cv = document.createElement("canvas");
        cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
        cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
        finish(cv.toDataURL("image/jpeg", 0.72));
      } catch (_) { finish(null); }
    });
    v.addEventListener("error", () => finish(null));
  });
}

// ===== map rendering =====
let currentNodes = [];
let revealObserver = null;
let mapScrollY = 0;
let startEl = null;

function nodeState(level) {
  if (level.has_performance) return "completed";
  if (level.current) return "current";
  return "locked";
}

function renderMap(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";
  currentNodes = [];
  startEl = null;

  const amp = Math.min(150, Math.max(28, window.innerWidth * 0.14));
  const total = library.reduce((n, ch) => n + ch.levels.length, 0);
  const done = library.reduce((n, ch) => n + ch.levels.filter(l => l.has_performance).length, 0);
  document.getElementById("star-total").textContent = total;
  document.getElementById("star-count").textContent = done;

  // ---- big start point at the top (tiger waves; trail begins here) ----
  const hero = document.createElement("div");
  hero.className = "start-hero";
  hero.innerHTML = `<div class="start-medal"><span class="mascot">${MASCOT_SVG}</span></div><div class="start-cap">Start here!</div>`;
  hero.addEventListener("click", () => {
    const cur = document.querySelector(".node-wrap.current");
    if (cur) cur.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  map.appendChild(hero);
  startEl = hero.querySelector(".start-medal");

  // ---- chapters top-to-bottom, level 1 at the top ----
  let gIdx = 0;
  for (const chapter of library) {
    const ci = chapterIndex(chapter.name);
    const section = document.createElement("section");
    section.className = "chapter";

    const sign = document.createElement("div");
    sign.className = "chapter-label";
    sign.innerHTML = `<span class="ch-no">Ch ${String(ci).padStart(2, "0")}</span><span class="ch-name">${prettyChapter(chapter.name)}</span>`;
    section.appendChild(sign);

    let inChapter = 0;
    for (const level of chapter.levels) {
      const i = gIdx++;
      const state = nodeState(level);

      const wrap = document.createElement("button");
      wrap.type = "button";
      wrap.className = "node-wrap" + (level.current ? " current" : "");
      wrap.style.setProperty("--zig", (Math.sin(i * 0.8) * amp).toFixed(1) + "px");
      wrap.style.setProperty("--d", (inChapter++ * 0.07).toFixed(2) + "s");
      wrap.setAttribute("aria-label", level.title);

      const node = document.createElement("span");
      node.className = "node " + state;
      if (state === "completed") {
        node.style.setProperty("--rot", ((((i * 53) % 7)) - 3) + "deg");
      }

      const inner = document.createElement("span");
      inner.className = "node-inner";
      node.appendChild(inner);

      if (state === "completed") {
        extractFrame(level.chapter, level.level, "performance").then(url => {
          if (url) inner.style.backgroundImage = `url("${url}")`;
        });
      } else if (state === "current") {
        inner.innerHTML = `<span class="play-btn">${PLAY_BTN_SVG}</span>`;
      } else {
        inner.innerHTML = LOCK_SVG;
      }

      const label = document.createElement("span");
      label.className = "node-label";
      label.textContent = level.title;

      wrap.appendChild(node);
      wrap.appendChild(label);
      wrap.addEventListener("click", () => openDetail(level));
      section.appendChild(wrap);
      currentNodes.push({ node, level });
    }

    renderScenery(section, ci);
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
  document.querySelectorAll(".chapter, .node-wrap, .start-hero").forEach(el => revealObserver.observe(el));
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
  if (startEl) {
    const r = startEl.getBoundingClientRect();
    pts.push([r.left + r.width / 2 - base.left + scroll.scrollLeft,
              r.top + r.height / 2 - base.top + scroll.scrollTop]);
  }
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
