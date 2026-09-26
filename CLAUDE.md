# Pathway: context for Claude Code

Read this first. It sums up a long design session so you don't repeat work that was already rejected.

## What this is

Pathway is a hub for 3D printed teaching models of Interventional Radiology (IR) procedures at Victoria General Hospital (Island Health), plus the patient guides that go with them. The idea is that a doctor hands a patient the printed model in clinic, and the patient goes over the same model at home on this site.

- **Koah Barstead** owns the front end and the printing. You're working with him. He is the design lead and has final say on design. No one else signs off.
- **Jodh Gill** is project lead and owns the hospital relationship. He built the first site.
- **Dr. Kotha** is Medical Lead, IR, and the clinical sponsor. Always write "Dr. Kotha". No other form of the name.
- **Lia McCulloch** is credited on the team list. Leave her credit as is.

The long-term goal is one place for every procedure's model, prints and guide, added one at a time. UFE (uterine fibroid embolization) is the only real one so far (project P-001). This is also going in Koah's web design portfolio, so the bar is professional work, not "good enough".

## Working with Koah

- Scope before coding. For any real change of direction, ask the questions that matter first, then build.
- Be blunt. If something he asks for is a bad idea, say so and why, then let him decide.
- Show, don't describe. Run the dev server and have him look at the live page in his browser.
- Site copy: plain language, short sentences, Canadian spelling, no em dashes anywhere.

## Hard rules

- **Jodh's original site** (pathway-ir.netlify.app) stays up and untouched. Deploy this rebuild somewhere separate.
- **Nothing goes public** with the hospital's name or Dr. Kotha's name until the hospital approves. Keep `noindex` on. Share preview links privately.
- **Printed colours only.** The site shows one model, in the actual filament colours. There used to be a "realistic anatomy" colour mode. It was removed because two looks read as two different models.
- **Colour meanings are fixed:**

  | Colour | Means |
  | --- | --- |
  | White | Uterus |
  | Red | Arteries |
  | Purple | Fibroids |
  | Pink | Ovaries and tubes |
  | Orange | Risk (and nothing else) |
  | Blue | Display base; also the interface accent |

- **Accessibility bar:** WCAG 2.2 AA with 0 axe-core violations in light and dark. Patient copy at about a grade 6 reading level (the AMA and NIH recommendation). Respect reduced motion.
- **Speed budget:** web model under 3 MB compressed. Text readable before the 3D loads.
- **Clinical content** is a draft until Dr. Kotha reviews it. `ufe.json` has `review` and `claimsNeedingSource`. Don't invent medical facts or statistics.

## Stack and commands

- Astro 7 (static output, `build.format: 'file'`).
- React 19 island for the guide.
- three.js via React Three Fiber and drei.
- Plain CSS with tokens. No UI kit.
- Every link is relative (`src/lib/paths.ts`), so the build runs from any folder or host.

```
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/
npm run model      # rebuild the web model from the print assembly (needs Python: numpy, trimesh, fast_simplification)
```

`tools/preview/make_preview.py` only packages `dist/` as a claude.ai artifact preview. You don't need it locally.

## Where things live

| Path | What |
| --- | --- |
| `src/content/site.json` | Site name, hospital, team, upcoming procedures |
| `src/content/projects.json` | Library: P-001 specs, 23-part list, photo slots and shot list, planned P-002 to P-009 |
| `src/content/procedures/ufe.json` | All patient copy: 9 chapters, keys, risks, Your visit sections, quiz, questions, glossary, sources, review status |
| `src/content/procedures/ufe-views.ts` | What the 3D model does per chapter: camera, visible parts, see-through parts, highlight, explode, catheter progress, particles, six-month swap, risk markers A to E. `STILL_VIEWS` holds render-only views. |
| `src/content/procedures/ufe-model.json` | Generated: part centres and label anchors, catheter route |
| `src/components/guide/GuidePlayer.tsx` | The chapter player. Back and Next are the only way to move through it, plus Play and the chapter menu. Scrolling never drives the model. Chapter is in the URL hash (`ufe.html#take-it-apart`). |
| `src/components/guide/Stage.tsx` | R3F scene: materials, explode, fades, catheter tube, particles, camera tween, label projection |
| `src/styles/global.css`, `pages.css`, `components/guide/guide.css` | Design tokens and styles, light and dark |
| `src/pages/` | `index`, `guides`, `library`, `projects/ufe`, `ufe` (guide), `ufe/your-visit`, `ufe/as-text`, `clinicians`, `about` |
| `public/models/ufe-v2.glb` | Web model: 23 named parts, about 457k triangles, about 1.9 MB with meshopt compression |
| `public/stills/` | Poster and hero renders (see Renders below) |
| `tools/model-pipeline/` | `export_v2.py` plus `source/ufe_v2_assembly.npz`, the same assembly the print plates come from |

## The model

The v2 print is 23 parts that peg together with no glue:

- Uterus body, cut open
- Artery tree with an open catheter groove
- Uterine artery arc plus two posts
- Ovarian arteries
- Groin access port
- 2 tubes and 2 ovaries
- 4 fibroids, plus a 79% "six months later" set of 4
- Risk discs A, B and C
- Display base

The web model is exported from the same files, so screen and print match part for part.

Details:

- **Frame:** 1 unit = 60 mm, y up toward the fundus, z toward the viewer.
- **Risk markers:** A, B and C are the printed discs (pain and fever, fibroid passing, periods stopping early). D (groin entry) and E (artery injury) are on screen only, drawn with a dashed outline, until those discs are printed.
- **Print facts shown on the site:** 8 plates, 14 h 6 min, about 300 g PLA, 0.16 mm layers, Bambu Lab A1, 196 x 246 mm footprint.

