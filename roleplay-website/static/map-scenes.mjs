// ============================================================
// map-scenes.mjs — deterministic chapter-world scene specs
// Consumes: getChapterTheme(chapterName) from ./map-model.mjs
// Produces: buildSceneSpec(name, seed), renderChapterScenery(leftEl, rightEl, spec)
// ============================================================
import { getChapterTheme } from "./map-model.mjs";

// ---- seeded PRNG (mulberry32) ---------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- bounded random helpers -----------------------------------------------
const lerp = (rng, lo, hi) => lo + rng() * (hi - lo);
const round2 = (n) => Math.round(n * 100) / 100;

// ---- build a deterministic scene spec -------------------------------------
export function buildSceneSpec(chapterName, seed) {
  const theme = getChapterTheme(chapterName);
  const rng = mulberry32((seed >>> 0) || 1);

  const left = [];
  const right = [];
  // Alternate the four theme props: prop0→left, prop1→right, prop2→left, prop3→right
  theme.props.forEach((kind, index) => {
    const side = index % 2 === 0 ? left : right;
    side.push({
      kind,
      x: round2(lerp(rng, 4, 88)),
      y: round2(lerp(rng, 8, 82)),
      scale: round2(lerp(rng, 0.8, 1.3)),
      delay: round2(lerp(rng, 0, 4)),
    });
  });

  return {
    world: theme.world,
    gradient: theme.gradient,
    accent: theme.accent,
    left,
    right,
  };
}

