# Stone-map assets

These local reusable art assets power the shared Web/Electron 30-lesson map.
`/?map-sample=1` retains a three-lesson comparison view using the same renderer.

- `pedestal.png`: transparent warm sandstone base; number is real DOM text.
- `paver.png`: transparent separated stepping stone; direction/placement is code.
- `star.png`: one large transparent completion star; binary completion only.
- `sample/*.png`: fictional ImageGen illustrations, including a generated child,
  for the isolated preview runner only. These are not family recordings and are
  never assigned to an account in the real app.

Built-in ImageGen was used. Approved visual reference in the current task:
`exec-4e3c7605-f11b-4c68-8e77-e658a1aa045e.png`.
Art prompts: isolate the shallow warm ivory sandstone base / one small rounded
stepping stone / the large faceted five-point gold star, upper-left illumination,
transparent alpha, no lettering, no baked-in scenery. A second background-removal
pass removed the initial opaque checkerboard from the stone assets.
Sample prompts: fictional boy accepting an apple at home; cartoon tiger cub and
brown dog dad choosing a dinosaur shirt; cartoon tiger at a picnic with water.

Run from repo root:

```powershell
app/.venv/Scripts/python tools/preview_stone_map.py
```

Open the printed local URL. This serves the real app with temporary canonical
curriculum copy, temporary videos generated from the sample pictures, a temporary
preview user and read-only request handling. It never starts the production
server's scan or reads real accounts/config/media. Do not use the preview runner
for ordinary family sessions. The normal entry uses the logged-in family's own
media and real completion state. Performance covers use muted, non-playing video
first frames; demo covers use the existing authenticated thumbnail route. Media
loads near the viewport and is disposed on map rebuild. A cached performance
thumbnail endpoint remains a possible future optimization for very large libraries.
