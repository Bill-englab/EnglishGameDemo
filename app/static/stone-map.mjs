// Shared Web/Electron stone map: rectangular media on reusable sandstone art.
// Shared auth/library/detail remain owned by app.js. No progress is invented here.
import { withChapterContext } from './lesson-view.mjs';
import { getLevelVisualState, getChapterTheme } from './map-model.mjs';
import { layoutSceneStrips } from './stone-worlds.mjs';
import { mapAsset } from './map-assets.mjs';

const ASSETS = '/static/stone-map/';
let mediaObserver;
let deferMedia = true;
let stageQuery = '';
const pendingMedia = new WeakMap();

function loadNearMap(media, src) {
  if (!deferMedia || !mediaObserver) { media.src = src; return; }
  pendingMedia.set(media, src);
  mediaObserver.observe(media);
}
const ICONS = {
  current: '<svg viewBox="0 0 48 58" aria-hidden="true"><path d="M24 54C19 50 4 35 4 23a20 20 0 1 1 40 0c0 12-15 27-20 31Z" fill="#298b85" stroke="#fff6df" stroke-width="3"/><circle cx="24" cy="23" r="8" fill="none" stroke="#fff6df" stroke-width="3"/><circle cx="24" cy="23" r="2" fill="#fff6df"/></svg>',
  locked: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="21" fill="#776c58" stroke="#fff6df" stroke-width="3"/><rect x="14" y="22" width="20" height="15" rx="3" fill="none" stroke="#fff6df" stroke-width="2.5"/><path d="M18 22v-6a6 6 0 0 1 12 0v6M24 27v5" fill="none" stroke="#fff6df" stroke-width="2.5"/></svg>',
};
const make = (tag, className, text) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

export function disposeStoneMedia() {
  if (mediaObserver) mediaObserver.disconnect();
  document.querySelectorAll('.stone-frame video').forEach(video => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  });
}

function createStoneLesson(level, index, onOpen) {
  const state = getLevelVisualState(level);
  const status = { completed: 'Completed', current: 'Current lesson', locked: 'Locked · preview available' }[state];
  const wrap = make('button', `level-node-wrap level-node-wrap--${state} stone-lesson`);
  wrap.type = 'button';
  wrap.dataset.levelKey = `${level.chapter}/${level.level}`;
  wrap.setAttribute('aria-label', `${index + 1}. ${level.title} — ${status}`);
  if (state === 'current') {
    wrap.dataset.currentLesson = wrap.dataset.levelKey;
    wrap.setAttribute('aria-current', 'step');
  }
  const node = make('span', `level-node level-node--${state}`);
  const frame = make('span', 'stone-frame');
  const placeholder = make('span', 'stone-placeholder');
  placeholder.innerHTML = '<svg viewBox="0 0 64 48" aria-hidden="true"><rect x="4" y="4" width="56" height="40" rx="6"/><path d="m26 15 16 9-16 9Z"/></svg>';
  frame.appendChild(placeholder);
  // A normal rectangular first frame; no masking or per-photo art processing.
  if (level.has_performance) {
    const video = make('video', 'stone-thumbnail');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener('loadeddata', () => placeholder.hidden = true);
    video.addEventListener('error', () => { video.hidden = true; placeholder.hidden = false; });
    loadNearMap(video, `/video/${level.chapter}/${level.level}/performance${stageQuery}#t=0.1`);
    frame.appendChild(video);
  } else if (level.has_demo) {
    const img = make('img', 'stone-thumbnail');
    img.alt = '';
    img.addEventListener('load', () => placeholder.hidden = true);
    img.addEventListener('error', () => { img.hidden = true; placeholder.hidden = false; });
    loadNearMap(img, `/thumb/${level.chapter}/${level.level}${stageQuery}`);
    frame.appendChild(img);
  }
  const badge = make('span', `stone-badge stone-badge--${state}`);
  badge.setAttribute('aria-hidden', 'true');
  if (state === 'completed') {
    const star = make('img', 'stone-star');
    star.src = mapAsset(`${ASSETS}star.png`);
    star.alt = '';
    badge.appendChild(star);
  } else badge.innerHTML = ICONS[state];
  frame.appendChild(badge);
  const base = make('span', 'stone-pedestal');
  base.setAttribute('aria-hidden', 'true');
  base.appendChild(make('span', 'stone-number', String(index + 1)));
  node.append(frame, base);
  const title = make('span', 'stone-title', level.title);
  if (state === 'current') title.prepend(make('span', 'level-title__status', 'Current lesson'));
  wrap.append(node, title);
  wrap.addEventListener('click', () => onOpen(level));
  return wrap;
}

