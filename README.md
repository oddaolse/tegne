# Tegne

> *Norwegian: å tegne — to draw*

A browser-based diagram editor for structural and visual modelling. Write a model in a plain-text DSL, render it as an interactive SVG, adjust the layout by dragging, then save or export.

Supports four diagram types:
- **Threat Models** (`@type tm`) - STRIDE threats over referenced diagram elements
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

| `@type`    | Diagram                  | File extension |
|------------|--------------------------|----------------|
| `sd`       | Forrester Stock-and-Flow | `.sd`          |
| `id`       | Integration diagram      | `.id`          |
| `infoflow` | Information Flow diagram | `.iff`         |
| `tm`       | Threat model             | `.tm`          |

Use **Config** to set the common Tegne files folder when a diagram uses shared setup:

```text
@include common-types.iff
```

Included files must be the same diagram type. They contribute dictionaries, display defaults, and TM `@ref` entries only; diagram elements, positions, and nested includes are invalid.

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
@legend       on               # on (default) or off
@info         on               # on (default) or off

stock  <name>
cloud  <name> [source|sink]
flow   <from> -> <to> : <label> (<+|->) [weak|medium|strong]
aux    <name> [<- <source> (<+|->)[, <source2> (<+|->)] ...]
connector <target> <- <source> (<+|->)[, <source2> (<+|->)]

# Lines starting with # are comments
```

### Flow strength

| Keyword  | Pipe style              |
|----------|-------------------------|
| `strong` | Solid pipe              |
| `medium` | Dashed pipe *(default)* |
| `weak`   | Dotted pipe             |

### Rules and limitations

- Flow labels and aux names must not share the same name
- `aux name <- A (+), B (-)` declares the aux **and** creates two connector arrows in one line
- Connectors can target a flow label (valve) as well as stock, cloud, or aux names
- `@position` lines are written by Save — do not edit manually
- **Do not use parentheses in inline comments** on `flow`, `connector`, or `aux` lines — the parser locates the polarity by scanning for the last `(...)` on the line, so a comment like `# see loop (B1)` will be mistaken for the polarity token

### Forrester Symbols

| Symbol        | Shape               | Meaning                                                                                |
|---------------|---------------------|----------------------------------------------------------------------------------------|
| **Stock**     | Rectangle           | An accumulation — something measurable at a point in time. Changes only through flows. |
| **Cloud**     | Bumpy outline       | Model boundary. A source produces material; a sink absorbs it.                         |
| **Flow**      | Pipe with ⊗ valve   | A rate — material moving between nodes per unit of time.                               |
| **Auxiliary** | Circle              | An intermediate variable. Carries information, not material.                           |
| **Connector** | Curved dashed arrow | A causal link. `(+)` same direction; `(−)` opposite direction.                         |

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

For IT architects documenting integration landscapes: what systems, databases, and queues exist; how they connect; which platforms or locations they belong to; and what is new, changing, or being decommissioned.

### Directives

```
@type         id
@name         <diagram name>
@version      <version>
@author       <author>
@theme        dark | light | tokyo
@orientation  landscape | portrait
@size         a4 | a3 | a2 | a1 | a0
@legend       on | off
@info         on | off
@show-ids     on | off

@include      common.id
```

`@include` loads same-type `.id` files from the Config folder. Included files contribute location types, flow types, and display defaults only; they do not add elements, connections, groups, or positions.

### Location Types

```
@location-types
  <location-type> <colour>
```

The parser accepts any declared location type name. These are common platform/location examples:

| Location type | Meaning |
|---|---|
| `aws` | Amazon Web Services-hosted component |
| `azure` | Microsoft Azure-hosted component |
| `gcp` | Google Cloud-hosted component |
| `on-prem` | On-premises or self-hosted component |
| `oracle` | Oracle platform or estate |
| `partner` | Externally owned partner system |
| `saas` | SaaS product or managed external service |

Palette colours: `green`, `blue`, `red`, `orange`, `purple`, `grey`, `yellow`, `cyan`, `pink`, `teal`.

Example:

```
@location-types
  aws orange
  azure blue
  gcp green
  on-prem grey
  oracle red
```

### Flow Types

```
@flow-types
  sync solid
  async dashed
  batch thick
```

The parser accepts declared flow type names. These are the common built-in flow types:

| Flow type | Line style | Meaning |
|---|---|---|
| `sync` | `solid` | Synchronous or request/response integration |
| `async` | `dashed` | Event/message-driven integration |
| `batch` | `thick` | Scheduled or bulk integration |

### Element types

| Keyword    | Shape               | Default label |
|------------|---------------------|---------------|
| `system`   | Rectangle           | Inside        |
| `database` | Vertical drum       | Below         |
| `queue`    | Horizontal cylinder | Below         |

Syntax:

