# PROJECT_OS_VIEWS.md

**Status:** Working draft · 0.4.1
**Purpose:** How to render the project map as static diagrams and the interactive viewer. This file is the rendering contract that complements the artifact contract in `PROJECT_OS.md` and the runtime contract in `PROJECT_OS_BEHAVIOR.md`.

**Audience:** AI coding agents producing diagrams or building the viewer; humans reviewing what gets rendered.

**Reading order:** read `PROJECT_OS.md` and `PROJECT_OS_BEHAVIOR.md` first. Read this file when the task involves rendering, screen captures, or the viewer.

---

## Part 0 — What this file covers

1. **Per-layer rendering specifications** — what each of the seven layers must contain in any rendered view (format-agnostic).
2. **Edge label vocabulary** — the canonical labels used on edges across all diagrams.
3. **Color and shape conventions** — visual semantics that hold across renderings.
4. **Mermaid recipes** — copy-paste templates for the layers, since most AI agents produce Mermaid fluently.
5. **Master map specification** — the single image that shows the whole project.
6. **Screen capture cadence** — when to save a new screen capture vs. update the latest pointer.
7. **The interactive viewer spec** — the `docs/viewer/index.html` file every project gets.

What this file does NOT cover: which artifacts exist (see `PROJECT_OS.md`), how the AI maintains them (see `PROJECT_OS_BEHAVIOR.md`).

---

## Part 1 — Per-layer rendering specifications

For each layer, this section defines what the rendered view must contain. Format is open — Mermaid, SVG, HTML, or any other surface — but the **content rules** are fixed.

> **Depth principle — the technical layers are the most detailed.** Layers 3–6 must be rendered to the deepest resolution the project supports: system context → containers → components → files → function signatures. They are shown **by default** and are the deepest drill-down, never hidden behind an "advanced" toggle. A view that shows rich intent (L0–L2) but shallow structure (L3–L6) is incomplete — expand it before shipping it. The content requirements below are floors for the technical layers, not ceilings.

### Layer 0 — Outcomes

**Required content:**

- Each outcome as a node, labelled with its short name and status (`Confirmed`, `Inferred`, `Achieved`, `Abandoned`, `Superseded`)
- Values and constraints tagged on each outcome, rendered as small annotations on the node
- Edges down to features that serve it (`served by`)
- Edges to KPIs that measure it (`measured by`)

### Layer 1 — Contexts

**Required content:**

- Each context as a region (subgraph, group, or bounded shape)
- Inside each region: entities owned, folders that belong, features that live there
- Values and constraints specific to that context, as annotations
- Edges between contexts labelled with mechanism (`calls`, `observes`, `shares data with`, `events to`)

**Required: same-word ambiguity must be visualized.** If `Customer` exists in three contexts with different shapes, show three distinct shapes labelled `Customer (Sales)`, `Customer (Billing)`, `Customer (Support)`.

### Layer 2 — Flows

**Required content:** one diagram per flow. Sequence-style works best.

- Actors on lanes
- Steps as ordered messages between lanes
- Each step annotated with: context it lives in, screen it shows (if any), telemetry event it fires (if any)
- Branches as `alt` blocks

**Required: one flow per diagram.** If a flow has more than ~15 steps, split into sub-flows.

### Layer 3 — System context (C4 L1)

**Source:** `docs/architecture.md` (System context section).

**Required content:**

- The product as one box at the center
- External actors (humans) as labelled circles or person shapes
- External systems (services, OS APIs, third-party SDKs) as labelled boxes
- One short verb phrase per edge, plus the data that crosses it and in which direction
- Trust / data boundaries drawn explicitly (what is our code vs. external)

### Layer 4 — Containers (C4 L2)

**Source:** `docs/architecture.md` (Containers section).

**Required content:**

- Each container labelled: name, runtime type (Activity, Service, server process, scene, database, etc.), one-line purpose, tech stack, the context(s) it hosts, and the state it owns
- Edges showing which container starts / binds / calls / reads / writes which, labelled with the mechanism
- Application boundary clearly visible (boxes inside = your code, boxes outside = external)
- Every container rendered as its own node — never collapse two runtime units into one box to save space
- Retired containers (`Deprecated` / `Superseded`) omitted from the current view, shown in the history view

### Layer 5 — Components (C4 L3)

**Source:** `docs/components/NN-*.md`, one file per container.

**Forcing rule:** render a components view for **every** container with more than ~500 lines of code or more than ~5 files. This is mandatory, not best-effort — it is where most of the map's real detail lives. Only a genuinely single-file container may skip decomposition.

