# Project-OS Viewer — reference implementation

A single self-contained `index.html` that renders a Project-OS project as the seven-layer map described in [`PROJECT_OS_VIEWS.md`](../PROJECT_OS_VIEWS.md) Part 8. **No build step, no server, no dependencies.**

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

## What it does (v0)

- **Map** — the seven layers, with **technical layers (L3–L6) shown by default**. A **Simplify** toggle collapses to intent layers (L0–L2) for non-technical readers.
- **Current / History** — Current shows only active nodes; History reveals retired ones (deprecated / superseded / abandoned) muted, with `superseded by` lineage edges.
- **Drill-down** — click a container → its components → code with `file:line` references.
- **Structure** — `docs/structure.md` as a tree with status badges.
- **Screens** — `docs/screens.md` as a gallery (retired screens hidden in Current).
- **Side panel** — status, values/constraints, source files, *depends on* / *depended on by*, and a **blast radius** highlight.
- **Search** (`/`), **layer filters**, **pan/zoom**. Read-only; never writes to your files.

## Parser notes

The parser targets the artifact templates in `PROJECT_OS.md` Part 3 (predictable `###` headers and `**Field:**` lines). It's tolerant of small variations; the more consistent your headings, the cleaner the graph. Lifecycle status (active vs. retired) follows `PROJECT_OS.md` Part 6.

**Status:** v0 reference implementation. Verified against the embedded demo (37 nodes / 37 links) — outcomes→features, container→component→code drill-down, Current/History, Structure, and Screens all working.
