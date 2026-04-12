# Requirements — Tegne

This file defines what the tool does from a user perspective.
For how it is built, see `.claude/rules/`.

---

## Purpose

A browser-based, interactive diagram editor for structural and visual modelling. The user defines a model in a plain-text DSL. The tool renders it as an interactive SVG canvas. All elements are draggable so the user can correct the auto-layout by hand.

No simulation or equation evaluation — this is a **structural/visual modelling tool only**.

---

## Shared DSL Directives

These directives are recognised in all diagram types.

### Metadata Directives

Optional lines, conventionally at the top. All fields are optional except `date`, which defaults to today.

```
@type         sd|id|infoflow       ← diagram type; default: sd
@name         <model name>
@version      <version string>
@date         <date string>
@author       <author name>
@theme        <theme name>        ← colour theme: dark (default) | light | tokyo
@orientation  landscape|portrait  ← page orientation; default: landscape
@size         a4|a3|a2|a1|a0     ← paper size; default: a4
```

Unknown `@type` values produce a `ParseError`.

### Layout Position Directives

Written automatically by the **Save** action. Do not edit manually.

```
@position <node-id> <x> <y>
```

- One line per element
- If any `@position` directives are present, auto-layout is skipped entirely
- Elements without a saved position fall back to auto-layout
- The reserved key `__meta__` stores the position of the metadata box:
  `@position __meta__ <x> <y>`
- The reserved key `__legend__` stores the position of the legend box (ID diagrams only):
  `@position __legend__ <x> <y>`

---

## Themes

All colours are controlled by the active theme. The theme is set via `@theme` in the DSL.

| Theme   | Description                                      |
|---------|--------------------------------------------------|
| `dark`  | Muted dark palette (default)                     |
| `light` | Light background, ink-on-paper                   |
| `tokyo` | Dark background with vivid saturated accents     |

Each theme defines colours for all element types in all supported diagram types.

---

## UI Layout

Two-column layout:
- **Left (~35%)** — DSL editor (`<textarea>`), toolbar (Open / Save / Render), error panel
- **Right (~65%)** — SVG canvas, toolbar (zoom controls + Export SVG)

### Canvas

- The canvas viewport is sized to the page defined by `@orientation` and `@size`
- There is no dead space outside the page — the canvas edge IS the page edge
- The canvas background colour comes from the active theme

### Zoom and Pan

- **`+`** / **`−`** buttons zoom in and out (×1.10 per step; range 25%–400%)
- **`⊡`** button resets to 100% and recentres
- A zoom percentage label sits between the zoom buttons and Export
- **Scroll** (mouse wheel or trackpad) pans the canvas in both axes
- Zoom resets to 100% on every Render

### Opening Files

- **Open** button triggers a hidden `<input type="file" accept=".sd,.id,.iff">`
- On file select: replace textarea content, then automatically render

### Saving Files

- **Save** button appends `@position` directives for every element to the DSL text and opens a **Save As dialog**
- Uses the browser File System Access API (`showSaveFilePicker`) when available (Chrome/Edge) — gives full directory and filename control
- Falls back to a programmatic download in browsers that do not support the API (Firefox, Safari)
- Suggested filename is derived from `@name` (slugified) or `model.<ext>`
- Save does **not** modify the textarea content

### Export SVG

- Produces a standalone `.svg` file
- Always exported at full page zoom (current pan/zoom state is ignored)
- `data-*` attributes stripped before export
- Self-contained — no external fonts or resources

### Help Panel

- A **Help** button sits after the Export SVG button in the right toolbar
- Clicking toggles a floating, draggable panel — it does not block or dim the rest of the UI
- The panel shows a short description and full DSL syntax for each diagram type (ID and infoflow)
- Draggable by the header bar; × button also closes it
- Panel position is not persisted — resets to upper-right on each page load

### Error Handling

- Parse errors shown in a red panel below the editor (line number + message)
- A parse error does **not** clear the current diagram — last valid render stays on screen
- Do **not** use `alert()` or `window.confirm()`

### Persistence

- Current DSL text is saved to `localStorage` and restored on page reload

---

## Metadata Box

Rendered in the bottom-left corner of the page area by default. Present in all diagram types.

- Shows: `name`, `version`, `date`, `author` (optional fields omitted if not set; `date` always shown)
- Colours come from the active theme's `metaBox` slots
- **Draggable** — can be repositioned freely on the canvas
- Position is persisted via `@position __meta__ x y` alongside element positions
- Included in SVG export at its current position

---

## Diagram Types

The `@type` directive selects the diagram type. Defaults to `sd` if absent.

