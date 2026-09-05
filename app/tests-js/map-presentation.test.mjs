import test from "node:test";
import assert from "node:assert/strict";
import * as model from "../static/map-model.mjs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("only performance earns a completion check; current and preview have distinct markers", () => {
  assert.equal(typeof model.resolveMapPresentation, "function");
  for (const [level, expected] of [
    [{has_performance:true,current:true,has_demo:true}, {state:"completed",number:1,showCover:true,marker:"check"}],
    [{has_performance:false,current:true,has_demo:true}, {state:"current",number:1,showCover:true,marker:"locator"}],
    [{has_performance:false,current:false,state:"completed",has_demo:false}, {state:"locked",number:1,showCover:false,marker:"lock"}],
  ]) assert.deepEqual(model.resolveMapPresentation(level, 0), expected);
});

test("current action centers then focuses the real node and forces auto for reduced motion", async () => {
  const source = await readFile(new URL("../static/app.js", import.meta.url), "utf8");
  const start = source.indexOf("function scrollToCurrentLesson(");
  assert.notEqual(start, -1, "Map exposes its current action");
  const action = source.slice(start, source.indexOf("// Background images", start));
  for (const reduced of [false,true]) {
    const calls = [];
    let end;
    const node = {isConnected:true, scrollIntoView: options => calls.push(["scroll",options]), focus: options => calls.push(["focus",options])};
    const map = {classList:{contains:()=>false}, querySelector:()=>node, addEventListener:(event,fn)=>{end=fn;},removeEventListener(){}};
    const context = {document:{getElementById:()=>map}, window:{matchMedia:()=>({matches:reduced})}, setTimeout:()=>1, clearTimeout(){}, requestAnimationFrame:fn=>fn(), cancelCurrentJump:()=>{}};
    vm.runInNewContext(`${action}\nscrollToCurrentLesson({behavior:"smooth"});`,context);
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
  const source = await readFile(new URL("../static/app.js", import.meta.url), "utf8");
  const start=source.indexOf("function showOnly(");
  const code=source.slice(start, source.indexOf('document.getElementById("map-retry")',start));
  const elements=new Map();
  for(const id of ["map-view","map-scroll","map-loading","map-error","current-lesson-button"]){
    const classes=new Set(id==="map-error"||id==="map-loading"?["hidden"]:[]);
    elements.set(id,{hidden:false,classList:{contains:x=>classes.has(x),remove:x=>classes.delete(x),toggle:(x,force)=>force?classes.add(x):classes.delete(x)}});
  }
  const context={document:{getElementById:id=>elements.get(id)}, currentLibrary:[{name:"one"}],fetch:async()=>{throw new Error("offline");},console:{error(){}}};
  await vm.runInNewContext(`${code}\nloadLibrary();`,context);
  assert.equal(elements.get("map-scroll").classList.contains("hidden"),false);
  assert.equal(elements.get("map-error").classList.contains("hidden"),false);
  assert.equal(elements.get("current-lesson-button").hidden,true);
});