```
system   <id> [<location-type>] [<state>] [placement:inside|below] [label:"<display name>"]
database <id> [<location-type>] [<state>] [placement:inside|below] [label:"<display name>"]
queue    <id> [<location-type>] [<state>] [placement:inside|below] [label:"<display name>"]
```

Override label placement with `[placement:inside]` or `[placement:below]`. Use `[label:"Display Name"]` when the rendered label should differ from the element ID.

Examples:

```
system   OrderSvc   [aws] [label:"Order Service"]
database CustomerDB [on-prem] [placement:inside]
queue    OrderQueue [aws]
```

### Lifecycle states

| State                | Border       | Fill                           |
|----------------------|--------------|--------------------------------|
| *(absent — current)* | Solid        | Full platform colour           |
| `[new]`              | Solid, thick | Bright platform colour         |
| `[changing]`         | Dashed       | Platform colour at 50% opacity |
| `[decommissioned]`   | Dotted       | Grey                           |

### Connections

```
connect <from> ->  <to> : <protocol> [flow:<flow-type>]
connect <from> <-> <to> : <protocol> [flow:<flow-type>]
```

- `->` unidirectional, `<->` bidirectional
- Closed arrowhead for system/database connections; open arrowhead when either endpoint is a queue
- Protocol is a free-form label: `REST`, `SQS`, `SOAP`, `Kafka`, `SFTP`, etc.
- Optional `[flow:<type>]` controls line style. Built-ins are `sync`, `async`, and `batch`; declare `@flow-types` to map names to `solid`, `dashed`, or `thick`.

Examples:

```
connect OrderSvc   ->  OrderQueue : SQS  [flow:async]
connect OrderSvc  <->  PaymentSvc : REST [flow:sync]
connect LegacyAuth ->  OrderSvc   : SOAP [flow:sync]
```

### Groups

```
group <id> <display name> [corner:upper-left|upper-right|lower-left|lower-right]
  <system/database/queue/connect declarations>
end
```

Groups define ownership, domain, subsystem, or application boundaries. Groups cannot be nested, and an element may belong to at most one group.

### Themes

The `tokyo` theme renders integration diagrams with full neon colours — glowing platform fills on a near-black canvas.

### Legend box

A legend is auto-generated in the upper-right corner showing every platform/state combination and flow type in use. Each platform entry shows a colour swatch with the correct fill, opacity, and border style. The legend is draggable and its position is saved.

### Complete Example

```
@type        id
@name        Order Platform
@version     1.0
@author      Architecture Team
@theme       light
@orientation landscape
@size        a4
@legend      on

@location-types
  aws orange
  azure blue
  on-prem grey

@flow-types
  sync solid
  async dashed
  batch thick

group frontend Frontend [corner:upper-left]
  system WebApp [aws] [changing] [label:"Web App"]
end

group backend Backend [corner:upper-right]
  system OrderSvc [azure] [label:"Order Service"]
  system PaymentSvc [azure] [new] [label:"Payment Service"]
end

group data Data Layer [corner:lower-right]
  database OrderDB [on-prem] [placement:inside] [label:"Order DB"]
end

queue OrderQueue [aws]
system LegacyAuth [on-prem] [decommissioned] [label:"Legacy Auth"]

connect WebApp     ->  OrderSvc   : REST [flow:sync]
connect OrderSvc   ->  OrderQueue : SQS  [flow:async]
connect OrderSvc  <->  PaymentSvc : REST [flow:sync]
connect OrderSvc   ->  OrderDB    : JDBC [flow:sync]
connect LegacyAuth ->  WebApp     : SOAP [flow:sync]
```

---

## Information Flow Diagram (`@type infoflow`)

### Purpose

For data architects documenting a data landscape: where information lives, which processes act on it, and how information moves across the landscape. The diagram focuses on information ownership, recommended store roles, semantic relationship verbs, movement mode, change scope, and system/domain grouping.

It does not model infrastructure topology, network zones, deployment details, or detailed request/response sequences.


### DSL Syntax

```
@type     infoflow
@name     <diagram name>
@version  <version>
@author   <author>
@theme    dark | light | tokyo
@orientation landscape | portrait
@size     a4 | a3 | a2 | a1 | a0
@legend   on | off
@info     on | off
@show-ids on | off

@include  common.iff
```

`@include` loads same-type `.iff` files from the Config folder. Included files contribute dictionaries and display defaults only; they do not add stores, processes, connections, groups, or positions.

### Store Roles

```
@location-types
  <role> <colour>
```

The parser accepts any declared role name. These are recommended store roles:

| Role | Meaning |
|---|---|
| `master` | System of record; authoritative source |
| `replica` | Copy of another store with the same business meaning |
| `derived` | Computed or transformed from source information |
| `aggregate` | Rolled up or summarized from records or sources |
| `golden` | Curated, cleansed, high-quality reference/master data |
| `reference` | Stable lookup or reference data |
| `consumer` | Downstream read model, cache, or consumer-specific projection |

