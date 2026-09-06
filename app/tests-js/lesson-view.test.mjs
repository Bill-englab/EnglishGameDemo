import test from "node:test";
import assert from "node:assert/strict";

import { normalizeReplayCards, promptParts, withChapterContext } from "../static/lesson-view.mjs";


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


test("returns only available prompt clips in order", () => {
  assert.deepEqual(promptParts({ c: "third", a: "first", b: "" }), [
    { label: "Clip 1", text: "first" },
    { label: "Clip 3", text: "third" },
  ]);
});


test("adds the authored chapter title to levels opened directly from the map", () => {
  assert.deepEqual(
    withChapterContext({ level: "01-request" }, { name: "01-choosing", title: "Choosing and Requests" }),
    { level: "01-request", chapter: "01-choosing", chapterTitle: "Choosing and Requests" },
  );
});
