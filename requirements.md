# Requirements — Tegne

This file defines what the tool does from a user perspective.
For how it is built, see `.claude/rules/`.

---

## Purpose

A browser-based, interactive diagram editor for structural and visual modelling. The user defines a model in a plain-text DSL. The tool renders it as an interactive SVG canvas. All elements are draggable so the user can correct the auto-layout by hand.

Currently supports **Forrester Stock-and-Flow diagrams** (System Dynamics). More diagram types are planned.

No simulation or equation evaluation — this is a **structural/visual modelling tool only**.

---

## DSL Syntax

### Metadata Directives

Optional lines, conventionally at the top. All fields are optional except `date`, which defaults to today.

```
@name         <model name>
@version      <version string>
@date         <date string>
@author       <author name>
@theme        <theme name>        ← colour theme: dark (default) | light | tokyo
@orientation  landscape|portrait  ← A4 page size; default: landscape
```

### Layout Position Directives

Written automatically by the **Save** action. Do not edit manually.

```
@position <node-id> <x> <y>
```

- One line per node (stocks, clouds, auxiliaries)
- If any `@position` directives are present, auto-layout is skipped entirely
- Nodes without a saved position fall back to auto-layout

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

### Rules
- A flow label and an aux name **must not share the same name**
- `aux <name> <- ...` creates one Connector per listed source — no separate `connector` line needed
- A multi-source `connector` or `aux` line produces one `Connector` object per source
- `connector` and `aux` targets may reference a flow label (valve) as well as stock, cloud, or aux ids
- Lines starting with `#` are comments and are ignored
- **No parentheses in inline comments** on `flow`, `connector`, or `aux` lines — the parser finds the polarity token by scanning for the last `(...)` on the line; a comment containing parentheses after the polarity (e.g. `# see loop (B1)`) will be mistaken for the polarity and produce a parse error

---

## Forrester Symbols

| Element   | Visual Representation                               |
|-----------|-----------------------------------------------------|
| Stock     | Rectangle with label inside                         |
| Flow      | Pipe with valve (⊗) icon at midpoint               |
| Cloud     | Forrester cloud shape (bumpy outline)               |
| Auxiliary | Circle with label                                   |
| Connector | Curved dashed arrow with +/− polarity label         |

---

## Themes

All colours are controlled by the active theme. The theme is set via `@theme` in the DSL.

| Theme   | Description                                      |
|---------|--------------------------------------------------|
| `dark`  | Muted dark palette (default)                     |
| `light` | Light background, ink-on-paper                   |
| `tokyo` | Dark background with vivid saturated accents     |

Each theme defines colours for: canvas background, page guide, stocks, clouds, auxiliaries, flow pipes (strong / medium / weak), valve fill, flow labels, connector arrows, polarity indicators, and the metadata box.

Each theme has a dedicated `polarity` slot with two colours:

| Slot | Applied to |
|------|-----------|
| `polarity.positive` | `+` label and connector line/arrow when polarity is `(+)` |
| `polarity.negative` | `−` label, connector line, and arrowhead when polarity is `(-)` |

Negative connectors are rendered in red so reinforcing vs. balancing links are immediately visible. In the `tokyo` theme the negative colour is neon red (`#ff0040`).

Polarity labels (`+` / `−`) are rendered at **15px bold** on both flows and connectors.

---

## UI Layout

Two-column layout:
- **Left (~35%)** — DSL editor (`<textarea>`), toolbar (Open / Save / Render), error panel
- **Right (~65%)** — SVG canvas, toolbar (zoom controls + Export SVG)

### Canvas

- The canvas viewport is sized to the A4 page defined by `@orientation`
  - Landscape: ~1240 × 876 SVG units
  - Portrait: ~619 × 876 SVG units
- There is no dead space outside the page — the canvas edge IS the page edge
- The canvas background colour comes from the active theme

### Zoom and Pan

- **`+`** / **`−`** buttons zoom in and out (×1.10 per step; range 25%–400%)
- **`⊡`** button resets to 100% and recentres
- A zoom percentage label sits between the zoom buttons and Export
- **Scroll** (mouse wheel or trackpad) pans the canvas in both axes
- Zoom resets to 100% on every Render

### Opening Files

- **Open** button triggers a hidden `<input type="file" accept=".sd">`
- On file select: replace textarea content, then automatically render

### Saving Files

- **Save** button appends `@position` directives for every node to the DSL text and opens a **Save As dialog**
- Uses the browser File System Access API (`showSaveFilePicker`) when available (Chrome/Edge) — gives full directory and filename control
- Falls back to a programmatic download in browsers that do not support the API (Firefox, Safari)
- Suggested filename is derived from `@name` (slugified) or `model.sd`
- Save does **not** modify the textarea content

### Export SVG

- Produces a standalone `.svg` file
- Always exported at full page zoom (current pan/zoom state is ignored)
- `data-*` attributes stripped before export
- Self-contained — no external fonts or resources

### Error Handling

- Parse errors shown in a red panel below the editor (line number + message)
- A parse error does **not** clear the current diagram — last valid render stays on screen
- Do **not** use `alert()` or `window.confirm()`

### Persistence

- Current DSL text is saved to `localStorage` and restored on page reload

---

## Metadata Box

Rendered in the bottom-left corner of the page area, always visible.

- Shows: `name`, `version`, `date`, `author` (optional fields omitted if not set; `date` always shown)
- Colours come from the active theme's `metaBox` slots
- Not draggable
- Included in SVG export unchanged

---

---

## Diagram Types

The `@type` directive at the top of a file selects the diagram type. Valid values:

| Value | Diagram |
|---|---|
| `sd` | Forrester Stock-and-Flow (System Dynamics) — default if `@type` is absent |
| `id` | Integration Diagram |

Unknown `@type` values produce a `ParseError`.

---

## Integration Diagram (`@type id`)

### Purpose

For IT Architects to document how systems integrate — what exists, what will change, what will be decommissioned, and what is new. Provides a visual standard for integration landscape diagrams.

### Element Types

| Keyword | Shape | Label placement |
|---|---|---|
| `system` | Rectangle | Inside |
| `database` | Vertical drum (cylinder) | Below |
| `queue` | Horizontal cylinder | Below |

Label placement can be overridden with `[label:inside]` or `[label:below]`.

### Platform

Every element declares its platform in square brackets. This controls fill colour.

| Platform | Colour | Hex |
|---|---|---|
| `[aws]` | Orange | `#FF9900` |
| `[azure]` | Blue | `#0078D4` |
| `[on-prem]` | Olive green | `#6B7C3A` |
| `[gcp]` | Green | `#34A853` |
| `[oracle]` | Red | `#C74634` |

### Element State

An optional second bracket sets the lifecycle state of an element.

| State | Border | Fill |
|---|---|---|
| *(absent — current)* | Solid, normal weight | Full platform colour |
| `[new]` | Solid, thick | Bright/saturated platform colour |
| `[changing]` | Dotted | Muted platform colour |
| `[decommissioned]` | Dotted | Grey |

### Connections

```
connect  <from>  ->   <to>  : <protocol>   # unidirectional
connect  <from>  <->  <to>  : <protocol>   # bidirectional
```

- Protocol is a free-form label (e.g. `REST`, `SQS`, `SOAP`, `SFTP`, `Kafka`)
- **Closed arrowhead** for all connections except those involving a `queue` endpoint
- **Open arrowhead** when either the source or target is a `queue`

### Groupings

Deferred to v2. Syntax reserved:

```
group start "Group Name"
group end "Group Name"
```

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

## Example Model

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
