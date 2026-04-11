# Tegne

> *Norwegian: å tegne — to draw*

A browser-based diagram editor for structural and visual modelling. Write a model in a plain-text DSL, render it as an interactive SVG, adjust the layout by dragging, then save or export.

Supports three diagram types:
- **Stock-and-Flow diagrams** (`@type sd`) — Forrester/System Dynamics structural modelling
- **Integration diagrams** (`@type id`) — IT architecture, showing systems, databases, queues, and 
their connections
- **Information Flow Diagram** (`@type infoflow`) shows how information is owned, copied, transformed, enriched, and aggregated across systems.
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
2. **Open** an existing `.sd` or `.id` or `.iff` file — renders automatically
3. **Fix errors** shown in the red panel below the editor — the last valid diagram stays on screen
4. **Drag** any element to correct the auto-layout
5. **Zoom** with `+` / `−` buttons or scroll the canvas; **⊡** resets to full page
6. **Save** to write a file that preserves both the model and your layout
7. **Export SVG** to download a standalone `.svg` for use in presentations or documents

---

## Diagram Types

Every file starts with `@type`. If absent, defaults to `sd`.

| `@type` | Diagram | File extension |
|---------|---------|---------------|
| `sd` | Forrester Stock-and-Flow | `.sd` |
| `id` | Integration diagram | `.id` |
| `infoflow` | Information Flow diagram | `.iff` |

---

## Stock-and-Flow Diagrams (`@type sd`)

### DSL Syntax

```
@type         sd               # optional — sd is the default
@name         My Model
@version      1.0
@date         2026-03-29
@author       Jane Smith
@theme        dark             # dark (default), light, or tokyo
@orientation  landscape        # landscape (default) or portrait

stock  <name>
cloud  <name> [source|sink]
flow   <from> -> <to> : <label> (<+|->) [weak|medium|strong]
aux    <name> [<- <source> (<+|->)[, <source2> (<+|->)] ...]
connector <target> <- <source> (<+|->)[, <source2> (<+|->)]

# Lines starting with # are comments
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

### Forrester Symbols

| Symbol | Shape | Meaning |
|--------|-------|---------|
| **Stock** | Rectangle | An accumulation — something measurable at a point in time. Changes only through flows. |
| **Cloud** | Bumpy outline | Model boundary. A source produces material; a sink absorbs it. |
| **Flow** | Pipe with ⊗ valve | A rate — material moving between nodes per unit of time. |
| **Auxiliary** | Circle | An intermediate variable. Carries information, not material. |
| **Connector** | Curved dashed arrow | A causal link. `(+)` same direction; `(−)` opposite direction. |

### Example

```
@type    sd
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

## Integration Diagrams (`@type id`)

### Purpose

For IT Architects documenting integration landscapes — what systems exist, how they connect, what will change, what is being decommissioned, and what is new.

### DSL Syntax

```
@type         id
@name         My Architecture
@version      1.0
@author       Jane Smith
@theme        dark             # dark (default), light, or tokyo
@orientation  landscape

# Elements: keyword  id  [platform]  [state]  [label:below]
system    OrderSvc        [aws]
system    PaymentSvc      [azure]
system    LegacyAuth      [on-prem]   [decommissioned]
system    NewReporting    [aws]       [new]
system    BillingSvc      [azure]     [changing]
database  CustomerDB      [on-prem]
queue     OrderQueue      [aws]

# Connections: from  direction  to  : protocol
connect   OrderSvc    ->   OrderQueue   : SQS
connect   OrderQueue  ->   PaymentSvc   : SQS
connect   OrderSvc   <->   PaymentSvc   : REST
connect   LegacyAuth  ->   OrderSvc     : SOAP
```

### Element types

| Keyword | Shape | Default label |
|---------|-------|--------------|
| `system` | Rectangle | Inside |
| `database` | Vertical drum | Below |
| `queue` | Horizontal cylinder | Below |

Override label placement with `[label:inside]` or `[label:below]`.

### Platforms

| Platform | Colour |
|----------|--------|
| `[aws]` | Orange |
| `[azure]` | Blue |
| `[on-prem]` | Olive green |
| `[gcp]` | Green |
| `[oracle]` | Red |

### Lifecycle states

| State | Border | Fill |
|-------|--------|------|
| *(absent — current)* | Solid | Full platform colour |
| `[new]` | Solid, thick | Bright platform colour |
| `[changing]` | Dashed | Muted platform colour |
| `[decommissioned]` | Dotted | Grey |

### Connections

- `->` unidirectional, `<->` bidirectional
- Closed arrowhead for system/database connections; open arrowhead when either endpoint is a queue
- Protocol is a free-form label: `REST`, `SQS`, `SOAP`, `Kafka`, `SFTP`, etc.

### Themes

The `tokyo` theme renders integration diagrams with full neon colours — glowing platform fills on a near-black canvas.

---

## Information Flow Diagram (`@type infoflow`)

### Node semantics

Each node represents a system, store, or data-holding component with a defined informational role.

The key distinction is not deployment technology, but **data role**.

Recommended core roles:

- `master`
- `replica`
- `derived`
- `aggregate`
- `golden`
- `reference`
- `consumer`

### Link semantics

Each link represents an information relationship.

Core relationship types:

- `replicate`
- `publish`
- `ingest`
- `derive`
- `aggregate`
- `enrich`
- `merge`
- `serve`

The relationship keyword describes the informational meaning of the movement. Technical protocol belongs in the optional transport bracket.

---


## Project Structure

```
src/
  types.ts        — all model interfaces and type definitions
  parser.ts       — DSL entry point; dispatches to sd or id parser
  parser.ts       — SD DSL → SDModel
  id-parser.ts    — ID DSL → IDModel
  layout.ts       — SD auto-layout
  id-layout.ts    — ID auto-layout (grid)
  renderer.ts     — SD SVG rendering via D3
  id-renderer.ts  — ID SVG rendering via D3
  drag.ts         — SD drag behaviour
  export.ts       — SVG export and file save (.sd and .id)
  themes.ts       — colour theme definitions (dark, light, tokyo)
  main.ts         — wires UI; routes to correct pipeline by @type
fixtures/
  population.sd           — SD: simple model, all five element types
  factory_dynamics.sd     — SD: Forrester production-distribution chain
  integration_example.id  — ID: e-commerce platform, all element types and states
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
