# Tegne

> *Norwegian: å tegne — to draw*

A browser-based diagram editor for structural and visual modelling. Write a model in a plain-text DSL, render it as an interactive SVG, adjust the layout by dragging, then save or export.

Currently supports **Forrester Stock-and-Flow diagrams** (System Dynamics). More diagram types are planned.

---

## Quick Start

```bash
npm install
npm run dev      # opens http://localhost:5173
npm run build    # production build → dist/
```

No server required. Everything runs in the browser.

---

## Workflow

1. **Write** a model in the DSL editor (left panel)
2. **Open** an existing `.sd` file with the Open button — renders automatically
3. **Fix errors** shown in the red panel below the editor — the last valid diagram stays on screen
4. **Drag** any node to correct the auto-layout
5. **Zoom** with `+` / `−` buttons or scroll the canvas; **⊡** resets to full page
6. **Save** to write an `.sd` file that preserves both the model and your layout
7. **Export SVG** to download a standalone `.svg` for use in presentations or documents

---

## DSL Syntax

```
# Metadata (all optional — date defaults to today)
@name         My Model
@version      1.0
@date         2026-03-29
@author       Jane Smith
@theme        dark             # colour theme: dark (default), light, or tokyo
@orientation  landscape        # A4 page size: landscape (default) or portrait

# Elements
stock  <name>
cloud  <name> [source|sink]
flow   <from> -> <to> : <label> (<+|->) [weak|medium|strong]
aux    <name> [<- <source> (<+|->)[, <source2> (<+|->)] ...]
connector <target> <- <source> (<+|->)[, <source2> (<+|->)]

# Lines starting with # are comments and are ignored
```

### Flow strength

| Keyword | Pipe style |
|---------|-----------|
| `strong` | Solid pipe |
| `medium` | Dashed pipe *(default)* |
| `weak` | Dotted pipe |

### Rules and limitations

- Flow labels and aux names must not share the same name
- `aux name <- A (+), B (-)` declares the aux **and** creates two connector arrows in one line
- Connectors can target a flow label (valve) as well as stock, cloud, or aux names
- `@position` lines are written by Save — do not edit manually
- **Do not use parentheses in inline comments** on `flow`, `connector`, or `aux` lines — the parser locates the polarity by scanning for the last `(...)` on the line, so a comment like `# see loop (B1)` will be mistaken for the polarity token

---

## Example

```
@name    Population Dynamics
@version 1.0
@author  Jane Smith
@theme   tokyo

stock Population
cloud Births [source]
cloud Deaths [sink]

flow Births -> Population : birth_rate (+) strong
flow Population -> Deaths : death_rate (-) weak

aux carrying_capacity <- Population (-)

connector birth_rate <- Population (+)
connector death_rate <- carrying_capacity (-)
```

---

## Forrester Symbols

Tegne currently renders the five symbols defined by Jay Forrester for Stock-and-Flow diagrams.

| Symbol | Shape | Meaning |
|--------|-------|---------|
| **Stock** | Rectangle | An accumulation — something measurable at a point in time. Changes only through flows. |
| **Cloud** | Bumpy outline | Model boundary. A source produces material; a sink absorbs it. |
| **Flow** | Pipe with ⊗ valve | A rate — material moving between nodes per unit of time. |
| **Auxiliary** | Circle | An intermediate variable. Carries information, not material. |
| **Connector** | Curved dashed arrow | A causal link. `(+)` same direction; `(−)` opposite direction. |

---

## Project Structure

```
src/
  types.ts      — SDModel interfaces and type definitions
  parser.ts     — DSL text → SDModel (with error collection)
  layout.ts     — auto-positions nodes; honours @position overrides
  renderer.ts   — SVG rendering via D3
  drag.ts       — D3 drag; redraws connectors on move
  export.ts     — SVG export and .sd file save
  themes.ts     — colour theme definitions (dark, light, tokyo)
  main.ts       — wires UI buttons and editor
fixtures/
  population.sd        — simple model covering all five element types
  factory_dynamics.sd  — Forrester production-distribution chain (bullwhip effect)
```

---

## Stack

- **Vite** — dev server and build
- **TypeScript** — strict mode throughout
- **D3** — SVG rendering and drag only

No UI framework. No CSS framework. No parser library. No backend.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
