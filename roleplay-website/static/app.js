// ============================================================
// My English Adventure — storybook map orchestrator
// ============================================================

// 10 chapter color worlds: top, bottom, glow, accent, accent-deep
const PALETTES = {
  1:  { top: "#ffe1b0", bot: "#ff9d4d", glow: "rgba(255,210,140,.55)", accent: "#f0772b", deep: "#c75a1e" },
  2:  { top: "#ffc2dd", bot: "#ff8ab3", glow: "rgba(255,180,210,.55)", accent: "#e85fa0", deep: "#c43d7e" },
  3:  { top: "#bfe9ff", bot: "#6fc3f7", glow: "rgba(180,225,255,.60)", accent: "#2f9fe0", deep: "#1d7eb0" },
  4:  { top: "#cdeec0", bot: "#79d97f", glow: "rgba(190,235,170,.55)", accent: "#3fae3f", deep: "#2f8a30" },
  5:  { top: "#ffe9a8", bot: "#ffc83d", glow: "rgba(255,225,140,.55)", accent: "#f0a514", deep: "#c08000" },
  6:  { top: "#ffc6ad", bot: "#ff8a72", glow: "rgba(255,190,165,.55)", accent: "#ef5a45", deep: "#d23f2c" },
  7:  { top: "#c7f0e6", bot: "#6fd9c4", glow: "rgba(180,235,220,.55)", accent: "#2fae97", deep: "#1f8c78" },
  8:  { top: "#c7d4ff", bot: "#7c8fe8", glow: "rgba(195,205,255,.60)", accent: "#5a6fd6", deep: "#4257b0" },
  9:  { top: "#ffd6bd", bot: "#ff9d70", glow: "rgba(255,200,170,.55)", accent: "#ef7a3c", deep: "#d05a1e" },
  10: { top: "#d9c9ff", bot: "#9070e0", glow: "rgba(215,200,255,.60)", accent: "#7650c8", deep: "#5a3ea5" },
};

const chapterIndex = (name) => parseInt((name.match(/^(\d+)/) || [0, 1])[1], 10);
const paletteOf = (name) => PALETTES[chapterIndex(name)] || PALETTES[1];

function prettyChapter(raw) {
  const s = raw.replace(/^\d+-/, "");
  return s.split("-").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ===== svg bits =====
const MASCOT_SVG = `
<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M90 96 q22 -4 18 -26" fill="#ff9a3c" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="60" cy="106" rx="35" ry="30" fill="#ff9a3c" stroke="#3a2a1a" stroke-width="3"/>
  <path d="M33 114 q27 18 54 0 l-4 -14 q-23 10 -46 0 z" fill="#ffd83d" stroke="#3a2a1a" stroke-width="3"/>
  <path d="M44 104 q4 10 2 20" stroke="#3a2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M76 104 q-4 10 -2 20" stroke="#3a2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="52" r="34" fill="#ff9a3c" stroke="#3a2a1a" stroke-width="3"/>
  <circle cx="34" cy="28" r="11" fill="#ff9a3c" stroke="#3a2a1a" stroke-width="3"/>
  <circle cx="86" cy="28" r="11" fill="#ff9a3c" stroke="#3a2a1a" stroke-width="3"/>
  <circle cx="34" cy="29" r="5" fill="#ff5d73"/>
  <circle cx="86" cy="29" r="5" fill="#ff5d73"/>
  <path d="M44 26 q4 9 2 17" stroke="#3a2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M60 22 v18" stroke="#3a2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M76 26 q-4 9 -2 17" stroke="#3a2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="60" r="7" fill="#ffb3a0" opacity="0.85"/>
  <circle cx="80" cy="60" r="7" fill="#ffb3a0" opacity="0.85"/>
  <circle cx="48" cy="50" r="6" fill="#2a1a0a"/>
  <circle cx="72" cy="50" r="6" fill="#2a1a0a"/>
  <circle cx="50" cy="48" r="2" fill="#fff"/>
  <circle cx="74" cy="48" r="2" fill="#fff"/>
  <ellipse cx="60" cy="64" rx="10" ry="7" fill="#fff1e0"/>
  <circle cx="60" cy="61" r="2.6" fill="#3a2a1a"/>
  <path d="M60 64 q0 4 -4 5" stroke="#3a2a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M60 64 q0 4 4 5" stroke="#3a2a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

const STAR_PATH = "M12 17.27 L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z";
const starSVG = (lit) => {
  const fill = lit ? "#ffd23f" : "#e6ddca";
  const stroke = lit ? "#f0a500" : "#c2b7a2";
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${STAR_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/></svg>`;
};
const PLAY_SVG = `<svg class="play-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#fff"/></svg>`;
const SPROUT_SVG = `<svg class="sprout" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21v-7" stroke="#3c7d1c" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M12 14c0-3-2.6-5-6-5 0 3 2.6 5 6 5z" fill="#6fc23a"/><path d="M12 12c0-3 2.6-5 6-5 0 3-2.6 5-6 5z" fill="#7ed957"/></svg>`;