Example:
```
@location-types
  master blue
  replica cyan
  derived green
  aggregate purple
  golden orange
  reference grey
  consumer grey
```

Palette colours: `green`, `blue`, `red`, `orange`, `purple`, `grey`, `yellow`, `cyan`, `pink`, `teal`.

### Systems
```
@systems
  <system-name> <colour>
```

Example:
```
@systems
  SystemA blue
  SystemB teal
```

### Flow Types

```
@flow-types
  sync  solid
  async dashed
  batch thick
```

The parser accepts declared flow type names. These are the common built-in flow types:

| Flow type | Line style | Meaning |
|---|---|---|
| `sync` | `solid` | Synchronous or request/response movement |
| `async` | `dashed` | Event/message-driven movement |
| `batch` | `thick` | Scheduled or bulk movement |


### Elements

#### Store

```
store <id> [<location-type>] [<state>] [label:"<display name>"]
```

A store is a place where information is stored or made available.

Examples:
```
store crm [master]
store cdp [replica] [changing] [label:"Customer Data Platform"]
```
#### Process

```
process <id> [<system>] [<state>] [label:"<display name>"]
```

A process is a component, job, service, application function, or manual activity that moves, transforms, derives, enriches, or serves information. If a process is declared inside `group ... [system:<name>]`, it inherits that system unless overridden locally.

Examples:
```
process syncer [SystemA] [label:"Sync Service"]
process enricher [SystemB] [changing] [label:"Customer Enricher"]
```


### State

State describes the change impact within the scope of the analysed initiative.

If omitted, the default state is unchanged/current.

| State | Meaning | Visual |
|---|---|---|
| `unchanged` or omitted | Existing element not materially changed by this initiative | solid border |
| `new` | New element introduced by this initiative | dotted border |
| `changing` | Existing element modified by this initiative | dashed border |
| `decommissioned` | Existing element removed or retired by this initiative | X marker |

### Connections
```
connect <from> ->  <to> : <relationship> [flow:<flow-type>]
connect <from> <-  <to> : <relationship> [flow:<flow-type>]
connect <from> <-> <to> : <relationship> [flow:<flow-type>]
```

The arrow direction represents the direction of information flow.

Supported relationship verbs:

| Verb | Meaning |
|---|---|
| `replicate` | Copy information without changing its business meaning |
| `publish` | Make information available as an event/message |
| `ingest` | Load information into a target store or platform |
| `derive` | Create new information by rules, calculation, classification, or analysis |
| `aggregate` | Combine or summarize records or sources |
| `enrich` | Add attributes to existing information from another source |
| `serve` | Provide information to a consuming process, app, channel, or user-facing component |

Examples:
```
connect crm    -> syncer : serve     [flow:sync]
connect syncer -> cdp    : replicate [flow:batch]
connect cdp    -> dw     : ingest    [flow:batch]
```

Avoid verbs such as query, call, request, and invoke in information-flow diagrams. Those belong in sequence or integration diagrams.

### Groups

```
group <id> "<display name>" [system:<system>] [corner:<corner>]
  <store/process/connect declarations>
end
```

Groups define ownership, responsibility, domain, system, or application boundaries.

Supported corner values:

```
upper-left | upper-right | lower-left | lower-right
```

Example:

```
group customer_domain "Customer Domain" [system:SystemA] [corner:upper-left]
  store crm [master]
  process syncer
  connect crm -> syncer : serve [flow:sync]
end
```

### Complete Example

```
@type     infoflow
@name     My Data Landscape
@version  1.0
@author   Team
@theme    dark
@size     a4
@legend   on

@location-types
  master blue
  replica cyan
  derived green
  aggregate purple
  golden orange
  reference grey
  consumer grey

@systems
  SystemA blue
  SystemB teal

@flow-types
  sync solid
  async dashed
  batch thick

group customer_domain "Customer Domain" [system:SystemA] [corner:upper-left]
  store crm [master]
  store cdp [replica] [changing] [label:"Customer Data Platform"]
  process syncer [label:"Sync Service"]
  connect crm -> syncer : serve [flow:sync]
  connect syncer -> cdp : replicate [flow:batch]
end

store analytics_dw [aggregate] [new] [label:"Analytics DW"]
process segment_job [SystemB] [changing] [label:"Segment Job"]
connect cdp -> analytics_dw : ingest [flow:batch]
connect analytics_dw -> segment_job : derive [flow:async]

```

### Semantic rules

1. The arrow direction shows the direction of information flow.
2. `sync`, `async`, and `batch` describe the movement mode.
3. Store role describes the information role of the store, not the technology type.
4. State describes change impact in the current initiative.
5. Detailed field mappings, validation rules, transformations, filters, and ownership details belong in the companion Information Flow Catalogue.

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
