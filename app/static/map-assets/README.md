# Map delivery assets

Generated WebP files for the shared Web / Electron map. Original PNG artwork remains in `../worlds-map/` and `../stone-map/`.

- Chapter scenes keep their native resolution: 1536×1024 desktop and 1024×1536 portrait.
- Pedestals, stepping stones, and stars are exported at up to three times their display size. The repeating terrain is 512×512.
- Quality 92 WebP keeps transparency; filenames include the file's SHA-256 prefix. The server allows long caching only for these content-addressed files.
- `../map-assets.mjs` supplies URLs to the renderer; `../map-assets.css` supplies CSS background URLs. Geometry and shadows are unchanged.

Regenerate from the repository root using the existing Pillow dependency:

```powershell
.\app\.venv\Scripts\python.exe tools/optimize_map_assets.py
```

This is an artwork maintenance command. Starting or deploying the application does not require a build step. Deploy the generated files and both URL manifests together; keep older hashed assets available while clients finish existing sessions.
