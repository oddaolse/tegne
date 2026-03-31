# Integration Diagram (`@type id`)

> **Status: planned — not yet implemented.**
> This file defines the specification to build from when implementation begins.

---

## Purpose

Allows IT Architects to draw integration landscape diagrams showing systems, databases, and queues, how they connect, and their lifecycle state (current, new, changing, decommissioned).

---

## Parser Rules

- `@type id` activates the integration diagram parser
- `@type` absent defaults to `sd` — no breaking change to existing files
- Unknown `@type` values produce a `ParseError` listing valid types (`sd`, `id`)
- Line-by-line parsing, same approach as the SD parser
- Keywords: `system`, `database`, `queue`, `connect`, `group` (reserved, v2 only)
- Metadata directives shared with SD: `@name`, `@version`, `@date`, `@author`, `@orientation`
- `@theme` does **not** apply to integration diagrams — colours are fixed by platform

---

## Element Syntax

```
system    <id>  [<platform>]  [<state>]  [label:below]
database  <id>  [<platform>]  [<state>]  [label:inside]
queue     <id>  [<platform>]  [<state>]  [label:inside]
```

- `<id>` — unique identifier, used in `connect` lines
- `[<platform>]` — required; one of: `aws`, `azure`, `on-prem`, `gcp`, `oracle`
- `[<state>]` — optional; one of: `new`, `changing`, `decommissioned`; absent = current
- `[label:inside]` / `[label:below]` — optional label placement override

### Default label placement (no override needed in most cases)

| Element | Default |
|---|---|
| `system` | Inside the rectangle |
| `database` | Below the drum |
| `queue` | Below the cylinder |

---

## Connection Syntax

```
connect  <from>  ->   <to>  : <protocol>
connect  <from>  <->  <to>  : <protocol>
```

- `->` unidirectional; `<->` bidirectional
- `<protocol>` free-form text label (REST, SQS, SOAP, Kafka, SFTP, etc.)
- `<from>` and `<to>` must resolve to a declared element id; unknown ids produce a `ParseError`

---

## SVG Rendering

### Shapes

| Element | SVG |
|---|---|
| `system` | `<rect>` — 140×60px, rx=4 |
| `database` | Vertical drum — two ellipses + rectangle body, approx 80×90px |
| `queue` | Horizontal cylinder — two semicircles + rectangle body, approx 120×50px |

### Platform Colours

| Platform | Fill (current) | Fill (changing) | Fill (new — saturated) |
|---|---|---|---|
| `aws` | `#FF9900` | `#CC7A00` at 60% opacity | `#FFB347` |
| `azure` | `#0078D4` | `#005EA6` at 60% opacity | `#2B9AF3` |
| `on-prem` | `#6B7C3A` | `#4E5B2A` at 60% opacity | `#8A9E4A` |
| `gcp` | `#34A853` | `#267D3E` at 60% opacity | `#46C166` |
| `oracle` | `#C74634` | `#963428` at 60% opacity | `#E05A45` |

Decommissioned fill: `#9E9E9E` (grey) regardless of platform.

### Border Styles

| State | stroke-width | stroke-dasharray |
|---|---|---|
| current | 2px | solid |
| new | 4px | solid |
| changing | 2px | `6,4` |
| decommissioned | 2px | `2,4` |

### Arrow Styles

| Connection type | Arrowhead |
|---|---|
| Either endpoint is a `queue` | Open arrowhead |
| All other connections | Closed/filled arrowhead |

### Connection Line

- Straight line between element edges (not bezier)
- Protocol label centred on the line, small font, theme-neutral colour
- Bidirectional: arrowheads at both ends

---

## Data Model (to be added to `types.ts`)

```typescript
type Platform  = 'aws' | 'azure' | 'on-prem' | 'gcp' | 'oracle';
type IDState   = 'current' | 'new' | 'changing' | 'decommissioned';
type Direction = 'unidirectional' | 'bidirectional';
type LabelPos  = 'inside' | 'below';

interface IDElement extends Position {
  id:        string;
  kind:      'system' | 'database' | 'queue';
  platform:  Platform;
  state:     IDState;
  labelPos:  LabelPos;
}

interface IDConnection {
  kind:      'connection';
  id:        string;
  from:      string;
  to:        string;
  direction: Direction;
  protocol:  string;
}

interface IDModel {
  meta:       ModelMeta;
  elements:   IDElement[];
  connections: IDConnection[];
  savedPositions: Record<string, Position>;
}
```

---

## Groupings — v2

Reserved syntax, not parsed in v1:

```
group start "Group Name"
group end "Group Name"
```

In v1, `group` lines produce a `ParseError` with message: *"Groupings are not yet supported — planned for v2"*.

---

## Fixtures (to be created)

| File | Purpose |
|---|---|
| `fixtures/integration_example.id` | Simple integration diagram covering all element types and states |
