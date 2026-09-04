const PART_ORDER = ["A", "B", "C"];

export function groupDialogueByPart(dialogue = []) {
  const groups = new Map();
  for (const turn of dialogue) {
    const id = turn.part || "";
    if (!groups.has(id)) groups.set(id, { id, beat: turn.beat || "", turns: [] });
    groups.get(id).turns.push(turn);
  }
  return [...groups.values()].sort((left, right) => {
    const leftIndex = PART_ORDER.indexOf(left.id);
    const rightIndex = PART_ORDER.indexOf(right.id);
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
  });
}

export function normalizeReplayCards(cards = []) {
  return cards.filter(card => card && typeof card === "object").map(card => ({
    title: card.title || "Replay",
    setting: card.setting || "",
    change: card.change || "",
    challenge: card.challenge || "",
  }));
}

export function promptParts(data = {}) {
  return ["a", "b", "c"]
    .filter(part => data[part])
    .map(part => ({ label: `Part ${part.toUpperCase()}`, text: data[part] }));
}
