import { STAGES } from "./adventure-navigation.mjs";
import { withChapterContext } from "./lesson-view.mjs";

export function getFocusableElements(root) {
  return [...root.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')]
    .filter(element => !element.disabled && !element.matches(":disabled") && element.tabIndex >= 0 &&
      !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
      element.ownerDocument.defaultView.getComputedStyle(element).visibility !== "hidden");
}

export function createAdventureShell({ root, onOpenLesson, onCurrentLesson, onProfile }) {
  const doc = root.ownerDocument || root;
  const find = id => root.querySelector(`#${id}`);
  const map = find("map-view");
  const detail = find("detail-view");
  const trigger = find("adventure-menu-button");
  const drawer = find("course-drawer");
  const backdrop = find("drawer-backdrop");
  const closeButton = find("course-drawer-close");
  const currentButton = find("current-lesson-button");
  const stages = find("course-stages");
  const chapters = find("course-chapters");
  const listeners = [];
  let opened = false;
  let destroyed = false;
  let origin;
  let previousOverflow;
  let previousInert;
  let lessons = new Map();
  let selectedLesson = null;

  function listen(element, event, handler) {
    element.addEventListener(event, handler);
    listeners.push(() => element.removeEventListener(event, handler));
  }

  function open() {
    if (opened || destroyed || map.classList.contains("hidden")) return;
    opened = true;
    origin = doc.activeElement;
    previousOverflow = map.style.overflowY;
    previousInert = [map.inert, detail.inert];
    drawer.hidden = false;
    drawer.scrollTop = 0;
    backdrop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    map.style.overflowY = "hidden";
    map.inert = true;
    detail.inert = true;
    closeButton.focus({ preventScroll: true });
  }

  function close() {
    if (!opened) return;
    opened = false;
    drawer.hidden = true;
    backdrop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    map.style.overflowY = previousOverflow;
    [map.inert, detail.inert] = previousInert;
    const destination = origin && origin.isConnected && !origin.closest('[hidden], [inert], .hidden') ? origin : trigger;
    destination.focus({ preventScroll: true });
  }

  function trapKeys(event) {
    if (!opened) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      const focusable = getFocusableElements(drawer);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        drawer.focus();
      } else if (event.shiftKey && (doc.activeElement === first || !drawer.contains(doc.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last || !drawer.contains(doc.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function make(tag, className, text) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function render(summary) {
    if (destroyed) return;
    const hadFocus = opened && drawer.contains(doc.activeElement);
    const focusedKey = doc.activeElement && doc.activeElement.dataset.lessonKey;
    const currentStage = STAGES.find(stage => stage.available);
    const stageLabel = find("adventure-stage-label");
    stageLabel.textContent = `${currentStage.label} · ${currentStage.theme}`;
    stageLabel.dataset.shortLabel = currentStage.label;
    find("star-count").textContent = summary.completed;
    find("star-total").textContent = summary.total;
    const progress = find("adventure-progress");
    progress.max = Math.max(1, summary.total);
    progress.value = summary.completed;
    find("course-drawer-progress").textContent = `${currentStage.label} · ${summary.completed} / ${summary.total} completed`;
    currentButton.hidden = !summary.current;
    currentButton.disabled = !summary.current || !onCurrentLesson;
    find("adventure-complete").hidden = !(summary.total > 0 && summary.completed === summary.total);

    stages.textContent = '';
    for (const stage of STAGES) {
      const button = make("button", "course-stage");
      button.type = "button";
      button.disabled = !stage.available;
      if (stage.available) button.setAttribute("aria-current", "page");
      const label = make("span", "course-stage__text");
      label.append(make("strong", "", stage.label), make("span", "", stage.theme));
      button.append(label, make("span", "course-stage__status", stage.available ? "Current" : "Planned"));
      stages.append(button);
    }

    const expanded = new Set([...chapters.querySelectorAll("details[open]")].map(item => item.dataset.chapter));
    const initialRender = chapters.childElementCount === 0;
    chapters.textContent = '';
    lessons = new Map();
    let number = 0;
    for (const chapter of summary.chapters) {
      const group = make("details", "course-chapter");
      group.dataset.chapter = chapter.name;
      group.open = initialRender ? (summary.current && summary.current.chapter === chapter.name) : expanded.has(chapter.name);
      const heading = make("summary", "course-chapter__heading");
      heading.append(make("span", "", chapter.title), make("span", "course-chapter__count", `${chapter.completed} / ${chapter.total}`));
      group.append(heading);
      const list = make("ul", "course-lessons");
      for (const level of chapter.levels) {
        number += 1;
        const key = `${chapter.name}/${level.level}`;
        const isCurrent = summary.current && summary.current.chapter === chapter.name && summary.current.level === level.level;
        const status = level.has_performance ? "Completed" : isCurrent ? "Current lesson" : level.state === "locked" ? "Locked · preview available" : "Available";
        const item = make("li");
        const button = make("button", "course-lesson");
        button.type = "button";
        button.dataset.lessonKey = key;
        button.dataset.state = level.has_performance ? "completed" : isCurrent ? "current" : level.state || "locked";
        button.dataset.selected = String(selectedLesson === key);
        if (isCurrent) button.setAttribute("aria-current", "step");
        const marker = make("span", "course-lesson__number", level.has_performance ? "✓" : String(number).padStart(2, "0"));
        marker.setAttribute("aria-hidden", "true");
        const label = make("span", "course-lesson__text");
        label.append(make("span", "course-lesson__title", level.title), make("span", "course-lesson__status", status));
        button.append(marker, label);
        item.append(button);
        list.append(item);
        lessons.set(key, withChapterContext(level, chapter));
      }
      group.append(list);
      chapters.append(group);
    }
    if (hadFocus && !drawer.contains(doc.activeElement)) {
      const replacement = [...chapters.querySelectorAll("[data-lesson-key]")].find(item => item.dataset.lessonKey === focusedKey);
      (replacement && getFocusableElements(drawer).includes(replacement) ? replacement : closeButton).focus({ preventScroll: true });
    }
  }

  function selectLesson(lesson) {
    selectedLesson = `${lesson.chapter}/${lesson.level}`;
    chapters.querySelectorAll("[data-lesson-key]").forEach(item => {
      item.dataset.selected = String(item.dataset.lessonKey === selectedLesson);
    });
  }

  listen(trigger, "click", open);
  listen(currentButton, "click", () => onCurrentLesson && onCurrentLesson({ behavior: "smooth" }));
  listen(closeButton, "click", close);
  listen(backdrop, "click", close);
  listen(doc, "keydown", trapKeys);
  listen(doc, "focusin", event => {
    if (opened && !drawer.contains(event.target)) closeButton.focus({ preventScroll: true });
  });
  listen(chapters, "click", event => {
    const button = event.target.closest("[data-lesson-key]");
    const lesson = lessons.get(button && button.dataset.lessonKey);
    if (!lesson) return;
    selectLesson(lesson);
    close();
    onOpenLesson(lesson);
  });
  listen(find("course-profile-button"), "click", () => {
    close();
    if (onProfile) onProfile();
  });

  function destroy() {
    close();
    listeners.forEach(remove => remove());
    listeners.length = 0;
    lessons.clear();
    destroyed = true;
  }

  return { render, open, close, selectLesson, destroy };
}