**Required content:**

- Components inside one container, grouped by responsibility
- Each labelled: name, one-line purpose, the context it belongs to, key file paths, and its public surface (the functions / classes other components call)
- Edges showing imports, calls, observation — each labelled per Part 4
- Telemetry events each component emits, as tags
- A drill-down affordance from each component to its code-level (L6) view

### Layer 6 — Code (C4 L4)

**Source:** rendered directly from source files — code is the strongest evidence (`PROJECT_OS.md` Part 5), so L6 is generated, never hand-written as prose that would drift. But it is generated **comprehensively and on every relevant change**, and the viewer surfaces it as the deepest drill-down, not an afterthought.

**Forcing rule:** render a code-level view for **every** component that carries business logic worth tracing. Pure-rendering or pure-glue components may be represented by their file alone.

**Required content:**

- Public functions with full signatures
- Key private functions that carry meaningful state
- Types / interfaces the component defines or depends on
- The direct call graph within the component
- Clickable `file:line` references for every node, for IDE / repo navigation

---

## Part 2 — When to split a diagram

- **≤ 8 nodes per diagram.** If a layer would render more than 8 primary nodes, split.
- **Split by context first.** If Layer 1 has 10 contexts, render an overview plus per-context detail views.
- **Split by flow second.** Layer 2 always renders one flow per diagram.
- **Split by container third.** Layer 5 always renders one container per diagram. Layer 6 always renders one component per diagram.
- **Never split Layer 0 (outcomes) or Layer 3 (system context).** These remain whole; if they grow too big, the project is doing too many things.
- **Never collapse technical detail to save space.** When L4/L5/L6 grow, split into more diagrams — never merge containers or components into a single summary node. The technical layers are allowed to be the largest part of the map.

---

## Part 3 — Master map specification

In addition to per-layer views, the project keeps **one master map** showing all seven layers stacked, with cross-cutting edges.

**File:** `docs/diagrams/master-map.md`

**Required content:**

- All seven layers labelled and ordered (0 → 6, top to bottom)
- Outcomes at the top; each connects down to features
- Features connect down to flows
- Flows cross contexts (edges between flow nodes and context regions)
- Contexts contain containers (Layer 4 boxes sit inside Layer 1 regions)
- Containers connect to external systems (Layer 3 entities at the margins)
- **Telemetry traceability overlay:** dotted edges from each outcome to the KPI(s) that measure it, with intermediate stops at the events that compute the KPI
- **Decision overlay:** ADRs shown as diamond nodes or labelled flags, with `constrains` edges to the layers they affect

This is the single image a stranger would want to see first. If a fresh AI agent can't produce a recognisable master map from the artifacts, the artifacts aren't complete.

---

## Part 4 — Edge label vocabulary

All diagrams use the same edge labels for the same relationships. The canonical vocabulary:

| Relationship | Label | Used between |
|---|---|---|
| Outcome served by feature | `served by` | L0 → features |
| Outcome measured by KPI | `measured by` | L0 → KPIs (telemetry) |
| Feature drives flow | `drives` | features → L2 |
| Flow crosses context | `crosses` | L2 → L1 |
| Context contains entity | `owns` | L1 → entities |
| Context realized by code | `realized by` | L1 → folder/module |
| Container runs in context | `runs in` | L4 → L1 |
| Container calls container | `calls` | L4 → L4 |
| Component imports component | `imports` | L5 → L5 |
| Component observes container | `observes` | L5 → L4 |
| Code emits event | `emits` | L6 → telemetry event |
| Event computes KPI | `computes` | telemetry event → KPI |
| Decision constrains thing | `constrains` | ADR → any layer |
| Value applies to outcome/context | `applies to` | value → L0 / L1 |

**No edge in any diagram should be unlabelled.** If an edge can't be labelled with one of these (or a clearly project-specific variant), the relationship is unclear and the diagram is wrong.

---

## Part 5 — Color and shape conventions

Format-agnostic, content-prescriptive.

**Colors encode meaning, not sequence:**

- Intent layers (L0, L1, L2) — one consistent color (suggest: purple)
- Structural layers (L3–L6) — one consistent color (suggest: teal)
- Features — amber accent
- Decisions — blue accent
- Telemetry — coral accent
- External systems — neutral gray
- Inferred (awaiting confirmation) — dashed border or muted color
- Retired (deprecated / superseded / abandoned) — muted and struck-through; hidden in the current view, shown only in the history view, where supersession is drawn as a `superseded by` edge to the replacement
- Values and constraints — small italic annotations, not full nodes

