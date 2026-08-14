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
    heroes: theme.heroes.map((kind, index) => ({
      kind,
      side: index === 0 ? "left" : "right",
    })),
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

const HERO_FACTORIES = {
  windmill: () => `<svg viewBox="0 0 220 300" aria-hidden="true"><path d="M50 280 82 112h58l30 168z" fill="#fff7e3" stroke="#c77945" stroke-width="7"/><path d="M92 145h40v50H92z" fill="#8fd1e8"/><path d="M104 280v-48h25v48" fill="#b66d42"/><g class="hero-spin" style="transform-origin:111px 104px"><path d="m111 104-24-90c38 5 47 32 24 90" fill="#f6c54c"/><path d="m111 104 90-24c-5 38-32 47-90 24" fill="#ef8061"/><path d="m111 104 24 90c-38-5-47-32-24-90" fill="#79bdd1"/><path d="m111 104-90 24c5-38 32-47 90-24" fill="#f49e54"/></g><circle cx="111" cy="104" r="17" fill="#704830"/><path d="M21 282h181" stroke="#8cc66b" stroke-width="18" stroke-linecap="round"/></svg>`,
  "sunflower-field": () => `<svg viewBox="0 0 250 300" aria-hidden="true"><path d="M0 275q55-80 112 0 65-100 138 0v25H0z" fill="#77b95b"/><g class="hero-sway"><path d="M118 275V103M190 278V145M54 282V163" stroke="#518f48" stroke-width="10" stroke-linecap="round"/><g class="hero-bloom" style="transform-origin:118px 93px"><g fill="#ffd954"><ellipse cx="118" cy="43" rx="23" ry="38"/><ellipse cx="168" cy="93" rx="38" ry="23"/><ellipse cx="118" cy="143" rx="23" ry="38"/><ellipse cx="68" cy="93" rx="38" ry="23"/><ellipse cx="153" cy="58" rx="24" ry="35" transform="rotate(45 153 58)"/><ellipse cx="83" cy="58" rx="24" ry="35" transform="rotate(-45 83 58)"/></g><circle cx="118" cy="93" r="38" fill="#7d4b2d"/><circle cx="108" cy="83" r="4" fill="#dca63c"/><circle cx="129" cy="102" r="4" fill="#dca63c"/></g><g fill="#f6c84f"><circle cx="190" cy="138" r="31"/><circle cx="54" cy="157" r="27"/></g><g fill="#754428"><circle cx="190" cy="138" r="16"/><circle cx="54" cy="157" r="14"/></g></g></svg>`,
  "market-canopy": () => `<svg viewBox="0 0 260 280" aria-hidden="true"><path d="M24 90h212l-20-48H44z" fill="#fff4db"/><g class="hero-canopy"><path d="M24 90h212v38c-18 24-36 24-54 0-18 24-36 24-54 0-18 24-36 24-54 0-18 24-34 24-50 0z" fill="#e96682"/><path d="M58 90h38v43H58zm76 0h38v43h-38zm76 0h26v37h-26z" fill="#ffd459"/></g><path d="M43 127v140m174-140v140M30 266h200" stroke="#85543a" stroke-width="9"/><path d="M62 170h136v82H62z" fill="#fff0ce"/><circle cx="98" cy="204" r="19" fill="#f4a64d"/><circle cx="132" cy="201" r="18" fill="#72b85e"/><circle cx="165" cy="207" r="20" fill="#ed6b67"/></svg>`,
  "swinging-sign": () => `<svg viewBox="0 0 220 300" aria-hidden="true"><path d="M48 34h116v18H48zm13 0v240" stroke="#784a32" stroke-width="12" stroke-linecap="round"/><g class="hero-sign"><path d="M92 58v34m60-34v34" stroke="#784a32" stroke-width="6"/><path d="M72 90h105v92l-52 33-53-33z" fill="#ffd35a" stroke="#d45e78" stroke-width="7"/><circle cx="124" cy="131" r="23" fill="#fff5de"/><path d="M101 170h48" stroke="#d45e78" stroke-width="8" stroke-linecap="round"/></g><path d="M20 274h182" stroke="#d89465" stroke-width="18" stroke-linecap="round"/></svg>`,
  "gear-wall": () => `<svg viewBox="0 0 260 300" aria-hidden="true"><path d="M20 40h220v240H20z" rx="30" fill="#e5f4f8" stroke="#5da3c9" stroke-width="8"/><g class="hero-spin"><path d="M130 58v28m0 128v28M52 150h28m100 0h28M75 95l20 20m70 70 20 20m0-110-20 20m-70 70-20 20" stroke="#788c9a" stroke-width="18" stroke-linecap="round"/><circle cx="130" cy="150" r="70" fill="#9fb4c1"/><circle cx="130" cy="150" r="27" fill="#e5f4f8"/></g><g class="hero-spin-reverse" style="transform-origin:48px 66px"><circle cx="48" cy="66" r="31" fill="#f2b84b"/><circle cx="48" cy="66" r="10" fill="#e5f4f8"/></g></svg>`,
  "block-lift": () => `<svg viewBox="0 0 230 300" aria-hidden="true"><path d="M42 25v248m146-248v248M28 273h174" stroke="#745039" stroke-width="12" stroke-linecap="round"/><path d="M45 48h140" stroke="#4d92bd" stroke-width="13"/><g class="hero-lift"><path d="M87 48v78m56-78v78" stroke="#6f7d85" stroke-width="6"/><rect x="62" y="120" width="108" height="22" rx="6" fill="#825a3d"/><rect x="69" y="78" width="43" height="42" rx="5" fill="#ed6e7f"/><rect x="114" y="84" width="49" height="36" rx="5" fill="#ffd459"/><rect x="88" y="42" width="46" height="36" rx="5" fill="#66b5da"/></g></svg>`,
  "storybook-tree": () => `<svg viewBox="0 0 260 320" aria-hidden="true"><path d="M112 303q20-94 6-151l50 1q-18 64 4 150z" fill="#8a593b"/><g class="hero-crown"><circle cx="130" cy="100" r="77" fill="#4d9f5c"/><circle cx="73" cy="134" r="52" fill="#64b66b"/><circle cx="188" cy="140" r="55" fill="#5dad64"/><circle cx="126" cy="52" r="48" fill="#78c57a"/><path d="M127 180q-44 30-76 28m82-35q48 28 82 23" stroke="#8a593b" stroke-width="12" stroke-linecap="round"/></g><path d="M18 305h225" stroke="#5e9b50" stroke-width="22" stroke-linecap="round"/></svg>`,
  "firefly-grove": () => `<svg viewBox="0 0 240 300" aria-hidden="true"><path d="M20 290q20-110 70-165 60 48 130 165z" fill="#3e8e55"/><path d="M42 290q30-80 83-120 43 35 82 120z" fill="#62ab64"/><g class="hero-firefly"><circle cx="74" cy="92" r="10" fill="#fff7a1"/><circle cx="166" cy="63" r="8" fill="#ffe66d"/><circle cx="139" cy="132" r="11" fill="#fff7a1"/><circle cx="53" cy="172" r="7" fill="#ffe66d"/><circle cx="190" cy="181" r="9" fill="#fff7a1"/></g></svg>`,
  "observatory-dome": () => `<svg viewBox="0 0 250 300" aria-hidden="true"><path d="M47 276v-97q0-86 78-86t78 86v97z" fill="#eef3ff" stroke="#6674bb" stroke-width="8"/><path d="M49 181h153M125 94v182" stroke="#9aa6df" stroke-width="7"/><path d="M110 105 78 29l19-8 37 77" fill="#6576cb"/><circle cx="85" cy="25" r="18" fill="#9fd7f2"/><g class="hero-cloud-drift"><ellipse cx="60" cy="70" rx="45" ry="17" fill="#fff" opacity=".78"/></g></svg>`,
  orrery: () => `<svg viewBox="0 0 260 300" aria-hidden="true"><path d="M128 172v100m-70 0h140" stroke="#684c46" stroke-width="10" stroke-linecap="round"/><g class="hero-orbit" style="transform-origin:130px 135px"><ellipse cx="130" cy="135" rx="101" ry="48" fill="none" stroke="#fff2b0" stroke-width="6"/><circle cx="225" cy="135" r="18" fill="#efa06d"/></g><g class="hero-spin-reverse" style="transform-origin:130px 135px"><ellipse cx="130" cy="135" rx="58" ry="101" fill="none" stroke="#a4b0ef" stroke-width="5"/><circle cx="130" cy="37" r="14" fill="#87c6da"/></g><circle cx="130" cy="135" r="31" fill="#ffd359"/></svg>`,
  "bloom-arch": () => `<svg viewBox="0 0 260 310" aria-hidden="true"><path d="M35 290V145Q35 36 130 36t95 109v145" fill="none" stroke="#518e54" stroke-width="20"/><g class="hero-bloom"><g fill="#f08cab"><circle cx="44" cy="133" r="26"/><circle cx="72" cy="70" r="25"/><circle cx="132" cy="38" r="28"/><circle cx="190" cy="72" r="25"/><circle cx="220" cy="136" r="26"/></g><g fill="#ffd75a"><circle cx="44" cy="133" r="9"/><circle cx="72" cy="70" r="9"/><circle cx="132" cy="38" r="10"/><circle cx="190" cy="72" r="9"/><circle cx="220" cy="136" r="9"/></g></g></svg>`,
  "swaying-vines": () => `<svg viewBox="0 0 220 310" aria-hidden="true"><g class="hero-vines"><path d="M42 10q70 58 19 137T91 300M160 4q-62 76-7 135t-28 156" fill="none" stroke="#539859" stroke-width="12" stroke-linecap="round"/><g fill="#75bc70"><ellipse cx="76" cy="73" rx="28" ry="14" transform="rotate(35 76 73)"/><ellipse cx="43" cy="179" rx="27" ry="14" transform="rotate(-28 43 179)"/><ellipse cx="142" cy="88" rx="28" ry="14" transform="rotate(-35 142 88)"/><ellipse cx="169" cy="205" rx="27" ry="14" transform="rotate(28 169 205)"/></g><g fill="#ee87a7"><circle cx="66" cy="137" r="18"/><circle cx="150" cy="153" r="20"/></g></g></svg>`,
  waterwheel: () => `<svg viewBox="0 0 250 310" aria-hidden="true"><path d="M20 255h210v42H20z" fill="#6eb4c8"/><path d="M22 267q38-22 76 0t76 0 56 0" fill="none" stroke="#d9f3f6" stroke-width="8"/><path d="M130 58v218" stroke="#76513b" stroke-width="13"/><g class="hero-spin" style="transform-origin:130px 157px"><circle cx="130" cy="157" r="86" fill="none" stroke="#976a43" stroke-width="15"/><path d="M130 69v176M42 157h176M68 95l124 124M68 219 192 95" stroke="#976a43" stroke-width="13"/><circle cx="130" cy="157" r="22" fill="#c79158"/></g></svg>`,
  "flowing-stream": () => `<svg viewBox="0 0 260 300" aria-hidden="true"><path d="M0 300q33-90 96-114 80-29 164-146v260z" fill="#70b6cb"/><g class="hero-water"><path d="M24 275q64-45 109-60t104-93M47 299q62-39 116-61t80-72" fill="none" stroke="#e0f7fa" stroke-width="9" stroke-linecap="round"/></g><path d="M4 260q29-77 79-96" fill="none" stroke="#72a75c" stroke-width="36" stroke-linecap="round"/></svg>`,
  "memory-houses": () => `<svg viewBox="0 0 270 310" aria-hidden="true"><path d="M8 295V159l68-64 62 57 56-86 68 89v140z" fill="#c86a55"/><path d="M20 168h105v127H20zm123-6h105v133H143z" fill="#f1b178"/><g class="hero-window"><path d="M43 190h30v38H43zm48 0h28v38H91zm76-1h31v39h-31zm50 0h24v39h-24z" fill="#ffd870"/></g><path d="M72 295v-46h28v46m91 0v-46h30v46" fill="#80523c"/></svg>`,
  "smoke-stack": () => `<svg viewBox="0 0 220 310" aria-hidden="true"><path d="M46 298V151h60v147zm92 0V205h42v93" fill="#b55f50"/><path d="M38 151h76m17 54h56" stroke="#744b3b" stroke-width="14"/><g class="hero-smoke"><circle cx="78" cy="124" r="30" fill="#fff" opacity=".65"/><circle cx="103" cy="81" r="37" fill="#fff" opacity=".52"/><circle cx="71" cy="35" r="28" fill="#fff" opacity=".38"/><circle cx="159" cy="180" r="23" fill="#fff" opacity=".55"/><circle cx="179" cy="147" r="29" fill="#fff" opacity=".4"/></g></svg>`,
  "post-office": () => `<svg viewBox="0 0 260 310" aria-hidden="true"><path d="M28 294V111h204v183z" fill="#f5d69e" stroke="#4a7f9f" stroke-width="8"/><path d="M18 112 130 37l112 75" fill="#f7eee0" stroke="#4a7f9f" stroke-width="9"/><path d="M101 294v-69h58v69" fill="#5e8ba5"/><path d="M52 151h46v45H52zm110 0h46v45h-46z" fill="#9fd4e4"/><g class="hero-envelope"><path d="M91 72h78v48H91z" fill="#fff9ea" stroke="#d36662" stroke-width="5"/><path d="m91 72 39 29 39-29" fill="none" stroke="#d36662" stroke-width="5"/></g></svg>`,
  "airmail-sky": () => `<svg viewBox="0 0 270 310" aria-hidden="true"><path d="M18 220q97-140 232-56" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="4 17" stroke-linecap="round"/><g class="hero-plane"><path d="m37 188 116-95-39 137-27-55z" fill="#fff9e8" stroke="#477e9f" stroke-width="5"/><path d="m87 175 66-82" stroke="#477e9f" stroke-width="5"/></g><g class="hero-envelope"><rect x="156" y="186" width="79" height="52" rx="7" fill="#fff9e8" stroke="#477e9f" stroke-width="5"/><path d="m158 190 38 30 38-30" fill="none" stroke="#477e9f" stroke-width="5"/></g></svg>`,
  campfire: () => `<svg viewBox="0 0 240 310" aria-hidden="true"><path d="m45 276 150-35M48 238l148 43" stroke="#71472f" stroke-width="19" stroke-linecap="round"/><g class="hero-flame"><path d="M120 245q-70-38-25-112 7 42 34 50-18-80 39-125-5 72 31 106 43 43-20 81z" fill="#f6a03c"/><path d="M126 244q-40-22-12-72 4 29 24 35-8-43 22-68 4 47 24 69 17 28-24 36z" fill="#ffd65b"/></g><ellipse cx="120" cy="286" rx="97" ry="15" fill="#493d56" opacity=".35"/></svg>`,
  "starry-tent": () => `<svg viewBox="0 0 270 310" aria-hidden="true"><g class="hero-stars" fill="#ffe46e"><circle cx="34" cy="43" r="7"/><circle cx="103" cy="26" r="5"/><circle cx="224" cy="55" r="8"/><circle cx="188" cy="17" r="5"/><circle cx="248" cy="111" r="4"/></g><path d="M21 287 135 75l114 212z" fill="#e8b64a" stroke="#493b64" stroke-width="8"/><path d="M135 75v212M95 287l40-76 40 76" fill="#56476f" stroke="#493b64" stroke-width="6"/><path d="M12 290h246" stroke="#443858" stroke-width="20" stroke-linecap="round"/></svg>`,
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

function createHeroProp(hero) {
  const el = document.createElement("div");
  el.className = `scene-hero scene-hero--${hero.kind} scene-hero--${hero.side}`;
  el.innerHTML = HERO_FACTORIES[hero.kind]?.() || renderPropSvg(hero.kind);
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
  const leftHero = spec.heroes.find(hero => hero.side === "left");
  const rightHero = spec.heroes.find(hero => hero.side === "right");
  leftElement.replaceChildren(
    ...(leftHero ? [createHeroProp(leftHero)] : []),
    ...spec.left.map(createSceneProp),
  );
  rightElement.replaceChildren(
    ...(rightHero ? [createHeroProp(rightHero)] : []),
    ...spec.right.map(createSceneProp),
  );
}
