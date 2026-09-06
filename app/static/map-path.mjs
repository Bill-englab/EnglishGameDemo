// ============================================================
// map-path.mjs — Catmull-Rom-to-cubic-Bézier smooth path builder.
// Pure module: no DOM, no mutation of the input array.
// ============================================================

// Tension factor for control-point derivation. ~0.16 mirrors the prior
// in-app smoothPath so the trail keeps its gentle curvature.
const TENSION = 0.16;

// One authored rhythm for the whole 30-lesson stage. Uneven turning spans
// (4, 4, 5, 5, 6, 5) keep the route scenic without restarting a chapter-sized
// zigzag. Values are normalized so desktop and mobile preserve the same flow.
const SCENIC_ROUTE_ANCHORS = Object.freeze([
  Object.freeze({ index: 0, x: -0.72 }),
  Object.freeze({ index: 4, x: 0.82 }),
  Object.freeze({ index: 8, x: -0.90 }),
  Object.freeze({ index: 13, x: 0.78 }),
  Object.freeze({ index: 18, x: -0.84 }),
  Object.freeze({ index: 24, x: 0.92 }),
  Object.freeze({ index: 29, x: -0.66 }),
]);

const SCENIC_DESKTOP_AMPLITUDE = 150;
const SCENIC_MOBILE_AMPLITUDE = 46;

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

// Returns fresh responsive offsets for one global lesson index. Clamping keeps
// the layout deterministic if a caller briefly renders incomplete/stale data.
export function getScenicRouteOffset(index) {
  const numericIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const clampedIndex = Math.max(
    SCENIC_ROUTE_ANCHORS[0].index,
    Math.min(SCENIC_ROUTE_ANCHORS.at(-1).index, numericIndex),
  );

  let left = SCENIC_ROUTE_ANCHORS[0];
  let right = SCENIC_ROUTE_ANCHORS.at(-1);
  for (let anchorIndex = 1; anchorIndex < SCENIC_ROUTE_ANCHORS.length; anchorIndex += 1) {
    if (clampedIndex <= SCENIC_ROUTE_ANCHORS[anchorIndex].index) {
      right = SCENIC_ROUTE_ANCHORS[anchorIndex];
      left = SCENIC_ROUTE_ANCHORS[anchorIndex - 1];
      break;
    }
  }

  const span = right.index - left.index;
  const progress = span ? (clampedIndex - left.index) / span : 0;
  const normalizedX = left.x + (right.x - left.x) * smoothstep(progress);
  return {
    desktopPx: Math.round(normalizedX * SCENIC_DESKTOP_AMPLITUDE),
    mobilePx: Math.round(normalizedX * SCENIC_MOBILE_AMPLITUDE),
  };
}

// The shared join is the current node; the connector to locked stays upcoming.
export function splitPathPoints(points, firstLockedIndex) {
  if (firstLockedIndex < 0 || firstLockedIndex >= points.length) {
    return { traveled: points.slice(), upcoming: [] };
  }
  return { traveled: points.slice(0, firstLockedIndex),
    upcoming: points.slice(Math.max(0, firstLockedIndex - 1)) };
}

// Builds an SVG path string ("M x y C ... C ...") through the given points
// using a Catmull-Rom spline converted to cubic Bézier segments.
//
// - Returns "" for fewer than two points.
// - Returns a straight "M x y L x y" for exactly two points.
// - Otherwise emits one "M" moveto followed by N-1 "C" cubic segments, each
//   separated from the next by " C " (note the surrounding spaces) so callers
//   can split/count segments reliably.
// - NEVER mutates the input array.
// - Optional inclusive endpoint indices emit a partial stroke while retaining
//   the full route's neighbors, so overlays share the underlying curve exactly.
//
// points: Array<{x:number, y:number}>
export function buildSmoothPath(points, { startIndex = 0, endIndex = points?.length - 1 } = {}) {
  if (!Array.isArray(points) || points.length < 2 || endIndex <= startIndex) return "";

  // Work on a defensive copy so neighbor lookups never touch the caller's array.
  const pts = points.map(p => ({ x: p.x, y: p.y }));

  // Two-point case: a plain line keeps the route readable for the shortest map.
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[startIndex].x} ${pts[startIndex].y}`;
  for (let i = startIndex; i < endIndex; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const c1x = p1.x + (p2.x - p0.x) * TENSION;
    const c1y = p1.y + (p2.y - p0.y) * TENSION;
    const c2x = p2.x - (p3.x - p1.x) * TENSION;
    const c2y = p2.y - (p3.y - p1.y) * TENSION;

    // Each segment is prefixed with " C " — the leading space separates it
    // from the preceding moveto/endpoint, and the trailing space separates
    // the command letter from its first control-point coordinate.
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
