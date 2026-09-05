# Responsive Modern Toy Theatre chapter worlds

Twenty independently generated local chapter backgrounds. Desktop: 8:5, 1920 × 1200. Mobile: 9:16, 1080 × 1920. All final files are RGB WebP, Pillow quality=88. Mobile compositions are independently generated, never cropped from desktop images.

Generation: built-in ImageGen, one call per bitmap. No CLI/API generation. Sources remain under Codex generated_images; final assets are stored here. Pillow is used only for final dimensions/color space/encoding.

## Exact prompt recipe

Each image prompt is the common block, then `Chapter theme: ` plus its theme text below, then the relevant layout block. No reference image is supplied to the generation call; the approved map was visually inspected as the style target.

### Common block

```text
Premium modern toy-theatre chapter background for My English Adventure.
Tactile clay, painted wood, matte ceramic and fabric; muted teal, apricot,
butter yellow and cocoa; warm natural daylight. No people, characters,
text, UI, buttons, route, path, circles, lesson nodes or watermark.
Leave a broad uncluttered zig-zag grass corridor through the composition
for a code-rendered route and three large video nodes. Keep the chapter's
named props at the edges; preserve readable foreground/midground/background.
```

### Desktop layout block

```text
Desktop asset: exact aspect ratio 8:5 landscape, 1920x1200 target. Elevated three-quarter diorama view. Scene fills the frame; props grouped in broad left and right margins; a continuous wide open grass area occupies the middle 60 percent of the image from foreground to background. The grass area stays unmarked and visually quiet. Detailed matte textures, rounded sculpted greenery, natural depth. No animals, no stepping stones, no platforms or discs.
```

### Mobile layout block

```text
Mobile asset: exact aspect ratio 9:16 portrait, 1080x1920 target. Independently composed tall scene, not a crop of a landscape. Elevated three-quarter diorama view with vertically staggered edge vignettes and a wide continuous quiet grass area through the middle 60 percent from bottom to top. Props remain small and close to the outer edges, so the full height supports three overlay nodes. Detailed matte textures, rounded sculpted greenery, natural depth. No animals, no stepping stones, no platforms or discs.
```

## Chapter themes and files

### morning-picnic

- `morning-picnic-desktop.webp`: 8:5, 1920 × 1200.
- `morning-picnic-mobile.webp`: 9:16, 1080 × 1920.

```text
Orchard with colorful windmill and picnic blanket. Rounded fruit trees, a small pastel wooden windmill, woven picnic cloth and basket at the edges.
```

### color-market

- `color-market-desktop.webp`: 8:5, 1920 × 1200.
- `color-market-mobile.webp`: 9:16, 1080 × 1920.

```text
Soft-colored miniature market with small tidy pack-away stalls. Foldable wood counters, pastel cloth awnings and neatly stored produce crates at the edges; all surfaces unlabelled.
```

### block-workshop

- `block-workshop-desktop.webp`: 8:5, 1920 × 1200.
- `block-workshop-mobile.webp`: 9:16, 1080 × 1920.

```text
Wooden blocks and craft workshop. Small workbench, wood blocks, toy mallet and fabric tool apron at the edges.
```

### finding-forest

- `finding-forest-desktop.webp`: 8:5, 1920 × 1200.
- `finding-forest-mobile.webp`: 9:16, 1080 × 1920.

```text
Comfortable family corner with drinking-water and rest cues. Cozy open dollhouse nook, soft cushions, folded blanket, ceramic water jug and cup at the edges, beside an open grassy courtyard.
```

### question-observatory

- `question-observatory-desktop.webp`: 8:5, 1920 × 1200.
- `question-observatory-mobile.webp`: 9:16, 1080 × 1920.

```text
Morning preparation miniature town with clothes, hats and time cues. Tiny houses, a wood coat stand with a hat and jacket, small blank-faced clock with hands but NO numerals at the edges.
```

### feeling-garden

- `feeling-garden-desktop.webp`: 8:5, 1920 × 1200.
- `feeling-garden-mobile.webp`: 9:16, 1080 × 1920.

```text
Toy park with storage and lost-and-found cues. Low wood toy shelves, tidy baskets, a single small mitten and a wooden toy car at the edges; no labels.
```

### reasoning-valley

- `reasoning-valley-desktop.webp`: 8:5, 1920 × 1200.
- `reasoning-valley-mobile.webp`: 9:16, 1080 × 1920.

```text
Cooperative playground construction site. Part-built wood play structure, stacked beams, toy crane and a small tool basket at the edges.
```

### memory-town

- `memory-town-desktop.webp`: 8:5, 1920 × 1200.
- `memory-town-mobile.webp`: 9:16, 1080 × 1920.

```text
Garden with a little bridge and a repairable shared creation. Flower beds, small wooden bridge entirely along one outer edge, a half-assembled wooden flower planter and nearby spare pieces.
```

### messenger-post

- `messenger-post-desktop.webp`: 8:5, 1920 × 1200.
- `messenger-post-mobile.webp`: 9:16, 1080 × 1920.

```text
Outing scene with a miniature shop, parked toy vehicle and safe waiting area. Unlabelled shop with awning, a toy bus, protected waiting bench and short safety fence at the edges; no road or markings.
```

### planning-camp

- `planning-camp-desktop.webp`: 8:5, 1920 × 1200.
- `planning-camp-mobile.webp`: 9:16, 1080 × 1920.

```text
Family campsite with tomorrow-planning cues. Cloth tent, rolled sleeping mat, picnic stool and completely blank wood planning board at the edges. Do not draw the route or any markings on the board.
```

## Asset contract and review

Two final images append a refinement after the layout block:

- `feeling-garden-desktop.webp`: `Additional constraint: Every basket contains only plain folded fabric or geometric wood blocks. Absolutely no stuffed animals, dolls, figurines, faces, rabbits, bears or character-shaped toys anywhere. Use an empty low storage shelf, a mitten and a plain wooden car as the only toy props.`
- `messenger-post-mobile.webp`: `Additional constraint: Shop facade is smooth plain painted matte teal with absolutely no lettering, logos, engraving, glyphs or decorative marks. Omit all signs and signboards. Keep every fence strictly against the side edge; no fence or object may cross the central grass area, including at the bottom.`

The initial toy-park desktop contained a stuffed rabbit and was rejected; the initial outing mobile had ambiguous engraved marks and a fence across the lower grass, and was rejected. Both replacements were generated afresh with the built-in tool.

`../world-assets.mjs` exports the root, canonical-to-legacy mapping and ordered local candidates. Each result starts with the responsive v2 WebP, followed by legacy WebP, PNG and JPG candidates. Unknown worlds use morning-picnic, including inherited object property names. Some legacy candidates are intentionally absent; the consuming loader must try them in order and retain its local visual fallback.

These are backgrounds only: no UI, text, characters, lesson circles/nodes, baked route, path or watermark. Named props stay at the edges around quiet grass for the code-rendered route and three video nodes. Natural round object parts (cups, clocks, vehicle wheels) are props, never lesson markers. Final visual inspection checks each file for its theme, distinct responsive composition, readable depth and continuous central open grass.