**Shapes:**

- Outcomes — rounded rectangles
- Contexts — bounded regions (subgraphs)
- Flows — sequence diagrams or timelines
- Containers, components — rectangles
- Code-level functions — small rounded rectangles
- External actors — person/circle shapes
- Decisions — diamond or labelled flag
- Telemetry events — small tags on edges

---

## Part 6 — Mermaid recipes

Most AI agents produce Mermaid easily. Below are canonical Mermaid templates for each layer. Adapt names to the project.

**Layer 0 — Outcomes:**

~~~mermaid
flowchart TB
  subgraph L0["Outcomes"]
    O1["Outcome A (Confirmed)<br/><i>value: feels fast</i>"]
    O2["Outcome B (Inferred)"]
  end
  O1 -->|served by| F1["Feature 1"]
  O1 -.->|measured by| K1["KPI: name (target X)"]
~~~

**Layer 1 — Contexts:**

~~~mermaid
flowchart LR
  subgraph CTX1["Context A"]
    E1["Entity X (shape in A)"]
    F1["folder/path/"]
  end
  subgraph CTX2["Context B"]
    E2["Entity X (shape in B)"]
  end
  CTX1 -->|events to| CTX2
~~~

**Layer 2 — Flows:**

~~~mermaid
sequenceDiagram
  participant User
  participant App
  participant Svc as Service
  participant Store
  User->>App: action
  App->>Svc: command
  Svc->>Store: read
  Svc-->>App: result (emits: event_name)
  App-->>User: rendered
~~~

**Layer 3 — System context:**

~~~mermaid
flowchart LR
  User((User))
  Product[["Product"]]
  Ext1[External Service]
  OS[OS APIs]
  User -->|uses| Product
  Product -->|sends events to| Ext1
  Product -->|reads from| OS
~~~

**Layer 4 — Containers:**

~~~mermaid
flowchart TB
  subgraph App["Application"]
    UI["UI host"]
    Svc1["Service A"]
    Store["Local storage"]
  end
  UI -->|starts| Svc1
  Svc1 -->|reads/writes| Store
~~~

**Layer 5 — Components:**

~~~mermaid
flowchart TB
  subgraph Container["ServiceName"]
    A["ComponentA"]
    B["ComponentB"]
  end
  A -->|observes| B
~~~

**Layer 6 — Code:**

~~~mermaid
classDiagram
  class FunctionA {
    +publicMethod()
    -privateState
  }
  class FunctionB
  FunctionA --> FunctionB : calls
~~~

**Master map:** combines all seven layers, with telemetry traceability as dotted edges from outcomes to KPIs and decisions as diamonds with `constrains` edges.

---

## Part 7 — Screen capture cadence

Three tiers of UI change:

- **Tier 1 — Trivial:** color tweak, copy rewording, padding adjustment, icon swap. No new capture. Update the existing latest capture in place only if the user requests.
- **Tier 2 — Meaningful:** layout restructured, new component added, empty state introduced, interaction behaviour changed, state visualisation added. Save a new capture `docs/screens/YYYY-MM-DD-screen-name.png`. Update the "Latest QA capture" pointer in `docs/screens.md`. Old captures remain as history.
- **Tier 3 — Milestone:** release submission, major feature ship, stakeholder demo. Save a tagged capture `docs/screens/YYYY-MM-DD-screen-name-v1.0.png`. The version tag marks it canonical for that release.

**Naming rules:**

- Same day, multiple captures of the same screen: `YYYY-MM-DD-screen-name.png`, `YYYY-MM-DD-screen-name-2.png`, etc.
- Animations or stateful transitions: use `.gif` or `.mp4`.
- Multi-state screens (form empty / filled / error / success): one capture per meaningful state, named `YYYY-MM-DD-form-empty.png`, etc.

**Who triggers captures:** the AI proposes captures only for screens it touched in this session — by tracking which UI files it edited. It does NOT propose captures for the entire app every session.

**Captures are append-only.** Never deleted. The folder becomes a visual diff of how each surface changed over time.

---

## Part 8 — The interactive viewer

Every project organized under this OS ships with an interactive viewer at `docs/viewer/index.html`. The viewer is part of the bootstrap, not optional. It is the human-facing surface of the project map: a single HTML file that reads the live `docs/` tree and renders the seven-layer map as a navigable graph.

