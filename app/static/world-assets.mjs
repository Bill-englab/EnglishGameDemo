export const WORLD_ASSET_ROOT = "/static/worlds-v2";

export const WORLD_LEGACY_ASSETS = Object.freeze({
  "morning-picnic": "01-wants-requests",
  "color-market": "02-refusing-bargaining",
  "block-workshop": "03-asking-help",
  "finding-forest": "04-where-locating",
  "question-observatory": "05-why-how-come",
  "feeling-garden": "06-feelings-preferences",
  "reasoning-valley": "07-reasoning",
  "memory-town": "08-recounting-day",
  "messenger-post": "09-reporting-others",
  "planning-camp": "10-planning-predicting",
});

/** Ordered local candidates; unknown worlds use the first chapter. */
export function getWorldAssetUrls(world, mobile) {
  const safeWorld = Object.prototype.hasOwnProperty.call(WORLD_LEGACY_ASSETS, world) ? world : "morning-picnic";
  const legacy = WORLD_LEGACY_ASSETS[safeWorld];
  return [
    `${WORLD_ASSET_ROOT}/${safeWorld}-${mobile ? "mobile" : "desktop"}.webp`,
    `/static/worlds/${legacy}.webp`,
    `/static/worlds/${legacy}.png`,
    `/static/worlds/${legacy}.jpg`,
  ];
}
