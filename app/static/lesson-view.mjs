export function normalizeReplayCards(cards = []) {
  return cards.filter(card => card && typeof card === "object").map(card => ({
    title: card.title || "Replay",
    setting: card.setting || "",
    change: card.change || "",
    challenge: card.challenge || "",
  }));
}

const PROMPT_LABELS = { a: "Clip 1", b: "Clip 2", c: "Clip 3" };

export function promptParts(data = {}) {
  return ["a", "b", "c"]
    .filter(part => data[part])
    .map(part => ({ label: PROMPT_LABELS[part], text: data[part] }));
}

export function withChapterContext(level, chapter) {
  return {
    ...level,
    chapter: chapter.name,
    chapterTitle: chapter.title || chapter.name,
  };
}
