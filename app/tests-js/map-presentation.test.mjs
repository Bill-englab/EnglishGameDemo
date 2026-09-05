import test from "node:test";
import assert from "node:assert/strict";
import * as model from "../static/map-model.mjs";
import * as interactions from "../static/map-interactions.mjs";
import { createCelebrationQueue, createCurrentLessonAction, resolveCompletionTransition, showMapLoadError } from "../static/map-interactions.mjs";

test("completion celebrations are consumed once and can be cleared", () => {
  const queue = createCelebrationQueue();
  queue.queue("01-choosing-requests/01-request-an-item");
  assert.equal(queue.consume("01-choosing-requests/01-request-an-item"), true);
  assert.equal(queue.consume("01-choosing-requests/01-request-an-item"), false);
  queue.queue("x");
  queue.clear();
  assert.equal(queue.consume("x"), false);
});

test("map visibility drains every eligible celebration and retains unrendered keys", () => {
  const queue = createCelebrationQueue();
  for (const key of ["lesson-a", "lesson-b", "not-rendered", "lesson-a"]) queue.queue(key);
  assert.equal(typeof queue.drain, "function", "A visible map can consume every eligible pending key");
  assert.deepEqual(queue.drain(["lesson-b", "lesson-a"]), ["lesson-b", "lesson-a"]);
  assert.deepEqual(queue.drain(["lesson-a", "lesson-b"]), []);
  assert.deepEqual(queue.drain(["not-rendered"]), ["not-rendered"]);
});

function celebrationFixture(reduced = false) {
  assert.equal(typeof interactions.createCelebrationEffects, "function",
    "One-shot effects own their animation and view-teardown cleanup");
  const effects = interactions.createCelebrationEffects({ view: { matchMedia: () => ({ matches: reduced }) } });
  const elements = ["level-node-wrap--just-completed", "chapter-world--just-completed"].map(className => {
    const classes = new Set();
    const element = { classList: { add: key => classes.add(key), remove: key => classes.delete(key) } };
    const target = new EventTarget();
    effects.play(element, className, target);
    return { classes, target, className };
  });
  return { effects, elements };
}

for (const eventName of ["animationend", "animationcancel"]) {
  test(`${eventName} clears lesson and chapter one-shot classes`, () => {
    const { elements } = celebrationFixture();
    for (const { classes, target, className } of elements) {
      assert.equal(classes.has(className), true);
      target.dispatchEvent(new Event(eventName));
      assert.equal(classes.has(className), false);
    }
  });
}

test("view teardown clears active lesson and chapter effects before a later map visit", () => {
  const { effects, elements } = celebrationFixture();
  effects.clear();
  effects.clear();
  for (const { classes, target } of elements) {
    assert.equal(classes.size, 0);
    target.dispatchEvent(new Event("animationcancel"));
    assert.equal(classes.size, 0);
  }
});

test("reduced motion never starts lesson or chapter one-shot effects", () => {
  const { elements } = celebrationFixture(true);
  assert.deepEqual(elements.map(({ classes }) => classes.size), [0, 0]);
});

test("celebrations require a new lesson completion and a new 3/3 chapter", () => {
  assert.deepEqual(resolveCompletionTransition(
    { hasPerformance: false, chapterCompleted: 2, chapterTotal: 3 },
    { hasPerformance: true, chapterCompleted: 3, chapterTotal: 3 },
  ), { lesson: true, chapter: true });
  assert.deepEqual(resolveCompletionTransition(
    { hasPerformance: true, chapterCompleted: 3, chapterTotal: 3 },
    { hasPerformance: true, chapterCompleted: 3, chapterTotal: 3 },
  ), { lesson: false, chapter: false });
});

test("only performance earns a binary star reward; current and preview have distinct markers", () => {
  assert.equal(typeof model.resolveMapPresentation, "function");
  for (const [level, expected] of [
    [{has_performance:true,current:true,has_demo:true}, {state:"completed",number:1,showCover:true,marker:"star"}],
    [{has_performance:false,current:true,has_demo:true}, {state:"current",number:1,showCover:true,marker:"locator"}],
    [{has_performance:false,current:false,state:"completed",has_demo:false}, {state:"locked",number:1,showCover:false,marker:"lock"}],
  ]) assert.deepEqual(model.resolveMapPresentation(level, 0), expected);
});

test("current action centers then focuses the real node and forces auto for reduced motion", async () => {
  for (const reduced of [false,true]) {
    const calls = [];
    let end;
    const node = {isConnected:true, scrollIntoView: options => calls.push(["scroll",options]), focus: options => calls.push(["focus",options])};
    const map = {classList:{contains:()=>false}, querySelector:()=>node, addEventListener:(event,fn)=>{end=fn;},removeEventListener(){}};
    const action = createCurrentLessonAction({ root:{getElementById:()=>map}, view:{matchMedia:()=>({matches:reduced}), setTimeout:()=>1, clearTimeout(){}, requestAnimationFrame:fn=>fn()} });
    action({behavior:"smooth"});
    assert.equal(calls[0][1].behavior, reduced ? "auto":"smooth");
    assert.equal(calls[0][1].block,"center");
    if (!reduced) {assert.equal(calls.length,1); end();}
    assert.equal(calls[1][0],"focus");
    assert.equal(calls[1][1].preventScroll,true);
  }
});

test("map numbering spans all thirty lessons without restarting at chapters", () => {
  assert.equal(typeof model.resolveMapPresentation, "function");
  assert.deepEqual(Array.from({length:30}, (_,i) => model.resolveMapPresentation({},i).number),
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]);
});

test("background selection switches at 768px and keeps each world's own fallbacks", () => {
  assert.equal(typeof model.resolveMapBackground, "function");
  assert.equal(model.resolveMapBackground("color-market",767)[0], "/static/worlds-v2/color-market-mobile.webp");
  assert.equal(model.resolveMapBackground("color-market",768)[0], "/static/worlds-v2/color-market-desktop.webp");
  assert.deepEqual(model.resolveMapBackground("color-market",390).slice(1), [
    "/static/worlds/02-refusing-bargaining.webp", "/static/worlds/02-refusing-bargaining.png", "/static/worlds/02-refusing-bargaining.jpg",
  ]);
});

test("a failed refresh preserves the existing map and hides the current action", async () => {
  const elements=new Map();
  for(const id of ["map-view","map-scroll","map-loading","map-error","current-lesson-button"]){
    const classes=new Set(id==="map-error"||id==="map-loading"?["hidden"]:[]);
    elements.set(id,{hidden:false,classList:{contains:x=>classes.has(x),remove:x=>classes.delete(x),toggle:(x,force)=>force?classes.add(x):classes.delete(x)}});
  }
  showMapLoadError({getElementById:id=>elements.get(id)}, {hasLibrary:true});
  assert.equal(elements.get("map-scroll").classList.contains("hidden"),false);
  assert.equal(elements.get("map-error").classList.contains("hidden"),false);
  assert.equal(elements.get("current-lesson-button").hidden,true);
});
