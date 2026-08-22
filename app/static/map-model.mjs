export const CHAPTER_THEMES = Object.freeze({
  1: { world: "morning-picnic", accent: "#f47b35" },
  2: { world: "color-market", accent: "#e75f79" },
  3: { world: "block-workshop", accent: "#4b9fd8" },
  4: { world: "finding-forest", accent: "#4f9f64" },
  5: { world: "question-observatory", accent: "#6c72d9" },
  6: { world: "feeling-garden", accent: "#df6997" },
  7: { world: "reasoning-valley", accent: "#438f77" },
  8: { world: "memory-town", accent: "#cc684f" },
  9: { world: "messenger-post", accent: "#498bb5" },
  10: { world: "planning-camp", accent: "#f1b84b" },
});

const chapterNumber = chapterName => { const m = chapterName.match(/^\d+/); return Number.parseInt((m && m[0]) || "1", 10); };
export const getChapterTheme = chapterName => CHAPTER_THEMES[chapterNumber(chapterName)] || CHAPTER_THEMES[1];
export const getLevelVisualState = level => level.has_performance ? "completed" : level.current ? "current" : "locked";
export const getStableRotation = index => ((index * 53) % 7) - 3;
export function isFrameDark(data, threshold = 28, ratio = 0.92) {
  let darkPixels = 0;
  let opaquePixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    // Skip fully/transparent pixels — do not count them as dark
    // and do not include them in the denominator.
    if (data[offset + 3] < 16) continue;
    opaquePixels += 1;
    const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    if (luminance < threshold) darkPixels += 1;
  }
  return opaquePixels > 0 && darkPixels / opaquePixels >= ratio;
}
