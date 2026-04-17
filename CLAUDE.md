# Tegne

## Meta File Maintenance

**Always keep meta files up to date.** After any change to features, architecture, behaviour, or project scope, update the relevant files before finishing:

- `CLAUDE.md` — project purpose, structure, definition of done
- `requirements.md` — feature requirements and scope
- `.claude/rules/*.md` — implementation rules (architecture, rendering, UI, etc.)
- `README.md` — public-facing documentation

Do not leave meta files describing a state that no longer matches the code.

---

## Purpose

A browser-based structural/visual modelling tool. The user writes a model in a plain-text DSL; the tool renders it as an interactive SVG. No simulation.

Tegne supports multiple diagram types, selected via `@type` at the top of the DSL file:

| `@type` | Diagram | Status |
|---|---|---|
| `sd` | Forrester Stock-and-Flow (System Dynamics) | Implemented |
| `id` | Integration Diagram (IT Architecture) | Implemented |
| `infoflow` | Information Flow Diagram (Data Landscape) | Implemented |
| `tm` | Threat Model (STRIDE) | Implemented |
| *(absent)* | Defaults to `sd` | — |

**What to build:** see [`requirements.md`](requirements.md)
**How to build it:** see [`.claude/rules/`](.claude/rules/)

---

## Implementation Rules

| File | Covers |
|---|---|
| `code-style.md` | TypeScript rules, Vite, do-not-do list |
| `architecture.md` | File structure, data model, parser, layout, drag |
| `svg-rendering.md` | D3, Forrester symbol specifications, theme system |
| `ui-layout.md` | Two-column layout, zoom/pan, open/save/export, error panel |
| `testing.md` | Fixtures, acceptance criteria |
| `dependencies.md` | Pinned dependency list, what not to add |
| `integration-diagram.md` | ID element specs, platform colours, DSL syntax, arrow rules |
| `infoflow-diagram.md` | IFF store/link specs, roles, relationships, groups |
| `threat-model.md` | TM ref/boundary/flow/threat/mitigate specs, STRIDE |

**Read all rule files and `requirements.md` before writing any code.**

---

## File Structure

```
tegne/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md
├── requirements.md
├── src/
│   ├── main.ts         # Entry point — wires editor, routes by @type
│   ├── types.ts        # Shared types + re-exports from sub-modules
│   ├── parser.ts       # DSL entry point — pre-scans @type, dispatches
│   ├── themes.ts       # Colour themes (dark, light, tokyo) — SD + ID + IFF + TM slots
│   ├── export.ts       # SVG export, .sd save, .id save, .iff save, .tm save
│   ├── env.d.ts        # Type declarations for File System Access API
│   ├── sd/             # Forrester Stock-and-Flow
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── layout.ts
│   │   ├── renderer.ts
│   │   └── drag.ts
│   ├── id/             # Integration Diagram
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── layout.ts
│   │   ├── renderer.ts
│   │   └── shapes.ts
│   ├── iff/            # Information Flow Diagram
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── layout.ts
│   │   ├── renderer.ts
│   │   └── shapes.ts
│   ├── tm/             # Threat Model
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── layout.ts
│   │   └── renderer.ts
│   └── project/        # Cross-diagram registry and project loader
│       ├── types.ts
│       ├── manifest-parser.ts
│       ├── registry.ts
│       └── loader.ts
└── fixtures/
    ├── population.sd              # SD: simple model — all five element types
    ├── factory_dynamics.sd        # SD: Forrester production-distribution chain (bullwhip effect)
    ├── integration_example.id     # ID: minimal — no metadata overrides, all defaults
    ├── e-commerce-platform.id     # ID: full — all metadata, platforms, states, groups, placement overrides
    ├── customer_information.iff   # IFF: customer data landscape — all 7 roles, 2 groups
    └── threat_model_example.tm    # TM: e-commerce threat model — all STRIDE categories; @ref e-commerce-platform.id
```

---

## Core Data Model

```typescript
type Polarity      = '+' | '-';
type CloudRole     = 'source' | 'sink';
type FlowStrength  = 'weak' | 'medium' | 'strong';

interface ModelMeta {
  name?:        string;
  version?:     string;
  date:         string;   // ISO date; auto-filled if @date absent
  author?:      string;
  theme?:       string;   // theme name (dark | light | tokyo); default: dark
  orientation?: 'landscape' | 'portrait';
  size?:        'a4' | 'a3' | 'a2' | 'a1' | 'a0';  // paper size; default: a4
}

interface Position  { x: number; y: number; }
interface Stock     extends Position { kind: 'stock'; id: string; label: string; }
interface Cloud     extends Position { kind: 'cloud'; id: string; label: string; role: CloudRole; }
interface Auxiliary extends Position { kind: 'aux';   id: string; label: string; }

interface Flow {
  kind: 'flow'; id: string;
  from: string; to: string; label: string;
  polarity: Polarity; strength: FlowStrength;
}

interface Connector {
  kind: 'connector'; id: string;
  from: string; to: string; polarity: Polarity;
}

type Node = Stock | Cloud | Auxiliary;

interface SDModel {
  meta:           ModelMeta;
  stocks:         Stock[];
  clouds:         Cloud[];
  auxiliaries:    Auxiliary[];
  flows:          Flow[];
  connectors:     Connector[];
  savedPositions: Record<string, Position>;
}
```

Do **not** add fields to these interfaces without updating `types.ts` first.

> **Other diagram models:** See `src/id/types.ts` (IDModel), `src/iff/types.ts` (IFFModel), `src/tm/types.ts` (TMModel).