| Value | Diagram | Status |
|---|---|---|
| `sd` | Forrester Stock-and-Flow (System Dynamics) | Implemented |
| `id` | Integration Diagram (IT Architecture) | Implemented |
| `infoflow` | Information Flow Diagram (Data Landscape) | Implemented |

---

## Forrester Stock-and-Flow Diagram (`@type sd`)

### Purpose

For System Dynamics modellers to document causal structure — stocks, flows, clouds, and auxiliary variables with polarity-coded connectors.

### Element Types

```
# Stock (rectangle)
stock <name>

# Cloud / boundary (source or sink)
cloud <name> [source|sink]

# Flow (pipe + valve between two nodes)
# strength is optional — medium is the default
flow <from> -> <to> : <label> (<polarity>) [weak|medium|strong]

# Auxiliary variable (circle) — with optional inline connectors
aux <name> [<- <from1> (<polarity>)[, <from2> (<polarity>)] ...]

# Causal connector (curved arrow)
connector <to> <- <from> (<polarity>)
connector <to> <- <from1> (<polarity>), <from2> (<polarity>)
```

### Polarity

- `(+)` positive / reinforcing influence
- `(-)` negative / balancing influence

### Flow Strength

| Keyword  | Pipe style                   |
|----------|------------------------------|
| `strong` | Solid pipe                   |
| `medium` | Dashed pipe *(default)*      |
| `weak`   | Dotted pipe                  |

### Forrester Symbols

| Element   | Visual Representation                               |
|-----------|-----------------------------------------------------|
| Stock     | Rectangle with label inside                         |
| Flow      | Pipe with valve (⊗) icon at midpoint               |
| Cloud     | Forrester cloud shape (bumpy outline)               |
| Auxiliary | Circle with label                                   |
| Connector | Curved dashed arrow with +/− polarity label         |

Polarity labels (`+` / `−`) are rendered at **15px bold** on both flows and connectors. Negative connectors are rendered in red so reinforcing vs. balancing links are immediately visible.

### Rules

- A flow label and an aux name **must not share the same name**
- `aux <name> <- ...` creates one Connector per listed source — no separate `connector` line needed
- A multi-source `connector` or `aux` line produces one `Connector` object per source
- `connector` and `aux` targets may reference a flow label (valve) as well as stock, cloud, or aux ids
- Lines starting with `#` are comments and are ignored
- **No parentheses in inline comments** on `flow`, `connector`, or `aux` lines — the parser finds the polarity token by scanning for the last `(...)` on the line; a comment containing parentheses after the polarity (e.g. `# see loop (B1)`) will be mistaken for the polarity and produce a parse error

### DSL Example

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

## Integration Diagram (`@type id`)

### Purpose

For IT Architects to document how systems integrate — what exists, what will change, what will be decommissioned, and what is new. Provides a visual standard for integration landscape diagrams.

### Element Types

| Keyword    | Shape                    | Label placement |
|------------|--------------------------|-----------------|
| `system`   | Rectangle                | Inside          |
| `database` | Vertical drum (cylinder) | Below           |
| `queue`    | Horizontal cylinder      | Below           |

Label placement can be overridden with `[label:inside]` or `[label:below]`.

### Platform

Every element declares its platform in square brackets. This controls fill colour.

| Platform    | Colour      | Hex       |
|-------------|-------------|-----------|
| `[aws]`     | Orange      | `#FF9900` |
| `[azure]`   | Blue        | `#0078D4` |
| `[on-prem]` | Cadet grey  | `#91A3B0` |
| `[gcp]`     | Green       | `#34A853` |
| `[oracle]`  | Red         | `#C74634` |

### Element State

An optional second bracket sets the lifecycle state of an element.

| State                | Border               | Fill                              |
|----------------------|----------------------|-----------------------------------|
| *(absent — current)* | Solid, normal weight | Full platform colour              |
| `[new]`              | Solid, thick         | Bright/saturated platform colour  |
| `[changing]`         | Dashed               | Platform colour at 50% opacity    |
| `[decommissioned]`   | Dotted               | Grey                              |

### Connections

```
connect  <from>  ->   <to>  : <protocol>   # unidirectional
connect  <from>  <->  <to>  : <protocol>   # bidirectional
```

- Protocol is a free-form label (e.g. `REST`, `SQS`, `SOAP`, `SFTP`, `Kafka`)
- **Closed arrowhead** for all connections except those involving a `queue` endpoint
- **Open arrowhead** when either the source or target is a `queue`

### Groupings

Named boundary rectangles that visually cluster related elements.

```
group <id> <label> [label:upper-left|upper-right|lower-left|lower-right]
  system/database/queue declarations...
end
```

