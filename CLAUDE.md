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
| `id` | Integration Diagram (IT Architecture) | Planned |
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
│   ├── main.ts        # Entry point — wires editor, parser, layout, renderer
│   ├── types.ts       # All model interfaces and type definitions
│   ├── parser.ts      # DSL string → SDModel
│   ├── layout.ts      # SDModel → initial x,y positions (heuristic)
│   ├── renderer.ts    # SDModel + positions → SVG elements via D3
│   ├── drag.ts        # D3 drag behaviour + connector redraw on move
│   ├── export.ts      # SVG export and .sd file save
│   ├── themes.ts      # Colour theme definitions (dark, light, tokyo)
│   └── env.d.ts       # Type declarations for File System Access API
└── fixtures/
    ├── population.sd       # Simple population model — all five element types
    └── factory_dynamics.sd # Forrester production-distribution chain (bullwhip effect)
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
- [x] `@orientation` directive — controls A4 page size (landscape default / portrait)
- [x] Canvas = A4 page — viewport is sized to the page; no dead space outside
- [x] Zoom controls — `+` / `−` / `⊡` buttons at ×1.10 per step; label shows current %
- [x] Scroll to pan — mouse wheel and trackpad pan the canvas in both axes

### Integration Diagram (`@type id`) — planned, not yet implemented
- [ ] `@type` directive — parser reads type first; defaults to `sd` if absent
- [ ] Element types: `system`, `database`, `queue`
- [ ] Platform colours: `[aws]`, `[azure]`, `[on-prem]`, `[gcp]`, `[oracle]`
- [ ] Element states: default (current), `[new]`, `[changing]`, `[decommissioned]`
- [ ] Label placement: inside for `system`, below for `database` and `queue`; override with `[label:inside]` / `[label:below]`
- [ ] Connections: `connect A -> B : protocol`, `connect A <-> B : protocol`
- [ ] Arrow styles: closed arrowhead for all connections; open arrowhead when either endpoint is a `queue`
- [ ] Groupings — deferred to v2

---

## Build and Run

```bash
npm install
npm run dev      # development server with hot reload
npm run build    # production build → dist/
```
