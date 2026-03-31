# Integration Diagram (`@type id`)

> **Status: implemented.**

---

## Purpose

Allows IT Architects to draw integration landscape diagrams showing systems, databases, and queues, how they connect, and their lifecycle state (current, new, changing, decommissioned).

---

## Parser Rules (`src/id-parser.ts`)

- `@type id` activates the ID parser via dispatch in `parser.ts`
- `@type` absent defaults to `sd` — no breaking change to existing files
- Unknown `@type` values produce a `ParseError` listing valid types (`sd`, `id`)
- Line-by-line parsing, same approach as the SD parser
- Keywords: `system`, `database`, `queue`, `connect`, `group` (reserved, v2 only)
- Metadata directives: `@name`, `@version`, `@date`, `@author`, `@orientation`, `@theme`, `@position`
- `@theme` supported — valid values: `dark`, `light`, `tokyo`
- `@position` lines written by Save; read back to restore layout

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

### Default label placement

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

## SVG Rendering (`src/id-renderer.ts`)

### Shapes

| Element | SVG |
|---|---|
| `system` | `<rect>` — 140×60px, rx=4 |
| `database` | Vertical drum — rect body + two ellipse caps (80px wide, ~84px tall) |
| `queue` | Horizontal cylinder — rect body + two ellipse caps (~130px wide, 40px tall) |

### Theme System

All colours come from `getTheme(model.meta.theme).id` — **no hardcoded colour values in `id-renderer.ts`**.

The `IDTheme` interface (defined in `themes.ts`) has slots for:
- `canvasBg`, `borderStroke`, `platformColoredBorder`, `connStroke`
- `labelInside`, `labelBelow`, `protocolLabel`
- `glow` — when true, applies SVG `feGaussianBlur` glow filter to all elements
- `platforms` — per-platform fill colours for all four states
- `metaBox`

When `platformColoredBorder` is true (tokyo), the border stroke matches the element's platform colour, enhancing the neon outline effect.

### Platform Colours per Theme

**dark:**
| Platform | current | new | changing | decommissioned |
|---|---|---|---|---|
| aws | `#FF9900` | `#FFB84D` | `#CC7A00` | `#585b70` |
| azure | `#0078D4` | `#2B9AF3` | `#005EA6` | `#585b70` |
| on-prem | `#6B7C3A` | `#8A9E4A` | `#4E5B2A` | `#585b70` |
| gcp | `#34A853` | `#46C166` | `#267D3E` | `#585b70` |
| oracle | `#C74634` | `#E05A45` | `#963428` | `#585b70` |

**light:** Deeper versions of the above for readability on light canvas.

**tokyo (neon):**
| Platform | current | new | changing | decommissioned |
|---|---|---|---|---|
| aws | `#FF6600` | `#FF8C1A` | `#803300` | `#2a2a3a` |
| azure | `#00BFFF` | `#40CFFF` | `#006680` | `#2a2a3a` |
| on-prem | `#ADFF2F` | `#C8FF5A` | `#5C8A00` | `#2a2a3a` |
| gcp | `#00FF7F` | `#40FFAA` | `#007A3D` | `#2a2a3a` |
| oracle | `#FF1744` | `#FF5252` | `#800020` | `#2a2a3a` |

Tokyo canvas background: `#0d0d14`. Glow: `feGaussianBlur stdDeviation=3`.

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

---

## Layout (`src/id-layout.ts`)

Simple grid: 4 columns, 220px horizontal spacing, 180px vertical spacing, starting at (200, 220). Honours `@position` overrides.

---

## Drag (`src/id-renderer.ts` — `attachIdDrag`)

Uses `data-id` attribute lookup instead of D3 data binding (elements are appended imperatively, not via `.data().join()`). Updates `el.x`/`el.y` in the live model, then calls `idRedrawConnections`.

---

## Data Model (`src/types.ts`)

```typescript
type Platform  = 'aws' | 'azure' | 'on-prem' | 'gcp' | 'oracle';
type IDState   = 'current' | 'new' | 'changing' | 'decommissioned';
type Direction = 'unidirectional' | 'bidirectional';
type LabelPos  = 'inside' | 'below';

interface IDElement extends Position {
  kind:     'system' | 'database' | 'queue';
  id:       string;
  label:    string;
  platform: Platform;
  state:    IDState;
  labelPos: LabelPos;
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
  meta:            ModelMeta;   // meta.diagramType === 'id'
  elements:        IDElement[];
  connections:     IDConnection[];
  savedPositions:  Record<string, Position>;
}
```

---

## Groupings — v2

Reserved syntax, not parsed in v1:

```
group start "Group Name"
group end "Group Name"
```

In v1, `group` lines produce a `ParseError`: *"Groupings are not yet supported — planned for v2"*.

---

## Fixtures

| File | Purpose |
|---|---|
| `fixtures/integration_example.id` | E-commerce platform — all element types, states, and connection styles |
