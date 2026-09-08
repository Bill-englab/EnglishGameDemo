// Full-width landscape scenes on desktop, portrait scenes on mobile. Repeat
// vertically with overlap instead of stretching artwork to the chapter height.
import { mapAsset } from './map-assets.mjs';

export function stoneWorldCandidates(world, fallback, width = 767) {
  return [...(width >= 768 ? [mapAsset(`/static/worlds-map/${world}-desktop.png`)] : []), mapAsset(`/static/worlds-map/${world}.png`), ...fallback];
}

export function sceneStripLayout(width, height) {
  const stripWidth = Math.max(1, width);
  const stripHeight = stripWidth * (width >= 768 ? 2 / 3 : 1.5);
  const overlap = Math.min(120, stripHeight / 4);
  const step = stripHeight - overlap;
  const count = Math.max(1, Math.ceil((height - overlap) / step));
  return { width: stripWidth, height: stripHeight, tops: Array.from({ length: count }, (_, i) => i * step) };
}

export function layoutSceneStrips(slide, height) {
  const layout = sceneStripLayout(slide.clientWidth, height);
  let art = slide.querySelector('.stone-world-art');
  if (!art) {
    art = document.createElement('div');
    art.className = 'stone-world-art';
    slide.appendChild(art);
  }
  art.style.width = `${layout.width}px`;
  art.style.setProperty('--strip-height', `${layout.height}px`);
  if (art.children.length !== layout.tops.length) {
    art.textContent = '';
    art.append(...layout.tops.map(() => {
      const strip = document.createElement('div');
      strip.className = 'stone-world-strip';
      return strip;
    }));
  }
  [...art.children].forEach((strip, i) => strip.style.top = `${layout.tops[i]}px`);
}