### 8.0 — Why this exists

Static Mermaid diagrams are good for AI agents and developers who can read Markdown. They are not enough for designers, PMs, founders, or anyone who needs to *navigate* a project rather than read it linearly. The viewer turns the artifact set into an explorable map. It serves both audiences at once: non-technical readers navigate the intent layers, while builders drill the technical layers (L3–L6) down to components, files, and function signatures — those are the most detailed part of the map, not a hidden "advanced" mode.

It is also the seed of a future product. The viewer specified below is intentionally small enough that an AI agent can build a working v0 in a single session of 2–3 hours.

**How the Markdown files become a queryable structure.** The artifact MDs in `docs/` are structured-but-readable: every file has predictable section headers (`### Outcome 1`, `### Context 1`) and metadata fields (`Status:`, `Lives in context:`, `Linked features:`). The viewer parses these into an in-memory graph at load time — nodes and edges. No separate JSON index, no database, no build step. This works because:

- Markdown is the lingua franca for AI agents, which means the same source serves both humans reading and agents writing.
- Git diffs stay human-reviewable.
- If the viewer ever breaks, the data is still readable in any text editor.
- Adding a new field to a template means future files include it; no schema migration.

The trade-off is parser fragility — if the AI writes `### Outcome 1` one day and `### Outcome 1 — Notice...` the next, the parser must handle both. This is solvable with reasonable parser logic, and the inconsistency itself is a useful drift signal. When you eventually need cross-project querying (an index of every outcome across every project you've worked on), that's product territory, not OS territory. The OS keeps producing MD; an index can be built on top.

### 8.1 — What the viewer does

**Core capabilities (v0 must have all of these):**

1. **Renders the seven-layer map as a navigable graph** — Layer 0 at the top, Layer 6 at the bottom, with cross-cutting threads (features, decisions, telemetry, values) shown as overlays.
2. **Project structure view** — a dedicated panel rendering `docs/structure.md` as a navigable tree. Each folder shows status (Current / Reference / Legacy / Generated / Build artifact), purpose, owner, and touch policy. Orphans and archive candidates are flagged visually. This is the orientation surface for anyone arriving fresh.
3. **Click any node to expand its details** — description, dependencies, source files, captured values, related ADRs, related flows.
4. **"What depends on this?"** — given a selected node, highlight every node that imports, calls, references, or otherwise depends on it.
5. **"What does this depend on?"** — same direction, inverted.
6. **"If I break this, what's affected?"** — the blast radius view. Highlight the union of all nodes that would be affected if the selected node changed.
7. **Filter by layer, context, or feature** — toggle visibility for whole groups.
8. **Search by name** — find any node, file, or value across all artifacts.
9. **Read-only by default.** The viewer does not write to source files. Edit-in-viewer is a future direction (see 8.7).
10. **Current vs. history views.** The viewer defaults to the **Current** view, showing only active nodes (see `PROJECT_OS.md` Part 6). A **History** view (a header toggle that applies to every surface) reveals retired nodes — deprecated features, superseded decisions, abandoned outcomes, removed containers/screens — rendered muted, with supersession lineage (`superseded by` edges to whatever replaced each one). This is how you see "what the project used to look like" without retired cards cluttering the live map.
11. **Deepest drill-down on the technical layers.** Clicking a container expands its components; clicking a component expands its code-level view with `file:line` deep links. The technical layers (L3–L6) are the most detailed part of the viewer and are reachable by drilling, not buried.

**View depth — technical layers are shown by default:**

- The default view shows **all seven layers**, with the technical layers (L3–L6) expanded and drillable. They are the most detailed part of the map, not an opt-in.
- An optional **Simplify** toggle (off by default) collapses the map to the intent layers (L0–L2) for non-technical readers who want orientation without the structural detail. This is the inverse of the old "hide the technical view" default — technical detail is now first-class, and hiding it is the deliberate exception.
- Plain-language descriptions on every node, at every layer.
- Visual hierarchy by altitude: outcomes are the largest nodes, code the smallest — but smallest does not mean hidden; the code layer carries the most nodes and the most detail.

### 8.2 — What the viewer reads

The viewer is a pure read tool. It reads the live `docs/` tree on load:

- `docs/outcomes.md` — Layer 0 content
- `docs/contexts.md` — Layer 1 content
- `docs/flows.md` — Layer 2 content
- `docs/architecture.md` — Layers 3–4 content (system context, containers)
- `docs/components/*.md` — Layer 5 content (components per container)
- `docs/structure.md` — filesystem inventory; powers the Structure view
- `docs/features/*.md` — feature overlay
- `docs/decisions/*.md` — decision overlay
- `docs/screens.md` — screens metadata
- `docs/data-model.md` — entities (anchored to contexts)
- `docs/telemetry.md` — telemetry overlay
- `docs/permissions.md`, `docs/integrations.md` — Layer 3 metadata
- `docs/diagrams/*.md` — pre-rendered Mermaid for fallback rendering
- `PROJECT_SUMMARY.md`, `JOURNAL.md` — orientation data

The viewer parses the Markdown frontmatter and section headers to extract structured data. It does NOT need a pre-built JSON index — parsing happens at load time.

### 8.3 — What the viewer never does

- **Never writes to source files.** All editing happens through the AI's normal cadence.
- **Never makes network calls to AI services.** Pure read + render. No runtime AI inference.
- **Never assumes a build step.** Drop the HTML file in a browser; it works.
- **Never depends on a server.** File-protocol (`file://`) opening must work.
- **Never embeds large libraries.** CDN imports for Mermaid or similar are fine; no Webpack bundles, no Node modules.

### 8.4 — Tech constraints

- **Pure vanilla HTML, CSS, JavaScript.** No build step.
- **One file or, if necessary, a small fixed set of files in `docs/viewer/`.** Single entry point: `docs/viewer/index.html`.
- **External dependencies allowed only via CDN.** Mermaid is acceptable. Any graph library that can render via CDN script tag is acceptable. No `npm install`.
- **Markdown parsing in-browser.** A small CDN parser (e.g. `marked`) is acceptable. Frontmatter parsing can be hand-rolled.
- **No state persistence across page loads beyond `localStorage`** for filter/view preferences.

### 8.5 — Information architecture (default view)

When the viewer loads, the user sees:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Project name]                              [Current ▾] [Simplify]│
│  [Project summary one-liner]                                    │
├─────────────────────────────────────────────────────────────────┤
│  [ Map ] [ Structure ] [ Screens ]    Search ▢   Filter ▼      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      L0 — Outcomes (4 active)                                   │
│        ◉ Outcome 1  ◉ Outcome 2  ◉ Outcome 3  ◉ Outcome 4       │
│              ↓                                                  │
│      L1 — Contexts (7 active)                                   │
│        [Context regions, with entities and folders inside]      │
│              ↓                                                  │
│      L2 — Flows (5 named)                                       │
│        Flow A → Flow B → Flow C ...                             │
│                                                                 │
│      ▾ L3–L6 technical layers (shown)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Two header controls sit above every surface:

