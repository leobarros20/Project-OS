# Project-OS Viewer — reference implementation

A single self-contained `index.html` that renders a Project-OS project as the eight-layer map described in [`PROJECT_OS_VIEWS.md`](../PROJECT_OS_VIEWS.md) Part 8. **No build step, no server, no dependencies.**

## Open it

- **Quickest:** double-click `index.html`. It opens with an embedded demo project ("Acme Tasks") so you see it working immediately — no setup.
- **Load a real project:** click **Open project…** and pick your project's folder (the viewer reads its `docs/` tree), or drag the folder onto the window.

> **Why a folder picker?** Browsers can't auto-read local files from `file://` without a user gesture. The picker/drag-drop works everywhere. If you'd rather it auto-load, serve over HTTP from your project root (`python -m http.server`) and the same `index.html` still works.

## Use it in your own project

Per the OS spec, the viewer lives at `docs/viewer/index.html` in each project. Copy this file there:

~~~
cp viewer/index.html <your-project>/docs/viewer/index.html
~~~

Then open it and load your `docs/` folder. (Distribution tip: vendor it alongside the three spec files — see `CHANGELOG.md`.)

## What it does (v0.5.1) — six tabs

- **Map** — the layer bands, with **technical layers (L3–L6) shown by default**. A **Simplify** toggle collapses to intent layers (L0–L2) for non-technical readers.
- **Canvas** — the same graph as an IcePanel-style spatial view: swimlanes per layer, cards, bezier edges, pan/zoom, click-to-panel.
- **Structure** — `docs/structure.md` as a tree with status badges.
- **Screens** — `docs/screens.md` as a gallery (retired screens hidden in Current).
- **Constants** — `docs/constants.md` (L7) as editable, type-aware inputs: sliders for ranged numbers, color pickers, toggles; secrets masked. Edits queue as proposals; **Copy to AI** formats them as a JOURNAL-ready block for the AI to apply next session.
- **Ledger** — `docs/token-ledger.md` as stat cards + session table with a totals row, filterable by date range.

Across all tabs:

- **Current / History** — Current shows only active nodes; History reveals retired ones (deprecated / superseded / abandoned) muted, with `superseded by` lineage edges.
- **Drill-down** — click a container → its components → code with `file:line` references.
- **Side panel** — status, values/constraints, source files, *depends on* / *depended on by*, and a **blast radius** highlight.
- **Search** (`/`), **layer filters**, **pan/zoom**. Never writes to your files — constants edits queue as proposals for the AI, nothing is applied directly.

## Parser notes

The parser targets the artifact templates in `PROJECT_OS.md` Part 3 (predictable `###` headers and `**Field:**` lines). It's tolerant of small variations; the more consistent your headings, the cleaner the graph. Lifecycle status (active vs. retired) follows `PROJECT_OS.md` Part 6.

**Status:** v0.5.1 reference implementation. Verified against the embedded demo (37 nodes / 37 links / 12 constants / 3 ledger sessions) — all 12 acceptance tests in `PROJECT_OS_VIEWS.md` 8.9 pass: outcomes→features, container→component→code drill-down, Current/History, Structure, Screens, Canvas, editable Constants with proposal queue, and the date-filterable Ledger.
