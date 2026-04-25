# Tegne

> *Norwegian: å tegne — to draw*

A browser-based diagram editor for structural and visual modelling. Write a model in a plain-text DSL, render it as an interactive SVG, adjust the layout by dragging, then save or export.

Supports three diagram types:
- **Stock-and-Flow diagrams** (`@type sd`) — Forrester/System Dynamics structural modelling
- **Integration diagrams** (`@type id`) — IT architecture, showing systems, databases, queues, and their connections
- **Information Flow diagrams** (`@type infoflow`) — data landscape showing how information moves between stores and processes
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
2. **Open** an existing `.sd`, `.id`, or `.iff` file — renders automatically
3. **Fix errors** shown in the red panel below the editor — the last valid diagram stays on screen
4. **Drag** any element to correct the auto-layout
5. **Zoom** with `+` / `−` buttons or scroll the canvas; **⊡** resets to full page
6. **Save** to write a file that preserves both the model and your layout
7. **Export SVG** to download a standalone `.svg` for use in presentations or documents
8. **Help** to open a floating syntax reference panel — can be kept open alongside your diagram

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
| `[on-prem]` | Cadet grey |
| `[gcp]` | Green |
| `[oracle]` | Red |

### Lifecycle states

| State | Border | Fill |
|-------|--------|------|
| *(absent — current)* | Solid | Full platform colour |
| `[new]` | Solid, thick | Bright platform colour |
| `[changing]` | Dashed | Platform colour at 50% opacity |
| `[decommissioned]` | Dotted | Grey |

### Connections

- `->` unidirectional, `<->` bidirectional
- Closed arrowhead for system/database connections; open arrowhead when either endpoint is a queue
- Protocol is a free-form label: `REST`, `SQS`, `SOAP`, `Kafka`, `SFTP`, etc.

### Themes

The `tokyo` theme renders integration diagrams with full neon colours — glowing platform fills on a near-black canvas.

### Legend box

A legend is auto-generated in the upper-right corner showing every platform/state combination in use. Each entry shows a colour swatch with the correct fill, opacity, and border style. The legend is draggable and its position is saved.

---

## Information Flow Diagram (`@type infoflow`)

### Purpose

For data architects documenting a data landscape — where data lives, which processes act on it, and how information moves across the landscape. Focuses on ownership, semantics, and change scope rather than infrastructure detail.

### DSL Syntax

```
@type     infoflow
@name     My Data Landscape
@version  1.0
@author   Team
@theme    dark             # dark (default), light, or tokyo
@size     a4               # a4 (default), a3, a2, a1, a0

@location-types
  master blue
  replica cyan
  derived green
  aggregate purple
  reference grey
  consumer grey

@systems
  SystemA blue
  SystemB teal

@flow-types
  sync solid
  async dashed
  batch thick

store crm        [master]
store cdp        [replica]   [changing] [label:"Customer Data Platform"]
process syncer   [SystemA]   [label:"Sync Service"]

link crm      -> syncer : query     [flow:sync]
link syncer   -> cdp    : replicate [flow:batch]

group customer_domain "Customer Domain" [system:SystemA] [corner:upper-left]
  store crm [master]
  process syncer
end
```

### Stores

Stores render as database drums.

| Location Type | Meaning |
|---|---|
| `master` | System of record — authoritative source |
| `replica` | Exact copy kept in sync |
| `derived` | Computed or transformed from source data |
| `aggregate` | Rolled-up or summarised from multiple sources |
| `golden` | Curated, cleansed master — highest quality |
| `reference` | Stable lookup data (e.g. country codes) |
| `consumer` | Read-only downstream sink |

### Processes

Processes render as squares and use `@systems` for colour.

```
process <id> [<system>] [<state>] [label:"Human Readable Name"]
```

If a process is declared inside `group ... [system:<name>]`, it inherits that system unless overridden locally.

### Relationships

| Keyword | Meaning |
|---|---|
| `replicate` | Byte-for-byte copy kept in sync |
| `publish` | Events pushed to a broker or stream |
| `subscribe` | Event consumer or stream subscriber |
| `ingest` | Bulk load or batch import |
| `derive` | Transform or compute a new dataset |
| `aggregate` | Roll up or combine multiple sources |
| `enrich` | Add fields from the source to an existing dataset |
| `merge` | Reconcile multiple stores into one |
| `serve` | Expose data to a downstream consumer |
| `query` | Synchronous read from another node |

### Lifecycle states

Supported states are `current` (default), `[unchanged]`, `[new]`, `[changing]`, and `[decommissioned]`. `[unchanged]` is an alias for the default current state. Visuals are: solid for unchanged/current, dashed for changing, dotted for new, and an `X` marker for decommissioned.

### Groupings

Same `group` / `end` syntax as Integration Diagram. Preferred use is domain or ownership grouping.

---


## Project Structure

```
src/
  main.ts         — wires UI; routes to correct pipeline by @type
  types.ts        — shared types and re-exports from sub-modules
  parser.ts       — DSL entry point; pre-scans @type, dispatches
  themes.ts       — colour themes (dark, light, tokyo)
  export.ts       — SVG export, .sd / .id / .iff save
  env.d.ts        — File System Access API + Vite ?raw declarations
  sd/             — Forrester Stock-and-Flow
    types.ts, parser.ts, layout.ts, renderer.ts, drag.ts
  id/             — Integration Diagram
    types.ts, parser.ts, layout.ts, renderer.ts, shapes.ts
  iff/            — Information Flow Diagram
    types.ts, parser.ts, layout.ts, renderer.ts, shapes.ts
fixtures/
  population.sd              — SD: simple model, all five element types
  factory_dynamics.sd        — SD: Forrester production-distribution chain
  integration_example.id     — ID: e-commerce platform, all element types and states
  banking_platform.id        — ID: digital banking platform, all platforms and states, four groups
  e-commerce-platform.id     — ID: e-commerce platform variant
  digital-banking-platform.id — ID: digital banking variant
  customer_information.iff   — IFF: customer data landscape, all 7 roles, two groups
tests/
  parser.test.ts       — SD parser unit tests
  id-parser.test.ts    — ID parser unit tests
  iff-parser.test.ts   — IFF parser unit tests
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
