# Living Chapter Worlds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enlarge the central route and replace small side stickers with ten distinct animated chapter hero scenes.

**Architecture:** Extend the pure chapter theme model with deterministic hero-scene identities, render those heroes as inline SVG beside atmospheric props, and animate only internal SVG parts through CSS. Preserve the Flask/API/detail stack.

**Tech Stack:** Flask, native ES modules, inline SVG, CSS animations, Node test runner, pytest.

## Global Constraints

- Desktop ratio is 18/64/18; mobile ratio is 12/76/12.
- Desktop nodes are 220/244px; mobile nodes are 140/152px.
- All nodes remain clickable.
- Scenery never captures pointer events or moves route geometry.
- Reduced motion disables scene animation.
- No raster backgrounds or build tool.

## Tasks

- [x] Test and implement the living-world model.
- [x] Render ten large animated chapter scenes.
- [x] Enlarge the route and responsive node system.
- [x] Verify desktop, mobile and all interaction states.