---

## Definition of Done

### v1
- [x] Project scaffolded with Vite + TypeScript
- [x] `types.ts` implements the canonical `SDModel` interface
- [x] `parser.ts` parses all DSL element types; returns errors with line numbers
- [x] `layout.ts` applies the heuristic initial placement
- [x] `renderer.ts` renders all five Forrester element types correctly via D3
- [x] `drag.ts` makes all elements draggable; connectors redraw on drag
- [x] `export.ts` produces a valid standalone SVG file
- [x] All three fixtures parse and render correctly
- [x] Error panel shows parse errors without clearing the current diagram

### Post-v1
- [x] Flow strength (`weak` / `medium` / `strong`) — pipe style varies by strength
- [x] Metadata box — bottom-left canvas annotation (name, version, date, author)
- [x] File Open / Save — `.sd` files with `@position` directives preserve layout
- [x] Save As — uses File System Access API for native directory/filename dialog (SVG export too)
- [x] `@theme` directive — selects colour theme (`dark`, `light`, `tokyo`)
- [x] `themes.ts` — all colours defined per theme; no hardcoded colour values in renderer
- [x] `@orientation` directive — controls page orientation (landscape default / portrait)
- [x] `@size` directive — selects paper size (`a4` default, `a3`, `a2`, `a1`, `a0`)
- [x] Canvas = page — viewport is sized to the page; no dead space outside
- [x] Zoom controls — `+` / `−` / `⊡` buttons at ×1.10 per step; label shows current %
- [x] Scroll to pan — mouse wheel and trackpad pan the canvas in both axes

### Integration Diagram (`@type id`)
- [x] `@type` directive — parser reads type first; defaults to `sd` if absent
- [x] Element types: `system`, `database`, `queue`
- [x] Platform colours: `[aws]`, `[azure]`, `[on-prem]`, `[gcp]`, `[oracle]`
- [x] Element states: default (current), `[new]`, `[changing]`, `[decommissioned]`
- [x] Label placement: inside for `system`, below for `database` and `queue`; override with `[placement:inside]` / `[placement:below]`
- [x] Connections: `connect A -> B : protocol`, `connect A <-> B : protocol`
- [x] Arrow styles: closed arrowhead for all connections; open arrowhead when either endpoint is a `queue`
- [x] Full theme support — all three themes; tokyo renders neon with SVG glow filter
- [x] `@theme` directive supported in ID diagrams
- [x] Drag support — elements draggable; connections redraw on move
- [x] Groupings — `group <id> <label> [corner:*]` / `end` blocks; named boundary rect; draggable as a unit
- [x] `changing` state — dashed border + 50% fill-opacity (platform colour unchanged, rendered semi-transparent)
- [x] Legend box — upper-right canvas annotation; shows only platform/state combinations in use; draggable; position persisted as `@position __legend__`

### Information Flow Diagram (`@type infoflow`)
- [x] `store <id> [<role>]` — data store node; 7 roles: `master`, `replica`, `derived`, `aggregate`, `golden`, `reference`, `consumer`
- [x] Role fill colours — one colour per role, all three themes
- [x] Role badge — italic role name rendered below each store node
- [x] `link <from> -> <to> : <relationship>` — directional data flow; 8 relationships: `replicate`, `publish`, `ingest`, `derive`, `aggregate`, `enrich`, `merge`, `serve`
- [x] Element states: default (current), `[new]`, `[changing]`, `[decommissioned]` — reflected in border style
- [x] Label override: `[label:"Human Readable Name"]`
- [x] Full theme support — dark, light, tokyo (neon + glow)
- [x] Drag support — stores draggable; links redraw on move
- [x] Groupings — `group <id> <label> [corner:*]` / `end` blocks; draggable as a unit
- [x] Save as `.iff` file with `@position` directives
- [x] Fixture: `fixtures/customer_information.iff`

### Threat Model (`@type tm`)
- [x] `@ref <filename>` — declares referenced diagram files
- [x] `boundary <id> [label:"..."]` / `end` — trust boundary blocks
- [x] `ref <id>` — ghost element inside or outside a boundary
- [x] `flow <id> <from> -> <to> [label:"..."]` — directed data flow between refs
- [x] `threat <id> [stride:S|T|R|I|D|E] <targetId> : "desc"` — STRIDE threat annotation
- [x] `mitigate <threatId> : "desc"` — mitigation for a declared threat
- [x] Ghost ref rendering — dashed border, reduced opacity, source-type badge from registry
- [x] STRIDE badge rendering — coloured circles on target; mitigated threats at 35% opacity
- [x] STRIDE key box — draggable legend showing used categories; persisted as `@position __stride_key__`
- [x] Mitigations panel — draggable box listing all mitigations; persisted as `@position __mitigations__`
- [x] Full theme support — dark, light, tokyo
- [x] Drag support — refs draggable; flows and boundaries update on move
- [x] Save as `.tm` file with `@position` directives
- [x] Fixture: `fixtures/threat_model_example.tm`

### Cross-diagram features
- [x] `@show-ids on|off` — optional [id] badge overlay on every element (all diagram types)
- [x] `src/project/` — cross-diagram ID registry (`buildRegistry`, `emptyRegistry`), project manifest parser, directory loader

### UI
- [x] Help panel — floating, draggable, non-blocking; shows DSL syntax for `id`, `infoflow`, `tm` diagram types, and `@show-ids`

---

## Build and Run

```bash
npm install
npm run dev      # development server with hot reload
npm run build    # production build → dist/
```