// ---- inline-SVG factories keyed by prop kind ------------------------------
// Each factory returns a self-contained inline-SVG string. Kinds that share a
// visual idea can reuse a generic shape, but every kind maps to something.
const SVG_FACTORIES = {
  // ----- airy sky bits -----
  cloud: () => `<svg viewBox="0 0 90 42" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="28" rx="17" ry="12" fill="#ffffff"/><ellipse cx="46" cy="22" rx="22" ry="16" fill="#ffffff"/><ellipse cx="68" cy="29" rx="16" ry="12" fill="#ffffff"/><ellipse cx="46" cy="31" rx="30" ry="9" fill="#ffffff"/></svg>`,
  "small-cloud": () => `<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="20" rx="12" ry="9" fill="#ffffff"/><ellipse cx="34" cy="16" rx="16" ry="12" fill="#ffffff"/><ellipse cx="50" cy="21" rx="12" ry="9" fill="#ffffff"/></svg>`,
  "question-cloud": () => `<svg viewBox="0 0 84 48" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="28" rx="16" ry="12" fill="#ffffff"/><ellipse cx="46" cy="22" rx="20" ry="15" fill="#ffffff"/><ellipse cx="64" cy="29" rx="14" ry="11" fill="#ffffff"/><text x="42" y="30" text-anchor="middle" font-family="Fredoka, Arial, sans-serif" font-size="20" font-weight="700" fill="#6c72d9">?</text></svg>`,

  // ----- trees, bushes, leaves -----
  "fruit-tree": () => `<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="50" width="8" height="32" rx="3" fill="#7a4a22"/><circle cx="30" cy="34" r="22" fill="#4aa53a"/><circle cx="16" cy="44" r="14" fill="#5cc14a"/><circle cx="44" cy="44" r="14" fill="#5cc14a"/><circle cx="22" cy="28" r="3.4" fill="#e8513f"/><circle cx="38" cy="22" r="3.4" fill="#e8513f"/><circle cx="44" cy="36" r="3.4" fill="#e8513f"/><circle cx="18" cy="40" r="3.4" fill="#e8513f"/></svg>`,
  bush: () => `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="30" rx="15" ry="11" fill="#5cc14a"/><ellipse cx="38" cy="24" rx="19" ry="15" fill="#4aa53a"/><ellipse cx="58" cy="31" rx="14" ry="11" fill="#5cc14a"/><circle cx="34" cy="22" r="2.6" fill="#ff8fa8"/><circle cx="48" cy="26" r="2.6" fill="#ffd23f"/></svg>`,
  leaf: () => `<svg viewBox="0 0 44 52" xmlns="http://www.w3.org/2000/svg"><path d="M22 4 C 38 14 40 36 22 50 C 4 36 6 14 22 4 Z" fill="#5cc14a"/><path d="M22 8 V46" stroke="#3c7d1c" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 20 L32 16 M22 28 L34 26 M22 36 L30 36" stroke="#3c7d1c" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`,
  flower: () => `<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 52 V30" stroke="#3c7d1c" stroke-width="3" stroke-linecap="round"/><path d="M20 40 Q12 34 10 28" stroke="#3c7d1c" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="22" r="6.5" fill="#ff8fa8"/><circle cx="28" cy="22" r="6.5" fill="#ff8fa8"/><circle cx="20" cy="14" r="6.5" fill="#ff8fa8"/><circle cx="20" cy="30" r="6.5" fill="#ff8fa8"/><circle cx="20" cy="22" r="5" fill="#ffd23f"/></svg>`,

  // ----- picnic & market -----
  picnic: () => `<svg viewBox="0 0 96 56" xmlns="http://www.w3.org/2000/svg"><path d="M4 20 L92 20 L80 48 L16 48 Z" fill="#e8513f"/><path d="M4 20 L92 20 L88 28 L8 28 Z" fill="#ffffff"/><line x1="34" y1="20" x2="22" y2="48" stroke="#b5382c" stroke-width="2"/><line x1="62" y1="20" x2="74" y2="48" stroke="#b5382c" stroke-width="2"/><circle cx="48" cy="14" r="7" fill="#ffd23f"/><circle cx="48" cy="14" r="3" fill="#f0a500"/></svg>`,
  basket: () => `<svg viewBox="0 0 56 48" xmlns="http://www.w3.org/2000/svg"><path d="M6 18 H50 L44 44 H12 Z" fill="#c98a3c"/><path d="M6 18 H50" stroke="#7a4a22" stroke-width="2.5" fill="none"/><path d="M10 24 H46 M12 32 H44" stroke="#7a4a22" stroke-width="1.4" fill="none"/><path d="M14 18 Q28 4 42 18" stroke="#7a4a22" stroke-width="2.5" fill="none"/><circle cx="22" cy="16" r="3" fill="#e8513f"/><circle cx="34" cy="16" r="3" fill="#5cc14a"/></svg>`,
  awning: () => `<svg viewBox="0 0 90 44" xmlns="http://www.w3.org/2000/svg"><path d="M6 14 H84 L78 4 H12 Z" fill="#e75f79"/><path d="M6 14 H84 V20 L75 24 L66 20 L57 24 L48 20 L39 24 L30 20 L21 24 L12 20 Z" fill="#ffd23f"/><rect x="6" y="20" width="78" height="2" fill="#b5385a" opacity="0.4"/></svg>`,
  flags: () => `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 V54" stroke="#7a4a22" stroke-width="2.5"/><path d="M6 8 Q50 -2 94 8" stroke="#7a4a22" stroke-width="1.6" fill="none"/><polygon points="14,10 28,10 21,22" fill="#e75f79"/><polygon points="32,8 46,8 39,20" fill="#ffd23f"/><polygon points="50,7 64,7 57,19" fill="#5cc14a"/><polygon points="68,8 82,8 75,20" fill="#4b9fd8"/></svg>`,
  stall: () => `<svg viewBox="0 0 96 64" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="22" width="80" height="36" rx="3" fill="#fff3e2" stroke="#7a4a22" stroke-width="2"/><path d="M4 22 H92 L86 10 H10 Z" fill="#e75f79"/><rect x="20" y="30" width="22" height="20" rx="2" fill="#ffd23f"/><rect x="54" y="30" width="22" height="20" rx="2" fill="#4b9fd8"/><rect x="8" y="50" width="80" height="6" fill="#cc8a4a"/></svg>`,
  tag: () => `<svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg"><path d="M24 4 L42 14 V42 L24 52 L6 42 V14 Z" fill="#ffd23f" stroke="#cc8a4a" stroke-width="2"/><circle cx="24" cy="14" r="3" fill="#7a4a22"/><path d="M16 26 H32 M16 34 H28" stroke="#cc8a4a" stroke-width="2"/></svg>`,

  // ----- workshop -----
  "tool-rack": () => `<svg viewBox="0 0 80 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="34" width="72" height="6" rx="2" fill="#7a4a22"/><rect x="12" y="16" width="6" height="18" rx="1" fill="#4b9fd8"/><rect x="10" y="10" width="10" height="8" rx="1" fill="#cc684f"/><rect x="34" y="14" width="6" height="20" rx="1" fill="#9aa3ab"/><rect x="30" y="8" width="14" height="8" rx="1" fill="#cc684f"/><rect x="58" y="18" width="6" height="16" rx="1" fill="#4b9fd8"/><rect x="55" y="12" width="12" height="8" rx="1" fill="#cc684f"/></svg>`,
  blocks: () => `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="40" width="20" height="20" rx="2" fill="#e75f79"/><rect x="28" y="40" width="20" height="20" rx="2" fill="#4b9fd8"/><rect x="50" y="40" width="20" height="20" rx="2" fill="#ffd23f"/><rect x="17" y="20" width="20" height="20" rx="2" fill="#5cc14a"/><rect x="39" y="20" width="20" height="20" rx="2" fill="#cc684f"/><rect x="28" y="0" width="20" height="20" rx="2" fill="#6c72d9"/></svg>`,
  gear: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="#9aa3ab"><rect x="28" y="2" width="8" height="10" rx="1"/><rect x="28" y="52" width="8" height="10" rx="1"/><rect x="2" y="28" width="10" height="8" rx="1"/><rect x="52" y="28" width="10" height="8" rx="1"/><rect x="9" y="9" width="8" height="10" rx="1" transform="rotate(-45 13 14)"/><rect x="47" y="9" width="8" height="10" rx="1" transform="rotate(45 51 14)"/><rect x="9" y="45" width="8" height="10" rx="1" transform="rotate(45 13 50)"/><rect x="47" y="45" width="8" height="10" rx="1" transform="rotate(-45 51 50)"/></g><circle cx="32" cy="32" r="20" fill="#b9c0c7"/><circle cx="32" cy="32" r="8" fill="#fff3e2"/></svg>`,
  workbench: () => `<svg viewBox="0 0 96 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="88" height="10" rx="2" fill="#7a4a22"/><rect x="10" y="28" width="6" height="24" fill="#7a4a22"/><rect x="80" y="28" width="6" height="24" fill="#7a4a22"/><rect x="20" y="6" width="10" height="12" rx="1" fill="#cc684f"/><rect x="60" y="4" width="20" height="14" rx="2" fill="#4b9fd8"/><rect x="40" y="10" width="12" height="8" rx="1" fill="#ffd23f"/></svg>`,

  // ----- forest / valley -----
  signpost: () => `<svg viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="6" height="48" fill="#7a4a22"/><path d="M6 16 H42 L42 30 H6 Z" fill="#ffd18a" stroke="#7a4a22" stroke-width="2"/><path d="M14 36 H50 L50 50 H14 Z" fill="#ffd18a" stroke="#7a4a22" stroke-width="2"/><path d="M12 22 H36 M20 42 H44" stroke="#cc8a4a" stroke-width="2"/></svg>`,
  "path-stone": () => `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="14" cy="26" rx="11" ry="7" fill="#c9b79a"/><ellipse cx="36" cy="22" rx="14" ry="9" fill="#b6a48a"/><ellipse cx="60" cy="27" rx="11" ry="7" fill="#c9b79a"/><ellipse cx="14" cy="24" rx="6" ry="3" fill="#dccbab" opacity="0.7"/><ellipse cx="60" cy="25" rx="6" ry="3" fill="#dccbab" opacity="0.7"/></svg>`,
  "light-dot": () => `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" fill="#fff3a0"/><circle cx="16" cy="16" r="6" fill="#ffd23f"/><circle cx="16" cy="16" r="10" fill="none" stroke="#ffd23f" stroke-width="1" opacity="0.5"/></svg>`,
  bridge: () => `<svg viewBox="0 0 96 48" xmlns="http://www.w3.org/2000/svg"><path d="M4 30 Q48 4 92 30" fill="none" stroke="#7a4a22" stroke-width="4"/><path d="M4 30 Q48 10 92 30 V36 Q48 16 4 36 Z" fill="#cc8a4a"/><rect x="10" y="20" width="4" height="14" fill="#7a4a22"/><rect x="30" y="12" width="4" height="16" fill="#7a4a22"/><rect x="62" y="12" width="4" height="16" fill="#7a4a22"/><rect x="82" y="20" width="4" height="14" fill="#7a4a22"/></svg>`,
  hill: () => `<svg viewBox="0 0 120 56" xmlns="http://www.w3.org/2000/svg"><path d="M0 56 Q30 20 60 40 Q90 8 120 56 Z" fill="#a8d79d"/><path d="M0 56 Q30 28 60 44 Q90 22 120 56 Z" fill="#7fbf6e" opacity="0.7"/></svg>`,

  // ----- observatory -----
  telescope: () => `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="46" width="16" height="22" rx="2" fill="#7a4a22"/><rect x="20" y="66" width="24" height="6" rx="2" fill="#5a3a1a"/><g transform="rotate(-30 32 32)"><rect x="26" y="6" width="12" height="40" rx="6" fill="#6c72d9"/><circle cx="32" cy="10" r="6" fill="#4b9fd8"/></g></svg>`,
  planet: () => `<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="28" r="16" fill="#6c72d9"/><path d="M16 28 Q32 36 48 28" stroke="#4b9fd8" stroke-width="3" fill="none"/><ellipse cx="32" cy="28" rx="30" ry="7" fill="none" stroke="#ffd23f" stroke-width="2.5" transform="rotate(-18 32 28)"/><circle cx="26" cy="22" r="3" fill="#8a8fee" opacity="0.7"/></svg>`,
  "star-map": () => `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="72" height="52" rx="3" fill="#fff3e2" stroke="#7a4a22" stroke-width="2"/><circle cx="18" cy="20" r="2" fill="#7a4a22"/><circle cx="38" cy="16" r="2.4" fill="#7a4a22"/><circle cx="60" cy="28" r="2" fill="#7a4a22"/><circle cx="28" cy="38" r="2" fill="#7a4a22"/><circle cx="54" cy="46" r="2.4" fill="#7a4a22"/><path d="M18 20 L38 16 L60 28 M28 38 L54 46" stroke="#cc8a4a" stroke-width="1" fill="none"/></svg>`,

  // ----- feeling / mood -----
  "mood-orb": () => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="mo" cx="40%" cy="35%"><stop offset="0%" stop-color="#ffd9e8"/><stop offset="100%" stop-color="#df6997"/></radialGradient></defs><circle cx="24" cy="24" r="18" fill="url(#mo)"/><circle cx="18" cy="20" r="2.4" fill="#5b3a22"/><circle cx="30" cy="20" r="2.4" fill="#5b3a22"/><path d="M17 30 Q24 36 31 30" stroke="#5b3a22" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

  // ----- town / memory -----
  house: () => `<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M8 36 L36 12 L64 36 Z" fill="#cc684f"/><rect x="12" y="36" width="48" height="32" fill="#ffd6a0"/><rect x="30" y="48" width="12" height="20" fill="#7a4a22"/><rect x="16" y="42" width="10" height="10" fill="#fff3e2"/><rect x="46" y="42" width="10" height="10" fill="#fff3e2"/></svg>`,
  sunset: () => `<svg viewBox="0 0 80 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd23f"/><stop offset="100%" stop-color="#e8513f"/></linearGradient></defs><circle cx="40" cy="40" r="22" fill="url(#ss)"/><path d="M0 40 H80" stroke="#e8513f" stroke-width="2" opacity="0.4"/><path d="M6 44 H74" stroke="#cc684f" stroke-width="2" opacity="0.4"/></svg>`,
  "window-light": () => `<svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="36" height="48" rx="3" fill="#7a4a22"/><rect x="12" y="10" width="24" height="36" fill="#ffd23f"/><path d="M24 10 V46 M12 28 H36" stroke="#7a4a22" stroke-width="2"/></svg>`,
  "chimney-smoke": () => `<svg viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="40" width="16" height="20" fill="#cc684f"/><rect x="14" y="38" width="20" height="4" fill="#7a4a22"/><circle cx="20" cy="30" r="5" fill="#fff" opacity="0.7"/><circle cx="28" cy="22" r="6" fill="#fff" opacity="0.6"/><circle cx="18" cy="14" r="5" fill="#fff" opacity="0.5"/><circle cx="30" cy="6" r="4" fill="#fff" opacity="0.4"/></svg>`,

  // ----- messenger -----
  mailbox: () => `<svg viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="40" width="6" height="30" fill="#7a4a22"/><path d="M8 14 H40 V40 H8 Z" fill="#498bb5"/><rect x="8" y="14" width="32" height="8" fill="#3a6f8f"/><rect x="14" y="26" width="10" height="6" rx="1" fill="#ffd23f"/><path d="M40 18 L48 22 V36 H40 Z" fill="#3a6f8f"/></svg>`,
  envelope: () => `<svg viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="36" rx="3" fill="#fff3e2" stroke="#7a4a22" stroke-width="2"/><path d="M4 8 L32 28 L60 8" fill="none" stroke="#7a4a22" stroke-width="2"/><path d="M4 44 L24 26 M60 44 L40 26" stroke="#cc8a4a" stroke-width="1.5" fill="none"/></svg>`,
  "paper-plane": () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M4 32 L60 6 L40 60 L32 38 Z" fill="#fff3e2" stroke="#7a4a22" stroke-width="1.6"/><path d="M32 38 L60 6" stroke="#7a4a22" stroke-width="1.6" fill="none"/></svg>`,
  "flight-line": () => `<svg viewBox="0 0 96 40" xmlns="http://www.w3.org/2000/svg"><path d="M4 30 Q48 4 92 30" fill="none" stroke="#498bb5" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/><polygon points="86,24 94,30 86,36" fill="#498bb5"/></svg>`,

  // ----- camp / night -----
  tent: () => `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg"><path d="M6 54 L40 8 L74 54 Z" fill="#f1b84b" stroke="#7a4a22" stroke-width="2"/><path d="M40 8 V54" stroke="#7a4a22" stroke-width="2"/><path d="M30 54 L40 38 L50 54 Z" fill="#7a4a22"/><circle cx="40" cy="46" r="2" fill="#ffd23f"/></svg>`,
  moon: () => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M32 6 a20 20 0 1 0 0 36 a14 14 0 0 1 0 -36 Z" fill="#fff3b0"/><circle cx="40" cy="14" r="2" fill="#f1b84b" opacity="0.7"/><circle cx="44" cy="28" r="1.6" fill="#f1b84b" opacity="0.7"/></svg>`,
  star: () => `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 4 L19.5 12.5 L28 13 L21.5 19 L24 28 L16 23 L8 28 L10.5 19 L4 13 L12.5 12.5 Z" fill="#ffd23f" stroke="#f0a500" stroke-width="1"/></svg>`,

  // ----- misc atmospheric -----
  "light-band": () => `<svg viewBox="0 0 120 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 12 Q60 0 120 12 Q60 24 0 12 Z" fill="#fff3a0" opacity="0.7"/><path d="M0 12 Q60 4 120 12" stroke="#ffd23f" stroke-width="1.5" fill="none"/></svg>`,
};

// ---- build a DOM scene prop -----------------------------------------------
function createSceneProp(prop) {
  const el = document.createElement("div");
  el.className = `scene-prop scene-prop--${prop.kind}`;
  el.style.setProperty("--x", String(prop.x));
  el.style.setProperty("--y", String(prop.y));
  el.style.setProperty("--scale", String(prop.scale));
  el.style.setProperty("--delay", String(prop.delay));
  el.innerHTML = renderPropSvg(prop.kind);
  return el;
}

// Resolve a kind to an inline-SVG string. Unknown kinds never throw — they
// render a neutral rounded color orb so the scene stays alive.
function renderPropSvg(kind, accent = "#cc8a4a") {
  const factory = SVG_FACTORIES[kind];
  if (factory) return factory();
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" fill="${accent}" opacity="0.7"/><circle cx="20" cy="20" r="10" fill="${accent}"/></svg>`;
}

// ---- public render contract (exact) ---------------------------------------
export function renderChapterScenery(leftElement, rightElement, spec) {
  leftElement.replaceChildren(...spec.left.map(createSceneProp));
  rightElement.replaceChildren(...spec.right.map(createSceneProp));
}
