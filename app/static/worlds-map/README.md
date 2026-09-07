# Detailed scrolling-map artwork

Eleven original PNGs generated with built-in ImageGen on 2026-09-07: ten chapter scenes plus a repeating ground texture. No CLI/API generation, no bitmap resizing or sharpening. Portrait scenes are 1024×1536 native pixels; terrain is 1254×1254. The prompt requested larger output for the first scene, but the actual returned native dimensions are recorded here, not described as 4K.

Desktop now uses ten separate 1536×1024 landscape originals (`<world>-desktop.png`); mobile retains the 1024×1536 portraits. The scene fills the entire available width without lateral masks or grass sidebars, and repeats vertically with overlapping edges rather than stretching to chapter height. Images use proportional cover. `sceneStripLayout` tests full-width coverage, responsive aspect ratio and overlap. All scenery shares the route's native scroll container.

Only the selected desktop/mobile variant loads, within 800 CSS pixels of the map viewport; observation starts after chapter layout so zero-height slides cannot trigger every download on entry. Desktop fallback tries the same chapter's portrait before v2/legacy. Ground texture remains underneath for loading and overlaps, not as visible sidebars. Native pixel dimensions are not a promise of retina-resolution rendering at every screen density; very wide screens scale the landscape proportionally.

## Desktop correction

The initial 1024 CSS px width cap produced a portrait column with grass-only side panels on wide screens. The correction replaces that composition with full-width landscape assets. All ten were generated with built-in ImageGen, without bitmap postprocessing. First desktop reference: `morning-picnic.png`; subsequent desktop reference: `morning-picnic-desktop.png` (style only, changing chapter props).

Shared desktop prompt: Create a LANDSCAPE 3:2 desktop background, maximum native resolution, target1536×1024 or larger. Use the reference for warm green/gold miniature3D storybook style and a high overhead orthographic camera. No horizon, sky, depth-of-field blur, text, UI, paths, stones, platforms or people. Redesign as a coherent full-width scene, spreading chapter vignettes across the entire width. Center40% remains textured traversable ground for UI overlays. Abundant themed props and foliage at sides, consistent ground scale, no portrait pasted onto grass, no grass-only borders, no straight vertical boundaries or mirrored halves. Upper-left sunlight and contact shadows. Use each chapter's theme from the prompt recipe below; for subsequent chapters replace all orchard objects with that chapter's props.

Desktop original filenames under `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8`:

| Chapter asset | Generated original |
| --- | --- |
| morning-picnic-desktop.png | exec-2f1bc040-b08b-43bd-aedb-ffa4748646a3.png |
| color-market-desktop.png | exec-2abb3c68-5726-4f07-8b0e-a1743b4f7c4b.png |
| block-workshop-desktop.png | exec-34136c82-49be-48c6-aa7f-e3da391ca898.png |
| finding-forest-desktop.png | exec-d412f7ca-44ad-4e90-9376-ecd50dc5eb49.png |
| question-observatory-desktop.png | exec-6cca1a0a-e0a5-4ea6-a6e9-5a731b685f97.png |
| feeling-garden-desktop.png | exec-fc096b32-6cdc-4ccc-ac00-ce03345bc123.png |
| reasoning-valley-desktop.png | exec-3295244c-4166-4a8e-a509-f3e61cc29422.png |
| memory-town-desktop.png | exec-e9da94ea-ad2f-40d6-af60-76011aba3f3a.png |
| messenger-post-desktop.png | exec-f685ab2b-a28e-46ac-ae9e-43500f462398.png |
| planning-camp-desktop.png | exec-8935f9c4-bf79-4464-b8f0-abd5fe27a08e.png |

## Prompt recipe

Create a single production portrait 2:3 background for a children's polished 3D adventure scrolling game map. Camera elevated near top-down orthographic, no horizon, no sky, no distant vista, no bokeh, no blur or tiltshift, SHARP detailed ground and props at the same size top to bottom. Dense small grass blades, moss, clover and tiny flowers everywhere including central playable corridor. Warm golden light from upper left with grounded lower-right shadows; rich olive green and sandstone-compatible colors. Each edge occupies 25%, center 50% reserved for overlay level pedestals yet richly textured, no large central props. Warm detailed storybook 3D render. No people, animals, text, UI, route, stepping stones, platforms, stars or watermarks. One full-bleed portrait asset, max native resolution. Theme:

