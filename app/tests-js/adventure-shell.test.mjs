import test from "node:test";
import assert from "node:assert/strict";
import { createAdventureShell, getFocusableElements } from "../static/adventure-shell.mjs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Node has no layout engine: these fixtures expose only the DOM boundary
// queried by the helper. The browser lifecycle is exercised with real DOM.
function control({ disabled = false, hidden = false, inert = false, visible = true, tabIndex = 0 } = {}) {
  return {
    disabled, tabIndex,
    matches: selector => selector === ":disabled" && disabled,
    closest: () => hidden || inert ? {} : null,
    getClientRects: () => visible ? [{}] : [],
    ownerDocument: { defaultView: { getComputedStyle: () => ({ visibility: "visible" }) } },
  };
}

test("focus trap excludes planned disabled stages and hidden or inert controls", () => {
  const activeStage = control();
  const lesson = control();
  const controls = [activeStage, control({ disabled: true }), control({ hidden: true }),
    control({ inert: true }), control({ visible: false }), control({ tabIndex: -1 }), lesson];
  assert.deepEqual(getFocusableElements({ querySelectorAll: () => controls }), [activeStage, lesson]);
});

test("empty drawer produces no focus targets", () => {
  assert.deepEqual(getFocusableElements({ querySelectorAll: () => [] }), []);
});

test("opening reveals the close control and destroy restores background and removes menu listeners", () => {
  const doc = new EventTarget();
  const elements = new Map();
  for (const id of ["map-view", "detail-view", "adventure-menu-button", "course-drawer", "drawer-backdrop",
    "course-drawer-close", "current-lesson-button", "course-stages", "course-chapters", "course-profile-button"]) {
    const element = new EventTarget();
    Object.assign(element, { id, inert: false, hidden: true, isConnected: true, scrollTop: 250,
      style: { overflowY: "scroll" }, classList: { contains: () => false },
      setAttribute(name, value) { this[name] = value; },
      closest: () => null,
      focus() { doc.activeElement = this; },
    });
    elements.set(id, element);
  }
  doc.querySelector = selector => elements.get(selector.slice(1));
  const get = id => elements.get(id);
  const menu = get("adventure-menu-button");
  menu.focus();
  const shell = createAdventureShell({ root: doc, onOpenLesson() {} });
  menu.dispatchEvent(new Event("click"));
  assert.equal(get("course-drawer").scrollTop, 0);
  assert.equal(doc.activeElement, get("course-drawer-close"));
  assert.equal(get("map-view").inert, true);
  assert.equal(get("map-view").style.overflowY, "hidden");
  assert.equal(menu["aria-expanded"], "true");
  shell.destroy();
  assert.equal(get("course-drawer").hidden, true);
  assert.equal(get("drawer-backdrop").hidden, true);
  assert.equal(get("map-view").inert, false);
  assert.equal(get("map-view").style.overflowY, "scroll");
  assert.equal(menu["aria-expanded"], "false");
  assert.equal(doc.activeElement, menu);
  menu.dispatchEvent(new Event("click"));
  assert.equal(get("course-drawer").hidden, true);
});

test("Electron populates both persistent mounts once without observing business DOM", async () => {
  const element = () => ({
    children: [], className: "", style: {},
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    querySelector() { return this.children.find(child => child.className === "window-controls"); },
    addEventListener() {}, setAttribute() {}, classList: { add() {} },
  });
  const mounts = [element(), element()];
  const doc = {
    readyState: "complete", head: element(), body: element(), createElement: element,
    querySelectorAll: () => mounts,
    querySelector: selector => selector === ".topbar" ? mounts[0] : null,
    addEventListener() {},
  };
  const win = { electronAPI: {} };
  let observations = 0;
  const source = await readFile(new URL("../static/titlebar.js", import.meta.url), "utf8");
  vm.runInNewContext(source, { document: doc, window: win,
    setTimeout() {}, MutationObserver: class { observe() { observations++; } },
  });
  win.__injectTitlebar();
  assert.deepEqual(mounts.map(mount => mount.children.length), [1, 1]);
  assert.deepEqual(mounts.map(mount => mount.children[0].children.length), [3, 3]);
  assert.equal(observations, 0);
});