## Design history (don't repeat these)

1. **Jodh's original:** read as AI-generated.
   - Tiny caps labels over every heading.
   - A serif headline with an italic accent word.
   - Numbered 01/02/03 cards and initials avatars.
   - A grid of "Coming soon" cards.
   - Four competing ways to move through the guide, and a viewer that covered text and fell out of sync.
2. **v1 rebuild** (one UFE guide with a few pages around it):
   - Rejected as the wrong thing. Koah wants a **hub** for all procedures over time, not one guide.
   - It showed two colour looks, which read as two models.
   - Too basic.
3. **v2 "maker lab"** (drawing-sheet title blocks, heavy black borders, stretched all-caps headlines, drafting grid): rejected as **blocky and chunky**.
4. **Current:** smooth and soft.
   - Hairline dividers, white cards with soft shadows.
   - Sentence-case Archivo at normal width, Atkinson Hyperlegible Next for body text.
   - Pill-shaped controls.
   - Cross-page view transitions.
   - Koah's verdict: better, but **"still a long ways off"**.

5. **v5 "calm studio"** (Sep 26, **rejected** as "basic AI slop"): the goal was polish and warmth from Neko Health and Oura, teaching style from Ciechanowski's explainers, restraint from Apple product pages, trust from the NHS and library structure from NIH 3D. What actually got built was v4 reskinned: the same rounded white cards, pill buttons and soft shadows, with warmer colours and a new font. None of the reference sites look like that. Koah called out the two rounded image cards for the front doors in particular as generic. It was also built as a full slice without showing him any direction first.
   - Lesson: the references were never actually looked at (the cloud container blocked them), and the layout fell back on stock patterns. Don't reskin v4. Don't use rounded card grids for the doors.
   - Still undecided: whether the live 3D hero and the colour legend (below) stay. Ask Koah.
   - Below is what v5 contained. The code is on branch `claude/wizardly-dijkstra-oto0es`, not on `main`.
   - Warm bone neutrals, Instrument Sans headings (Geist and Hanken Grotesk on trial via `?font=geist` / `?font=hanken`), Atkinson Hyperlegible Next body. All fonts self-hosted through `@fontsource-variable`.
   - Home: live 3D model is the hero (slow sway, drag to turn, no scroll zoom). "Every colour means one thing" legend lights up those parts and ghosts the rest.
   - Soft studio lighting (drei `Environment` lightformers plus a contact shadow) so renders read as a photographed object, not CAD.
   - Header is clear at the top of a page and frosts on scroll. No numbered cards, no caps labels, no boxed hero.
   - Guide: same player, lighter type, chapter text settles in on each change, "Up next" line above the nav.
   - Scope: home and guide first. The other 7 pages only inherit the tokens until Koah signs off on the look.

**What's still missing, in Koah's words:** smooth, clean, professional, and "everything should flow exactly how your brain thinks it should."

**Process rule after v5:** no more building the real site on a guessed direction. First make 3 home page mockups that are really different from each other (for example an exhibition or museum object page, an immersive full-screen model, and a reading-first explainer). Look at the actual reference sites while making them. Koah picks one, or picks parts to take from each. Then build.

**Preview rule:** only show Koah something that runs exactly as tested. Locally, that's the dev server in his own browser. A Claude artifact preview of the multi-page build broke navigation (the guide wouldn't open and Back didn't work), so don't use one for this site.

Direction is now set (item 5). Roll it out to the other pages only after Koah approves the home and guide slice.

## Structure Koah chose

- **Two front doors** on the home page:
  - Patients go to Guides.
  - Clinicians and the hospital go to the Library.
- **Each procedure page holds** the interactive guide and photos of the real print. He did not pick print downloads or a status timeline for now.
- **Photos:** Koah will shoot them. The P-001 page has 6 slots, and the shot list is in `projects.json`. Real photos are the biggest single upgrade available, because the renders still look like CAD.

## Renders

Posters and hero images come from the live viewer:

- `ufe.html?still#chapter` hides the overlays.
- `?view=hero` or `?view=exploded` uses `STILL_VIEWS`.

Render with a transparent background (hide the header and panel, make `.guide-stage` a fixed size, screenshot with `omitBackground`) and save as WebP with alpha to `public/stills/`, so one image works on the light and dark studio backdrops. Guide posters are 1180 x 1000, the home hero is 1400 x 1204 with `?view=home`, door images are 1600 x 900. Re-render after any model or lighting change.

## Checks before calling anything done

- Screenshots at 390, 768 and 1440 px, in light and dark.
- axe-core on every page: 0 violations.
- Click through:
  - Chapter menu, Next and Back
  - A risk marker
  - The quiz
  - The questions checklist and its Copy button
- No horizontal scroll at 390 px. An earlier build had a 400 px header overflow on phones.

## Open items

- [x] Design direction chosen (v5 calm studio).
- [ ] Koah reviews the home and guide slice, picks a heading font, then roll out to the other 7 pages.
- [ ] Real photos into the 6 slots.
- [ ] Print discs D and E so print and screen match 5 for 5 (recommended).
- [ ] Each statistic tied to one of the 6 listed sources, then Dr. Kotha's review with a date shown.
- [ ] Credits: Jodh's line still says he built the site. His call.
- [ ] Analytics: none so far. Decide with Jodh before adding any.
- [ ] Trim the 3D bundle (about 1 MB before gzip), mostly drei.
- [ ] Soften the printed joints and fix the shading streaks on the uterus cut face.
- [ ] QR codes per chapter once there's a final address.
- [ ] The "Dr. Kotha explains UFE" video slot is hidden until a recording exists.
