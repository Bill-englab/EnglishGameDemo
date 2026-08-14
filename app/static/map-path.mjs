// ============================================================
// map-path.mjs — Catmull-Rom-to-cubic-Bézier smooth path builder.
// Pure module: no DOM, no mutation of the input array.
// ============================================================

// Tension factor for control-point derivation. ~0.16 mirrors the prior
// in-app smoothPath so the trail keeps its gentle curvature.
const TENSION = 0.16;

// Builds an SVG path string ("M x y C ... C ...") through the given points
// using a Catmull-Rom spline converted to cubic Bézier segments.
//
// - Returns "" for fewer than two points.
// - Returns a straight "M x y L x y" for exactly two points.
// - Otherwise emits one "M" moveto followed by N-1 "C" cubic segments, each
//   separated from the next by " C " (note the surrounding spaces) so callers
//   can split/count segments reliably.
// - NEVER mutates the input array.
//
// points: Array<{x:number, y:number}>
export function buildSmoothPath(points) {
  if (!Array.isArray(points) || points.length < 2) return "";

  // Work on a defensive copy so neighbor lookups never touch the caller's array.
  const pts = points.map(p => ({ x: p.x, y: p.y }));

  // Two-point case: a plain line keeps the route readable for the shortest map.
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
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