- **Current / History** — `Current` (default) shows only active nodes, so the map always reflects the project as it stands today. `History` adds the retired nodes (deprecated, superseded, abandoned, removed) muted, with `superseded by` edges to their replacements — the "older versions" view.
- **Simplify** — off by default. When on, it collapses the map to the intent layers (L0–L2) for non-technical readers. Off (the default), all seven layers show, with the technical layers expanded and drillable.

The top tab strip switches between the primary surfaces (both header controls apply to all three):

- **Map** (default) — the seven-layer graph described above, technical layers shown by default
- **Structure** — `docs/structure.md` rendered as an interactive tree of the project's folders, with status badges, owner tags, and touch-policy notes. Clicking a folder reveals its purpose and what relates to it in the Map view.
- **Screens** — `docs/screens.md` rendered as a gallery of the latest QA captures, with filters by context and flow.

Clicking a node (on any surface) opens a side panel with:

- The node's name and status (active or retired; if retired, what superseded it and when)
- Plain-language description
- Tagged values and constraints (for outcomes and contexts)
- For technical nodes: runtime type / tech stack (containers), public surface (components), source files and function signatures with `file:line` deep links (code)
- Related nodes — "depends on" and "depended on by"
- A "blast radius" button — highlights everything affected if this node changes
- Direct links to the underlying Markdown file (or source file) in the repo

### 8.6 — Interaction primitives

The viewer must support:

- **Click:** select a node, open side panel.
- **Click to expand (technical layers):** clicking a container reveals its components; clicking a component reveals its code-level view with `file:line` links.
- **Shift-click:** add to selection (multi-select for comparison).
- **Hover:** preview node name and one-line description in a tooltip.
- **Double-click:** zoom to fit the selected node and its immediate neighbours.
- **Current / History toggle:** switch between the live project and the older-versions view.
- **Simplify toggle:** collapse to the intent layers for non-technical readers.
- **Keyboard `/`:** focus search.
- **Keyboard `Esc`:** clear selection.
- **Filter toggles:** show/hide layers, contexts, features individually.

