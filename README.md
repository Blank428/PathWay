# Pathway (rebuild)

Patient guides for Interventional Radiology procedures, built around the printed 3D models.
Roadmap: the "Pathway redesign roadmap" doc.

## Run it
    npm install
    npm run dev          # local site at http://localhost:4321
    npm run build        # static site in dist/

## Where things live
- `src/content/procedures/ufe.json`: everything a patient reads for UFE (chapters, risks, recovery, options, questions, glossary, sources, review status)
- `src/content/procedures/ufe-model.json`: model part list and the catheter route
- `src/content/site.json`: site name, team, upcoming guides
- `public/models/ufe-v2.glb`: the web model, compressed (about 1.8 MB)
- `tools/model-pipeline/`: turns the v2 print assembly into the web model (`npm run model`, needs Python with numpy, trimesh, fast_simplification)

## Pages
- `index.html` home, `ufe.html` the guide (chapter via `#chapter-id`), `ufe/your-visit.html`, `ufe/as-text.html`, `clinicians.html`, `about.html`
- Chapter camera views, labels, explode offsets and risk markers: `src/content/procedures/ufe-views.ts`

## Preview as a Claude artifact
    npm run build && python3 tools/preview/make_preview.py
Makes `preview/` with relative paths (artifacts serve from a sub-path and don't serve .glb, so the model ships as `ufe-v2-glb.wasm` there only).

## Poster images
`public/stills/` are rendered from the live viewer (`?still` hides the overlays, `?mode=printed` shows the print colours).

## Status (2026-09-26)
- Rebuilt as a hub (Sep 26, 11:30): home with two front doors, patient guides, model library, P-001 project page with photo slots and parts list, maker-lab design, printed colours only. axe-core: 0 WCAG 2.2 AA issues on all 9 pages, light and dark.
- Waiting on: Jodh's design sign-off, the open decisions in the roadmap doc, Dr. Kotha's clinical review.
