// Small DOM boundaries shared by the map controller and its regression tests.
export function createCelebrationQueue() {
  const pending = new Set();
  return {
    queue(levelKey) { pending.add(levelKey); },
    consume(levelKey) { return pending.delete(levelKey); },
    clear() { pending.clear(); },
  };
}

export function resolveCompletionTransition(before, after) {
  return {
    lesson: !before.hasPerformance && after.hasPerformance,
    chapter: before.chapterCompleted < before.chapterTotal
      && after.chapterCompleted === after.chapterTotal,
  };
}

export function createCurrentLessonAction({ root, view }) {
  let cancel = () => {};
  return function scrollToCurrentLesson({ behavior = "smooth" } = {}) {
    cancel();
    const map = root.getElementById("map-view");
    const node = map.querySelector("[data-current-lesson]");
    if (!node || map.classList.contains("hidden")) return;
    if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) behavior = "auto";
    let timer;
    const cleanup = () => {
      view.clearTimeout(timer);
      map.removeEventListener("scrollend", finish);
    };
    const finish = () => {
      cleanup();
      if (node.isConnected && !map.classList.contains("hidden")) node.focus({ preventScroll: true });
    };
    cancel = cleanup;
    if (behavior !== "auto") {
      map.addEventListener("scrollend", finish, { once: true });
      // Older WebViews lack scrollend; also handles an already-centered node.
      timer = view.setTimeout(finish, 1200);
    }
    node.scrollIntoView({ behavior, block: "center" });
    if (behavior === "auto") view.requestAnimationFrame(finish);
  };
}

export function showMapLoadState(root, id) {
  for (const name of ["map-loading", "map-error", "map-scroll"]) {
    root.getElementById(name).classList.toggle("hidden", name !== id);
  }
}

export function showMapLoadError(root, { hasLibrary }) {
  root.getElementById("current-lesson-button").hidden = true;
  showMapLoadState(root, "map-error");
  if (hasLibrary) root.getElementById("map-scroll").classList.remove("hidden");
}