const videoURL = (chapter, level, kind) => `/video/${chapter}/${level}/${kind}`;

// ===== scenery (fills the gutters beside the path) =====
const NIGHT_CHAPTERS = new Set([8, 10]);
const SCENERY = {
  tree: `<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="50" width="8" height="32" rx="3" fill="#7a4a22"/><circle cx="30" cy="34" r="22" fill="#4aa53a"/><circle cx="16" cy="44" r="14" fill="#5cc14a"/><circle cx="44" cy="44" r="14" fill="#5cc14a"/><circle cx="30" cy="22" r="13" fill="#6dd056"/></svg>`,
  treeSil: `<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="50" width="8" height="32" rx="3" fill="#16243f"/><circle cx="30" cy="34" r="22" fill="#1f3358"/><circle cx="16" cy="44" r="14" fill="#243a66"/><circle cx="44" cy="44" r="14" fill="#243a66"/><circle cx="30" cy="22" r="13" fill="#2a4576"/></svg>`,
  bush: `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="30" rx="15" ry="11" fill="#5cc14a"/><ellipse cx="38" cy="24" rx="19" ry="15" fill="#4aa53a"/><ellipse cx="58" cy="31" rx="14" ry="11" fill="#5cc14a"/></svg>`,
  bushSil: `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="30" rx="15" ry="11" fill="#22365f"/><ellipse cx="38" cy="24" rx="19" ry="15" fill="#1a2a4a"/><ellipse cx="58" cy="31" rx="14" ry="11" fill="#22365f"/></svg>`,
  mushroom: `<svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="8" height="18" rx="3" fill="#fff3e0"/><path d="M5 26 Q20 2 35 26 Z" fill="#e8513f"/><circle cx="14" cy="20" r="2.6" fill="#fff"/><circle cx="25" cy="15" r="2" fill="#fff"/><circle cx="28" cy="22" r="2.4" fill="#fff"/></svg>`,
  rock: `<svg viewBox="0 0 52 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 30 Q7 10 24 8 Q42 6 48 30 Z" fill="#9aa3ab"/><path d="M4 30 Q14 18 26 19 Q38 20 48 30 Z" fill="#b9c0c7"/></svg>`,
  grass: `<svg viewBox="0 0 44 30" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round"><path d="M8 30 Q10 8 15 30" stroke="#4aa53a" stroke-width="3"/><path d="M20 30 Q24 4 28 30" stroke="#5cc14a" stroke-width="3"/><path d="M30 30 Q34 10 38 30" stroke="#4aa53a" stroke-width="3"/></svg>`,
  cloud: `<svg viewBox="0 0 90 42" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="28" rx="17" ry="12" fill="#fff"/><ellipse cx="46" cy="22" rx="22" ry="16" fill="#fff"/><ellipse cx="68" cy="29" rx="16" ry="12" fill="#fff"/><ellipse cx="46" cy="31" rx="30" ry="9" fill="#fff"/></svg>`,
  sun: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"><line x1="32" y1="4" x2="32" y2="13"/><line x1="32" y1="51" x2="32" y2="60"/><line x1="4" y1="32" x2="13" y2="32"/><line x1="51" y1="32" x2="60" y2="32"/><line x1="12" y1="12" x2="18" y2="18"/><line x1="46" y1="46" x2="52" y2="52"/><line x1="52" y1="12" x2="46" y2="18"/><line x1="18" y1="46" x2="12" y2="52"/></g><circle cx="32" cy="32" r="13" fill="#ffd23f"/></svg>`,
  moon: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><path d="M38 6 a22 22 0 1 0 12 34 a17 17 0 1 1 -12 -34 Z" fill="#fdf3c0"/></svg>`,
  star: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1.5 L14 9.5 22 12 14 14.5 12 22.5 10 14.5 2 12 10 9.5 Z" fill="#fffce0"/></svg>`,
  firefly: `<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="6" fill="#fff7a8" opacity=".3"/><circle cx="7" cy="7" r="2.6" fill="#fff7a8"/></svg>`,
};
const flower = c => `<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 52 V30" stroke="#3c7d1c" stroke-width="3" stroke-linecap="round"/><path d="M20 40 Q12 34 10 28" stroke="#3c7d1c" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="22" r="6.5" fill="${c}"/><circle cx="28" cy="22" r="6.5" fill="${c}"/><circle cx="20" cy="14" r="6.5" fill="${c}"/><circle cx="20" cy="30" r="6.5" fill="${c}"/><circle cx="20" cy="22" r="5" fill="#ffd23f"/></svg>`;
const butterfly = c => `<svg viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="30" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="13" cy="24" rx="8" ry="6" fill="${c}" opacity=".8"/><ellipse cx="29" cy="24" rx="8" ry="6" fill="${c}" opacity=".8"/><rect x="20" y="6" width="2" height="24" rx="1" fill="#3a2a1a"/></svg>`;
const hill = c => `<svg viewBox="0 0 320 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 120 Q70 28 160 58 T320 46 V120 Z" fill="${c}"/></svg>`;

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
  if (o.opacity != null) el.style.opacity = o.opacity;
  if (o.flip) el.classList.add("flip");
  section.appendChild(el);
}

