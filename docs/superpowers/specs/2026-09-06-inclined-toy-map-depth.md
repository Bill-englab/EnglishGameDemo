# Inclined Toy Map Depth Design

**Status:** Approved from the user's 2026-09-06 reference image and follow-up direction.

## Goal

Make the adventure map read as a polished miniature playset viewed from a gentle angle, rather than flat circles and a line seen directly from above. Match the reference image's top-control placement and tangible 3D button language without changing curriculum, progress, media, or navigation behavior.

## Camera and geometry

- Desktop uses a medium 2.5D board view equivalent to roughly a 20-degree camera incline; mobile reduces the apparent incline to roughly 12–15 degrees.
- The route top surface, lesson-disc top surfaces, their visible front sidewalls, and their cast shadows share one light direction: light from upper-left, shadow toward lower-right.
- Route and node centers remain driven by the existing DOM measurements so the SVG route remains attached to all 30 lessons after fonts, thumbnails, resize, and responsive layout changes.
- Text, icons, stars, locks, and locator glyphs stay front-facing and legible. Perspective is expressed by the containing surfaces, not by distorting UI copy.

## Route anatomy

The code-rendered route has six coordinated layers:

1. a broad, soft ground shadow offset down and right;
2. a dark warm contact shadow;
3. a warm sandstone sidewall visibly lower than the top face;
4. a cream stone top surface shifted upward;
5. a narrow upper-left highlight;
6. restrained transverse seams on the top surface.

Completed/current progress strokes remain thin overlays on the top face. They do not replace the material surface or become neon effects.

## Lesson-disc anatomy

- Empty discs use a slightly elliptical top face, a separate front sidewall, a thin highlight rim, a contact shadow, and a soft cast shadow.
- Video-cover discs use the same physical construction at a larger size. The thumbnail is clipped to the top face; it must not conceal the rim, sidewall, number badge, or state marker.
- The current lesson remains the dominant checkpoint with a teal double rim and locator. Completed keeps one star; locked keeps one lock. All remain binary states.
- Hover lifts the physical disc by a few pixels; active presses it toward its sidewall. Reduced-motion removes ambient animation but preserves static depth.

## Top controls

Desktop follows the approved reference composition:

- upper-left: independent cream circular menu button followed by a teal Stage capsule;
- upper-center: cream progress capsule with the avatar overlapping its right edge;
- upper-right: Electron minimize, maximize, and close controls when available;
- below the window controls: an independent teal Current lesson button.

All game controls use the same upper-left specular highlight, visible lower edge, lower-right cast shadow, rounded toy geometry, consistent typography, and press response. The avatar is part of the progress group visually, not a separate unrelated capsule. Browser mode keeps account access in the same avatar position and leaves no gap for absent window controls.

At 768–1023px the groups compact but preserve alignment. Below 768px the one-row shell remains usable and non-overlapping; the progress bar and account text may hide, while the avatar remains the account target.

## Constraints and acceptance

- Native ES modules and existing Flask/Electron architecture only; no new dependency or build step.
- Do not alter lesson data, state rules, uploads, recordings, demos, profiles, or routes.
- Preserve minimum 44×44px interactive targets, keyboard focus, drawer behavior, current-lesson behavior, and Electron window IPC.
- Verify 1536×1024 against the accepted reference, plus 1440×960, 800×600 Electron, 390×844 portrait, and 844×390 landscape.
- Acceptance requires visible sidewall depth on the route and at least one ordinary/current/locked disc, aligned top controls, no horizontal overflow, path-to-node alignment, and no browser console errors.

