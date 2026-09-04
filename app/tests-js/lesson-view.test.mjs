import test from "node:test";
import assert from "node:assert/strict";

import { groupDialogueByPart, normalizeReplayCards, promptParts } from "../static/lesson-view.mjs";


test("groups flattened dialogue into authored A B C parts", () => {
  const groups = groupDialogueByPart([
    { part: "A", speaker: "Mom", line: "Choose one." },
    { part: "A", speaker: "Child", line: "The apple." },
    { part: "B", speaker: "Mom", line: "This one?" },
    { part: "C", speaker: "Child", line: "Thank you." },
  ]);

  assert.deepEqual(groups.map(group => group.id), ["A", "B", "C"]);
  assert.equal(groups[0].turns.length, 2);
  assert.equal(groups[1].turns[0].line, "This one?");
});


test("normalizes two replay cards without flattening their causal fields", () => {
  const cards = normalizeReplayCards([
    { title: "Drink", setting: "Breakfast", change: "Choose milk", challenge: "Repair a mix-up" },
    { title: "Book", setting: "Bedtime", change: "Choose bear", challenge: "Correct Dad" },
  ]);

  assert.deepEqual(cards[0], {
    title: "Drink",
    setting: "Breakfast",
    change: "Choose milk",
    challenge: "Repair a mix-up",
  });
  assert.equal(cards.length, 2);
});


test("returns only available prompt parts in A B C order", () => {
  assert.deepEqual(promptParts({ c: "third", a: "first", b: "" }), [
    { label: "Part A", text: "first" },
    { label: "Part C", text: "third" },
  ]);
});
