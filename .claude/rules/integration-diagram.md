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
- Metadata directives: `@name`, `@version`, `@date`, `@author`, `@orientation`, `@theme`, `@position`, `@location-types`, `@flow-types`
- `@theme` supported — valid values: `dark`, `light`, `tokyo`
- `@position` lines written by Save; read back to restore layout

---

## Element Syntax

```
system    <id>  [<platform>]  [<state>]  [placement:below]
database  <id>  [<platform>]  [<state>]  [placement:inside]
queue     <id>  [<platform>]  [<state>]  [placement:inside]
```

- `<id>` — unique identifier, used in `connect` lines
- `[<platform>]` — required; one of: `aws`, `azure`, `on-prem`, `gcp`, `oracle`
- `[<state>]` — optional; one of: `new`, `changing`, `decommissioned`; absent = current
- `[placement:inside]` / `[placement:below]` — optional label placement override

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
connect  <from>  ->   <to>  : <protocol> [flow:<type>]
connect  <from>  <->  <to>  : <protocol> [flow:<type>]
```

- `->` unidirectional; `<->` bidirectional
- `<protocol>` free-form text label (REST, SQS, SOAP, Kafka, SFTP, etc.)
- `[flow:<type>]` optional visual metadata; explicit values must be declared in `@flow-types` or use built-ins `sync`, `async`, `batch`
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
| on-prem | `#91A3B0` | `#AAB9C3` | `#6C808C` | `#585b70` |
| gcp | `#34A853` | `#46C166` | `#267D3E` | `#585b70` |
| oracle | `#C74634` | `#E05A45` | `#963428` | `#585b70` |

**light:** Deeper versions of the above for readability on light canvas.

**tokyo (neon):**
| Platform | current | new | changing | decommissioned |
|---|---|---|---|---|
| aws | `#FF6600` | `#FF8C1A` | `#803300` | `#2a2a3a` |
| azure | `#00BFFF` | `#40CFFF` | `#006680` | `#2a2a3a` |
| on-prem | `#B0C8D8` | `#C8DDE8` | `#6A8899` | `#2a2a3a` |
| gcp | `#00FF7F` | `#40FFAA` | `#007A3D` | `#2a2a3a` |
| oracle | `#FF1744` | `#FF5252` | `#800020` | `#2a2a3a` |

Tokyo canvas background: `#0d0d14`. Glow: `feGaussianBlur stdDeviation=3`.

### Border Styles

| State | stroke-width | stroke-dasharray | fill-opacity |
|---|---|---|---|
| current | 2px | solid | 1.0 |
| new | 4px | solid | 1.0 |
| changing | 2px | `6,4` | **0.5** |
| decommissioned | 2px | `2,4` | 1.0 |

`changing` elements render at 50% fill-opacity — the platform colour is unchanged but appears semi-transparent, signalling in-flight work without losing platform identity. This is implemented in `getBorderStyle()` in `src/id/shapes.ts` via the `fillOpacity` field on `BorderStyle`.

### Arrow Styles

| Connection type | Arrowhead |
|---|---|
| Either endpoint is a `queue` | Open arrowhead |
| All other connections | Closed/filled arrowhead |

### Flow Styles

Declared with:

```
@flow-types
  sync solid
  async dashed
  batch thick
```

| Flow style | Line |
|---|---|
| `solid` | Normal solid line |
| `dashed` | Dashed line |
| `thick` | Thick solid line |

---

## Legend Box

Rendered automatically in the **upper-right corner** of the page area. Present only in ID diagrams. Also lists flow types used by `model.connections`.

- Scans `model.elements` for unique `(platform, state)` combinations actually in use — does not show unused combinations
- Each row: a small swatch rect (22×14px, rx=2) using the correct platform fill, `fill-opacity`, and border style, followed by a text label (`aws`, `azure · changing`, etc.)
- Sorted by platform order then state order for consistent layout
- Header: `Legend` in italic at the top
- Background and text colours from `theme.metaBox` — same palette as the metadata box
- **Draggable** — `attachLegendBoxDrag()` exported from `id/renderer.ts`, called from `main.ts`
- Position persisted via `@position __legend__ x y` alongside element positions
- If no elements are in the model, the legend box is not rendered

## Layout (`src/id-layout.ts`)

Simple grid: 4 columns, 220px horizontal spacing, 180px vertical spacing, starting at (200, 220). Honours `@position` overrides.

---

## Drag (`src/id-renderer.ts` — `attachIdDrag`)

Uses `data-id` attribute lookup instead of D3 data binding (elements are appended imperatively, not via `.data().join()`). Updates `el.x`/`el.y` in the live model, then calls `idRedrawConnections`.

---

## Data Model (`src/types.ts`)

```typescript
type Platform    = 'aws' | 'azure' | 'on-prem' | 'gcp' | 'oracle';
type IDState     = 'current' | 'new' | 'changing' | 'decommissioned';
type Direction   = 'unidirectional' | 'bidirectional';
type LabelPos    = 'inside' | 'below';
type LabelCorner = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

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

interface IDGroup {
  kind:        'group';
  id:          string;
  label:       string;
  members:     string[];       // element ids in declaration order
  labelCorner: LabelCorner;
}

interface IDModel {
  meta:            ModelMeta;   // meta.diagramType === 'id'
  elements:        IDElement[];
  connections:     IDConnection[];
  groups:          IDGroup[];
  savedPositions:  Record<string, Position>;
}
```

---

## Groupings

Named boundary rectangles drawn behind their member elements.

### Syntax

```
group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]
  system/database/queue declarations...
end
```

- `<id>` — unique identifier (no spaces)
- `<label>` — display text (everything between id and first `[`); defaults to id if omitted
- `[corner:*]` — corner for the label; default `upper-right`
- Elements declared inside the block are added to the group's `members` list
- Groups cannot be nested
- An element can belong to at most one group
- `end` without a matching `group` is a `ParseError`
- A `group` not closed before EOF is a post-parse `ParseError`

### Rendering

- A dashed rounded rectangle (`rx=8`, `stroke-dasharray: 8,4`) drawn **behind** elements and connections
- Label rendered in the specified corner in italic `Courier New` at 12px
- All colours from `theme.id.group` — no hardcoded values in `id-renderer.ts`
- Group rect is derived from the bounding box of member elements + `GROUP_PADDING=40` on all sides

### Drag

`attachGroupDrag` (exported from `id-renderer.ts`, called from `main.ts`) attaches a D3 drag handler to `g.id-group` elements. Dragging applies `event.dx`/`event.dy` to every member element, updates `model.savedPositions` for each, updates member transforms, then calls `idRedrawConnections` (which also calls `updateGroupRects`).

### Layout

Group members are placed contiguously in the grid. If a group would spill across a row boundary, it is pushed to the next row so all members sit in a single horizontal band. Ungrouped elements follow after all groups.

---

## Fixtures

| File | Purpose |
|---|---|
| `fixtures/integration_example.id` | Minimal — no metadata overrides, all defaults |
| `fixtures/e-commerce-platform.id` | Full — all metadata, platforms, states, groups, placement overrides |