Pan and zoom on the graph itself are mandatory. The `all-layers.html` example produced for Linger is a reasonable reference.

### 8.7 — Future directions (not in v0)

These are explicitly out of scope for the v0 viewer but worth keeping in mind so v0 doesn't paint into a corner:

- **Edit-in-viewer.** Editing values like animation speeds or feature scope from the viewer, routed through the AI's normal cadence (the viewer queues changes; the AI processes them in the next session). v0 is read-only.
- **Live code-value surfacing.** Surfacing constants extracted from code (animation durations, color tokens, magic numbers). v0 surfaces only what's already in the artifacts.
- **Comments and annotations.** Multiple users leaving notes on nodes. v0 is single-user, no comments.
- **Diff view.** Comparing the current state of the map to a previous git revision. v0 shows current state only.
- **AI-driven explanation.** A "explain this node to me" button that calls an AI. v0 has no AI runtime calls.
- **Real-time collaboration.** Multiple viewers on the same project. v0 is single-session.

### 8.8 — Building v0 — what an agent should do

When an agent is asked to scaffold the viewer (as part of bootstrap, or on request):

1. Create the folder `docs/viewer/`.
2. Create `docs/viewer/index.html` as a single self-contained file.
3. Include CDN imports for the Markdown parser and (optionally) a graph library.
4. Implement, in order:
   - Load and parse all relevant Markdown files from `docs/` — including `docs/architecture.md` and every `docs/components/*.md`.
   - Build an in-memory graph: nodes = outcomes / contexts / flows / containers / components / functions / features / decisions; edges = the canonical vocabulary from Part 4 of this file. Tag every node with its lifecycle status (active or retired, per `PROJECT_OS.md` Part 6).
   - Render the seven-layer Map view with **technical layers shown by default** and expanded to component/code depth. The `Simplify` toggle (off by default) is what hides L3–L6, not the reverse.
   - Implement the **Current / History** toggle: Current hides retired nodes; History shows them muted with `superseded by` edges.
   - Implement technical drill-down: container → components → code-level view with `file:line` links.
   - Render the Structure view from `docs/structure.md` — a tree with status badges, clickable folders that surface purpose/owner/touch-policy.
   - Render the Screens view from `docs/screens.md` — a simple gallery of latest captures.
   - Add a top tab strip switching between Map / Structure / Screens, plus the Current/History and Simplify header controls (they apply to all surfaces).
   - Add click handlers that open a side panel with the node's details (works on any surface), including signatures and `file:line` links for technical nodes.
   - Add the "depends on" and "blast radius" computations.
   - Add filter toggles and search.
5. Test by opening `docs/viewer/index.html` directly from the file system. It must work without a server.
6. Verify that the viewer reflects the current state of `docs/` — making a small edit to `docs/outcomes.md` and reloading the viewer should show the change.

A working v0 should stay compact (**~1500–2000 lines** of HTML + CSS + inline JavaScript). The Linger `all-layers.html` reference is a good starting point but does less than this spec asks for — particularly the technical drill-down, the Current/History split, the dependency views, blast radius, and side panel details. Use it as inspiration, not as a target.

### 8.9 — Test for the viewer

The viewer is working if a non-coder can:

1. Open the HTML file in a browser.
2. Without any guidance, identify the project's outcomes.
3. Switch to the Structure tab and tell which folders are current, which are legacy, and which are reference material — without opening any of those folders.
4. Click an outcome and see the features that serve it.
5. Click a feature and see which flow it drives and which screens it touches.
6. Find the answer to "if I change feature X, what else is affected?" without reading any source code.

And if a builder can:

7. See the technical layers (L3–L6) on load, without enabling any toggle.
8. Drill from a container to its components to a specific function signature, reaching a `file:line` link to the source — without leaving the viewer.
9. Toggle to **History** and find a deprecated feature or superseded decision that is hidden in the **Current** view, with a visible pointer to whatever replaced it.

If a non-coder fails 1–6, or a builder fails 7–9, the viewer needs work.

---

## Part 9 — What this file does not include

- **The artifact set and templates.** See `PROJECT_OS.md`.
- **How the AI behaves during sessions.** See `PROJECT_OS_BEHAVIOR.md`.
- **Sprint plans, roadmaps, OKRs.** Not the OS's job.