function renderScenery(section, ci, p) {
  const rand = mulberry32(ci * 2017 + 13);
  const night = NIGHT_CHAPTERS.has(ci);
  const vw = window.innerWidth;
  const s = vw < 520 ? 0.68 : vw < 820 ? 0.85 : 1;

  // rolling background hills, wide + soft, tinted by the chapter sky
  placeScenery(section, { svg: hill(night ? "#22365f" : p.top), cls: "hill", side: "left", x: -4, top: night ? 48 : 54, w: vw * 0.62, opacity: night ? .55 : .5, delay: 0 });
  placeScenery(section, { svg: hill(night ? "#1a2a4a" : "#ffffff"), cls: "hill", side: "right", x: -4, top: night ? 60 : 66, w: vw * 0.6, opacity: night ? .5 : .4, delay: 0 });

  // ground clusters in the gutters
  const pool = night ? ["treeSil", "bushSil", "rock", "grass"] : ["tree", "bush", "flower", "mushroom", "rock", "grass"];
  const groundN = vw < 520 ? 3 : 5;
  for (let i = 0; i < groundN; i++) {
    const type = pool[Math.floor(rand() * pool.length)];
    const svg = type === "flower" ? flower(p.accent) : SCENERY[type];
    placeScenery(section, { svg, cls: "ground " + type, side: rand() > .5 ? "left" : "right", x: 1 + rand() * 13, top: 8 + rand() * 72, w: (44 + rand() * 40) * s, delay: rand() * 4, flip: rand() > .5 });
  }

  if (night) {
    placeScenery(section, { svg: SCENERY.moon, cls: "floater moon", side: rand() > .5 ? "left" : "right", x: 5 + rand() * 8, top: 3 + rand() * 7, w: 52 * s, delay: 0 });
    const stars = vw < 520 ? 4 : 8;
    for (let i = 0; i < stars; i++) placeScenery(section, { svg: SCENERY.star, cls: "twinkle", side: rand() > .5 ? "left" : "right", x: 2 + rand() * 17, top: 3 + rand() * 45, w: (9 + rand() * 12) * s, delay: rand() * 3 });
    const flies = vw < 520 ? 2 : 4;
    for (let i = 0; i < flies; i++) placeScenery(section, { svg: SCENERY.firefly, cls: "firefly", side: rand() > .5 ? "left" : "right", x: 3 + rand() * 15, top: 22 + rand() * 55, w: (10 + rand() * 6) * s, delay: rand() * 3 });
  } else {
    if (ci % 2 === 1) placeScenery(section, { svg: SCENERY.sun, cls: "floater sun", side: rand() > .5 ? "left" : "right", x: 4 + rand() * 8, top: 2 + rand() * 6, w: 58 * s, delay: 0 });
    const clouds = vw < 520 ? 1 : 2;
    for (let i = 0; i < clouds; i++) placeScenery(section, { svg: SCENERY.cloud, cls: "cloud", side: rand() > .5 ? "left" : "right", x: 2 + rand() * 13, top: 5 + rand() * 16, w: (72 + rand() * 44) * s, delay: rand() * 5 });
    const flies = vw < 520 ? 1 : 2;
    for (let i = 0; i < flies; i++) placeScenery(section, { svg: butterfly(p.accent), cls: "butterfly", side: rand() > .5 ? "left" : "right", x: 4 + rand() * 13, top: 24 + rand() * 46, w: (26 + rand() * 10) * s, delay: rand() * 3 });
  }
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

// ===== backgrounds =====
let bgLayers = {};
let activeChapter = -1;

function buildBackgrounds() {
  const fade = document.getElementById("bg-fade");
  fade.innerHTML = "";
  bgLayers = {};
  for (let i = 1; i <= 10; i++) {
    const p = PALETTES[i];
    const layer = document.createElement("div");
    layer.className = "bg-layer" + (i === 1 ? " active" : "");
    layer.style.background = `linear-gradient(180deg, ${p.top} 0%, ${p.bot} 100%)`;
    layer.style.setProperty("--glow", p.glow);
    fade.appendChild(layer);
    bgLayers[i] = layer;
  }
  activeChapter = 1;
}

function setActiveChapter(idx) {
  if (idx === activeChapter) return;
  activeChapter = idx;
  for (const k in bgLayers) bgLayers[k].classList.toggle("active", Number(k) === idx);
}

// ===== map rendering =====
let currentNodes = [];
let chapterSections = [];
let revealObserver = null;

function renderMap(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";
  currentNodes = [];
  chapterSections = [];

  const amp = Math.min(150, Math.max(34, window.innerWidth * 0.2));
  const total = library.reduce((n, ch) => n + ch.levels.length, 0);
  const done = library.reduce((n, ch) => n + ch.levels.filter(l => l.has_performance).length, 0);
  document.getElementById("star-total").textContent = total;
  document.getElementById("star-count").textContent = done;

  let gIdx = 0;
  for (const chapter of library) {
    const ci = chapterIndex(chapter.name);
    const p = paletteOf(chapter.name);
    const section = document.createElement("section");
    section.className = "chapter";
    section.style.setProperty("--accent", p.accent);
    section.style.setProperty("--accent-deep", p.deep);
    section.dataset.ci = ci;

    const sign = document.createElement("div");
    sign.className = "signpost";
    sign.innerHTML = `<span class="ch-no">Chapter ${String(ci).padStart(2, "0")}</span><span class="sign-text">${prettyChapter(chapter.name)}</span>`;
    section.appendChild(sign);

    let inChapter = 0;
    for (const level of chapter.levels) {
      const i = gIdx++;
      const wrap = document.createElement("button");
      wrap.type = "button";
      wrap.className = "node-wrap" + (level.current ? " current" : "");
      wrap.style.setProperty("--zig", (Math.sin(i * 0.8) * amp).toFixed(1) + "px");
      wrap.style.setProperty("--d", (inChapter++ * 0.07).toFixed(2) + "s");
      wrap.setAttribute("aria-label", level.title);

      const node = document.createElement("span");
      let cls = "node";
      if (level.has_performance) cls += " completed";
      else if (level.has_demo) cls += " ready";
      else cls += " soon";
      node.className = cls;

      const inner = document.createElement("span");
      inner.className = "node-inner";
      node.appendChild(inner);

      if (level.has_performance) {
        const star = document.createElement("span");
        star.className = "star-badge";
        star.innerHTML = starSVG(true);
        node.appendChild(star);
        extractFrame(level.chapter, level.level, "performance").then(url => {
          if (url) inner.style.backgroundImage = `url("${url}")`;
        });
      } else if (level.has_demo) {
        inner.innerHTML = PLAY_SVG;
      } else {
        inner.innerHTML = SPROUT_SVG;
      }

      const label = document.createElement("span");
      label.className = "node-label";
      label.textContent = level.title;

      wrap.appendChild(node);
      wrap.appendChild(label);
      if (level.current) {
        const mascot = document.createElement("span");
        mascot.className = "mascot";
        mascot.innerHTML = MASCOT_SVG;
        wrap.appendChild(mascot);
      }

      wrap.addEventListener("click", () => openDetail(level));
      section.appendChild(wrap);
      currentNodes.push({ node, level });
    }
    renderScenery(section, ci, p);
    map.appendChild(section);
    chapterSections.push({ el: section, ci });
  }

  requestAnimationFrame(() => {
    drawPath();
    observeReveal();
    updateBg();
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
  document.querySelectorAll(".chapter, .node-wrap").forEach(el => revealObserver.observe(el));
}

function drawPath() {
  const svg = document.getElementById("path-svg");
  const scroll = document.getElementById("map-scroll");
  if (!scroll) return;
  const w = scroll.clientWidth, h = scroll.scrollHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  if (currentNodes.length < 2) { svg.innerHTML = ""; return; }
  const base = scroll.getBoundingClientRect();
  const pts = currentNodes.map(({ node }) => {
    const r = node.getBoundingClientRect();
    return [r.left + r.width / 2 - base.left + scroll.scrollLeft,
            r.top + r.height / 2 - base.top + scroll.scrollTop];
  });
  const d = smoothPath(pts);
  svg.innerHTML = `<path class="trail-shadow" d="${d}"/><path class="trail" d="${d}"/>`;
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

function updateBg() {
  const mid = window.innerHeight / 2;
  let best = activeChapter, bestDist = Infinity;
  for (const { el, ci } of chapterSections) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const d = Math.abs((r.top + r.height / 2) - mid);
    if (d < bestDist) { bestDist = d; best = ci; }
  }
  setActiveChapter(best);
}

// ===== level detail view =====
function openDetail(level) {
  const p = paletteOf(level.chapter);
  const view = document.getElementById("detail-view");
  view.style.setProperty("--accent", p.accent);
  view.style.setProperty("--accent-deep", p.deep);

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
  requestAnimationFrame(() => { drawPath(); updateBg(); });
}

// ===== init =====
async function init() {
  buildBackgrounds();
  const library = await (await fetch("/api/library")).json();
  renderMap(library);
  document.getElementById("back-btn").addEventListener("click", closeDetail);

  // web fonts shift layout as they swap in — redraw the trail once they settle
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawPath);
  setTimeout(drawPath, 700);

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => { updateBg(); scrollTicking = false; });
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { drawPath(); updateBg(); }, 120);
  });
}
init();