Orchard theme: apple trees, fence segments, apple crates and baskets, picnic blanket, windmill corner, planters, flower patches and fallen leaves distributed along both edges. The initial orchard prompt also specified 2048×3072 target and a crisp overhead game texture rather than a distant landscape.

Market theme: cozy colorful toy market garden with pastel awnings, wooden produce stalls, crates, rolled fabric and small flower pots along the outer edges.

- block-workshop: A cozy outdoor wooden-block and craft workshop garden. Small wooden workbenches, chunky colorful building blocks, toy mallet, apron, miniature shelves, potted flowers and wood shavings, staged along both outer margins.
- finding-forest: A comforting woodland rest-and-water garden with open miniature dollhouse corners. Little bench with cushions and folded blankets, ceramic jug and cup, leafy shade plants, soft woven mats, wildflowers and a tiny canopy along both outer margins.
- question-observatory: A tidy daily-routines garden courtyard: miniature home doorways, shoe cubby, coat hooks with small jackets, toy clock without marks or numbers, neatly folded picnic blanket, potted greenery and warm lamps along both outer margins.
- feeling-garden: A playful hide-and-find belongings garden, miniature open storage cubbies, colorful toy cars, toy dinosaur figurine, wicker baskets, a small toy chest, carefully arranged planters, wooden house corners along both outer margins.
- reasoning-valley: A cooperative play garden with miniature communal wooden building tables, connected wooden train tracks at edges, colorful play blocks, toy sailboats and baskets, small timber bridges crossing shallow edge streams, potted flowers and leafy bushes. All props along outer margins.
- memory-town: A cozy feelings-and-repair play garden with little wooden dollhouses, upholstered child-size reading benches, cushions and teddy-shaped wooden toys, repaired colorful block towers, baskets and tiny flowers. Warm welcoming forest-town atmosphere, edge vignettes.
- messenger-post: A safe family outing garden with miniature unlabelled wooden grocery stalls, woven produce baskets, a little tram stop bench with plain roof, tiny rail fence and streetlamps, picnic backpack and reusable water bottles among abundant flowers and clover along the edges.
- planning-camp: An imaginative tomorrow-planning camping garden: small canvas tents and rolled sleeping bags, toy telescope, wooden easel with blank canvas, closed picture books, model block tower and paint pots, lanterns and picnic basket among flowers at outer edges. Daylight, no fire.

Terrain prompt: seamless tileable square grass-ground texture, overhead, crisp deep focus, dense small clover, fine grass, moss, tiny daisies, warm olive greens, even scale and brightness, no large objects, no path, no text; opposite borders seamless.

## Original sources

- `morning-picnic.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-8bd5ed15-e80a-4627-b067-7f7cc1b935e7.png`
- `terrain.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-d44ddf9a-6f8a-4c81-8894-5f75cf28f0d2.png`
- `color-market.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-9124bb9b-eb35-42fa-a95c-03f084298106.png`
- `block-workshop.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-b557824c-7be7-448d-819c-9a384b30e6bd.png`
- `finding-forest.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-ae514d85-9bf1-403f-a14f-666bd3a138b3.png`
- `question-observatory.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-aae70d97-9d8b-48a6-906d-60a30189e6ad.png`
- `feeling-garden.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-85a1f069-18cf-44b6-9445-6a91621de709.png`
- `reasoning-valley.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-7ff5e8f0-f11f-46d5-90fe-d3980bb718a1.png`
- `memory-town.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-1eb8cd30-48c1-4d99-a838-ecedb508a091.png`
- `messenger-post.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-8f67884d-fe4b-48da-9c92-79814d33e2ab.png`
- `planning-camp.png`: `C:\Users\q00679663\.codex\generated_images\01a079ee-e01c-7801-ba32-5244a684abe8\exec-074301df-3c8a-488c-8340-c603a58a087e.png`