- Elements declared inside the block belong to the group
- The group renders as a dashed rounded rectangle behind its members
- The label appears in the specified corner (default: `upper-right`)
- Dragging the group background moves all members together
- Groups cannot be nested; an element can belong to at most one group

### Legend Box

An auto-generated legend is rendered in the **upper-right corner** of the page.

- Shows only the platform/state combinations that are actually in use in the diagram
- Each entry displays a colour swatch (with correct fill, opacity, and border style) and a label
- **Draggable** — position persisted via `@position __legend__ x y`

### DSL Example

```
@type     id
@name     Current State Architecture
@author   Jane Smith
@date     2026-03-31

system    OrderSvc        [aws]
system    PaymentSvc      [azure]
system    LegacyAuth      [on-prem]   [decommissioned]
system    NewReporting    [aws]       [new]
system    BillingSvc      [azure]     [changing]
database  CustomerDB      [on-prem]
queue     OrderQueue      [aws]

connect   OrderSvc    ->   OrderQueue   : SQS
connect   OrderQueue  ->   PaymentSvc   : SQS
connect   OrderSvc   <->   PaymentSvc   : REST
connect   LegacyAuth  ->   OrderSvc     : SOAP
```

---

## Information Flow Diagram (`@type infoflow`)

### Purpose

For data architects and engineers to document how data flows between stores in a system landscape. Answers questions like: where does data originate, how is it replicated or derived, and which systems consume it.

### Element Types

There is one element type: `store`. It represents any data store — a database, a stream, a file, a mart, a cache, or any other place data persists.

```
store <id> [<role>] [<state>] [label:"Human Readable Name"]
```

- `<id>` — unique identifier (no spaces)
- `[<role>]` — required; controls fill colour (see Roles table)
- `[<state>]` — optional; controls border style (default: current)
- `[label:"..."]` — optional; display name; defaults to `<id>` if omitted

### Roles

The role describes the data governance position of the store.

| Role          | Meaning                                              |
|---------------|------------------------------------------------------|
| `master`      | System of record — authoritative source for the data |
| `replica`     | Exact copy of a master, kept in sync                 |
| `derived`     | Computed or transformed from one or more sources     |
| `aggregate`   | Combined from multiple sources (rollup, union, join) |
| `golden`      | Curated, cleansed master — highest quality           |
| `reference`   | Stable lookup / code data (e.g. country codes)       |
| `consumer`    | Read-only downstream sink; does not feed others      |

### Element State

Same lifecycle states as the Integration Diagram.

| State                | Border style            |
|----------------------|-------------------------|
| *(absent — current)* | Solid, normal weight    |
| `[new]`              | Solid, thick            |
| `[changing]`         | Dashed                  |
| `[decommissioned]`   | Dotted                  |

### Links

```
link <from> -> <to> : <relationship>
```

One link per line. The relationship is a single keyword describing the data movement.

| Relationship | Meaning                                                   |
|--------------|-----------------------------------------------------------|
| `replicate`  | Byte-for-byte copy kept in sync                           |
| `publish`    | Events pushed to a broker or stream                       |
| `ingest`     | Bulk load or batch import                                 |
| `derive`     | Transform or compute a new dataset from the source        |
| `aggregate`  | Roll up or combine multiple sources into one              |
| `enrich`     | Add fields from the source to an existing dataset         |
| `merge`      | Reconcile two or more stores into one                     |
| `serve`      | Expose data to a downstream consumer (API, query, export) |

### Groupings

Same syntax as ID groups. Declares a named boundary rectangle around related stores.

```
group <id> <label> [label:upper-left|upper-right|lower-left|lower-right]
  store declarations...
end
```

### DSL Example

```
@type     infoflow
@name     Customer Information Landscape
@version  1.0
@author   Jane Smith
@date     2026-04-11

group customer_domain Customer Domain [label:upper-left]
store crm        [master]    [label:"CRM System"]
store cdp        [golden]    [label:"Customer Data Platform"]
store loyalty_db [replica]   [label:"Loyalty DB"]
end

group analytics Analytics [label:upper-right]
store analytics_dw [aggregate] [label:"Analytics Warehouse"]
store segment_db   [derived]   [label:"Segment Store"]
end

store ext_ref    [reference] [label:"External Reference Data"]
store mobile_app [consumer]  [label:"Mobile App Cache"]

link crm          -> cdp           : publish
link cdp          -> loyalty_db    : replicate
link cdp          -> analytics_dw  : ingest
link analytics_dw -> segment_db    : derive
link ext_ref      -> cdp           : enrich
link cdp          -> mobile_app    : serve
link segment_db   -> mobile_app    : serve
```
