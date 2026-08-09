export const CHAPTER_THEMES = Object.freeze({
  1: { world: "morning-picnic", gradient: "linear-gradient(180deg,#bfe8ff 0%,#fff0b8 52%,#ffd18a 100%)", accent: "#f47b35", props: ["cloud", "fruit-tree", "picnic", "basket"] },
  2: { world: "color-market", gradient: "linear-gradient(180deg,#ffd8df 0%,#ffc69b 100%)", accent: "#e75f79", props: ["awning", "flags", "stall", "tag"] },
  3: { world: "block-workshop", gradient: "linear-gradient(180deg,#cfeeff 0%,#ffe0a3 100%)", accent: "#4b9fd8", props: ["tool-rack", "blocks", "gear", "workbench"] },
  4: { world: "finding-forest", gradient: "linear-gradient(180deg,#ccebd2 0%,#a8d79d 100%)", accent: "#4f9f64", props: ["signpost", "bush", "path-stone", "light-dot"] },
  5: { world: "question-observatory", gradient: "linear-gradient(180deg,#c9ddff 0%,#d6c3ff 100%)", accent: "#6c72d9", props: ["question-cloud", "telescope", "planet", "small-cloud"] },
  6: { world: "feeling-garden", gradient: "linear-gradient(180deg,#ffd9e8 0%,#ffc9a4 100%)", accent: "#df6997", props: ["flower", "fruit-tree", "mood-orb", "leaf"] },
  7: { world: "reasoning-valley", gradient: "linear-gradient(180deg,#cce8f6 0%,#bcd9a4 100%)", accent: "#438f77", props: ["bridge", "hill", "signpost", "light-band"] },
  8: { world: "memory-town", gradient: "linear-gradient(180deg,#ffd6a0 0%,#dc8d7e 100%)", accent: "#cc684f", props: ["house", "sunset", "window-light", "chimney-smoke"] },
  9: { world: "messenger-post", gradient: "linear-gradient(180deg,#d7edff 0%,#f1cf9e 100%)", accent: "#498bb5", props: ["mailbox", "envelope", "paper-plane", "flight-line"] },
  10: { world: "planning-camp", gradient: "linear-gradient(180deg,#8ca5df 0%,#6b579e 100%)", accent: "#f1b84b", props: ["tent", "moon", "star-map", "star"] },
});

const chapterNumber = chapterName => Number.parseInt(chapterName.match(/^\d+/)?.[0] || "1", 10);
export const getChapterTheme = chapterName => CHAPTER_THEMES[chapterNumber(chapterName)] || CHAPTER_THEMES[1];
export const getLevelVisualState = level => level.has_performance ? "completed" : level.current ? "current" : "locked";
export const getLayoutForWidth = width => width <= 600
  ? { left: 14, main: 72, right: 14, node: 128, currentNode: 140 }
  : { left: 23, main: 54, right: 23, node: 168, currentNode: 184 };
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