export function renderStoneMap(map, library, onOpen, { sample = false, stage = null } = {}) {
  // The scenery and stones share one scrolling canvas, so their positions stay
  // attached without a delayed scroll-event transform. Keep the shared loader.
  map.parentElement.prepend(document.getElementById('bg-layer'));
  deferMedia = !sample;
  stageQuery = stage ? `?stage=${encodeURIComponent(stage)}` : '';
  mediaObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      const src = pendingMedia.get(target);
      if (src) target.src = src;
      pendingMedia.delete(target);
      mediaObserver.unobserve(target);
    }
  }, { root: document.getElementById('map-view'), rootMargin: '600px' }) : null;
  const shown = sample ? library.slice(0, 1) : library;
  const route = make('div', 'stone-route');
  route.setAttribute('aria-hidden', 'true');
  map.appendChild(route);
  let index = 0;
  for (const [chapterIndex, chapter] of shown.entries()) {
    const section = make('section', 'chapter-world stone-chapter');
    section.dataset.chapter = chapter.name;
    const theme = getChapterTheme(chapter.name);
    section.dataset.world = theme.world;
    section.style.setProperty('--chapter-accent', theme.accent);
    const main = make('div', 'chapter-main');
    const heading = make('header', 'chapter-heading');
    heading.append(make('span', 'ch-no', `CHAPTER ${String(chapterIndex + 1).padStart(2, '0')}`),
      make('span', 'ch-name', chapter.title),
      make('span', 'ch-progress', `★ ${chapter.levels.filter(l => l.has_performance).length}/${chapter.levels.length}`));
    const col = make('div', 'chapter-levels');
    (sample ? chapter.levels.slice(0, 3) : chapter.levels).forEach(level => {
      col.appendChild(createStoneLesson(withChapterContext(level, chapter), index++, onOpen));
    });
    main.append(heading, col);
    section.append(main);
    map.appendChild(section);
  }
  if (!shown.length) map.appendChild(make('p', 'status-card', 'Your adventure is being prepared.'));
  const shownCurrent = map.querySelector('[data-current-lesson]');
  document.getElementById('current-lesson-button').hidden = !shownCurrent;
  document.getElementById('path-svg').innerHTML = '';
}

export function drawStonePath() {
  const route = document.querySelector('.stone-route');
  if (!route || !route.getClientRects().length) return;
  const origin = route.getBoundingClientRect();
  const canvas = document.getElementById('map-scroll').getBoundingClientRect();
  const sections = [...document.querySelectorAll('.stone-chapter')];
  const slides = [...document.querySelectorAll('.bg-layer__slide')];
  const headerHeight = document.querySelector('.topbar').offsetHeight;
  sections.forEach((section, index) => {
    const bounds = section.getBoundingClientRect();
    const slide = slides.find(item => item.dataset.chapter === section.dataset.chapter);
    if (!slide) return;
    const overlap = index === 0 ? headerHeight : 120;
    slide.style.top = `${bounds.top - canvas.top - overlap}px`;
    const height = bounds.height + overlap + (index === sections.length - 1 ? 160 : 0);
    slide.style.height = `${height}px`;
    layoutSceneStrips(slide, height);
  });
  const lessons = [...document.querySelectorAll('.stone-lesson')];
  const mobile = window.innerWidth < 768;
  route.textContent = '';
  for (let gap = 0; gap < lessons.length - 1; gap++) {
    const title = lessons[gap].querySelector('.stone-title').getBoundingClientRect();
    const next = lessons[gap + 1].querySelector('.stone-frame').getBoundingClientRect();
    const crossChapter = lessons[gap].closest('.stone-chapter') !== lessons[gap + 1].closest('.stone-chapter');
    // Chapter plaques act as gateways: the incoming path ends before the title,
    // rather than running through it. The next lesson begins below the plaque.
    const destination = crossChapter
      ? lessons[gap + 1].closest('.stone-chapter').querySelector('.chapter-heading').getBoundingClientRect()
      : next;
    const direction = gap % 2 ? 1 : -1;
    const radius = mobile ? 64 : 124;
    const x0 = (title.left + title.right) / 2 - origin.left;
    const x1 = (destination.left + destination.right) / 2 - origin.left;
    const y0 = title.bottom - origin.top + (mobile ? 22 : 26);
    const y1 = destination.top - origin.top - (mobile ? 20 : 24);
    for (let step = 0; step < 5; step++) {
      const t = step / 4;
      const arc = Math.sin(Math.PI * (0.13 + t * 0.74));
      const x = x0 + (x1 - x0) * t + direction * radius * arc;
      const y = y0 + (y1 - y0) * t;
      const stone = make('img', 'stone-paver');
      stone.src = mapAsset(`${ASSETS}paver.png`);
      stone.alt = '';
      stone.dataset.gap = String(gap);
      stone.style.left = `${x}px`;
      stone.style.top = `${y}px`;
      stone.style.transform = `translate(-50%, -50%) rotate(${[-7, 5, -3, 8, -4][step]}deg)`;
      route.appendChild(stone);
    }
  }
}
