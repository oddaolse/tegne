# Information Flow Diagram (`@type infoflow`)

> **Status: implemented.**

---

## Purpose

Allows Data Architects to draw information flow diagrams showing data stores, their roles in the data landscape, and how data moves between them.

---

## Parser Rules (`src/iff/parser.ts`)

- `@type infoflow` activates the IFF parser via dispatch in `parser.ts`
- Line-by-line parsing, same approach as the SD and ID parsers
- Keywords: `store`, `link`, `group`, `end`
- Metadata directives: `@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation`, `@size`, `@position`, `@legend`, `@show-ids`
- `@theme` supported — valid values: `dark`, `light`, `tokyo`
- `@legend on|off` — controls legend box visibility (default: on)
- `@position` lines written by Save; read back to restore layout

---

## Element Syntax

### Store

```
store <id> [<role>] [<state>] [label:"Human Readable Name"]
```

- `<id>` — unique identifier, used in `link` lines
- `[<role>]` — **required**; one of: `master`, `replica`, `derived`, `aggregate`, `golden`, `reference`, `consumer`
- `[<state>]` — optional; one of: `new`, `changing`, `decommissioned`; absent = `current`
- `[label:"..."]` — optional label override; defaults to id

### Roles

| Role | Purpose |
|---|---|
| `master` | Authoritative source of truth |
| `replica` | Read-only copy of a master |
| `derived` | Computed/transformed from other stores |
| `aggregate` | Combines data from multiple sources |
| `golden` | Curated, trusted reference data |
| `reference` | Static/slowly-changing lookup data |
| `consumer` | End-point that consumes data |

---

## Link Syntax

```
link <from> -> <to> : <relationship> [<transport>]
```

- `->` unidirectional data flow
- `<from>` and `<to>` must resolve to a declared store id; unknown ids produce a `ParseError`
- `<relationship>` — **required**; one of: `replicate`, `publish`, `ingest`, `derive`, `aggregate`, `enrich`, `merge`, `serve`
- `[<transport>]` — optional transport mechanism (e.g., `[Kafka]`, `[API]`, `[SFTP]`)

### Relationships

| Relationship | Meaning |
|---|---|
| `replicate` | Copy data for redundancy or read scaling |
| `publish` | Push data to subscribers |
| `ingest` | Pull data from external sources |
| `derive` | Transform/compute new data |
| `aggregate` | Combine multiple sources |
| `enrich` | Add attributes from reference data |
| `merge` | Consolidate overlapping records |
| `serve` | Provide data to consuming applications |

---

## Groupings

Named boundary rectangles drawn behind their member stores.

### Syntax

```
group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]
  store declarations...
end
```

- `<id>` — unique identifier (no spaces)
- `<label>` — display text (everything between id and first `[`); defaults to id if omitted
- `[corner:*]` — corner for the label; default `upper-right`
- Stores declared inside the block are added to the group's `members` list
- Groups cannot be nested
- A store can belong to at most one group
- `end` without a matching `group` is a `ParseError`
- A `group` not closed before EOF is a post-parse `ParseError`

---

## SVG Rendering (`src/iff/renderer.ts`)

### Shapes

| Element | SVG |
|---|---|
| `store` | `<rect>` — 120×50px, rx=4 |

### Theme System

All colours come from `getTheme(model.meta.theme).iff` — **no hardcoded colour values in `iff-renderer.ts`**.

The `IFFTheme` interface (defined in `themes.ts`) has slots for:
- `canvasBg`, `borderStroke`, `connStroke`, `labelText`
- `glow` — when true, applies SVG `feGaussianBlur` glow filter to all elements
- `roles` — per-role fill colours
- `metaBox`, `group`

### Role Colours per Theme

**dark:**
| Role | Colour |
|---|---|
| master | `#2563EB` |
| replica | `#1E3A8A` |
| derived | `#16A34A` |
| aggregate | `#7C3AED` |
| golden | `#D97706` |
| reference | `#4B6A8A` |
| consumer | `#374151` |

**light:** Adjusted versions for readability on light canvas.

**tokyo (neon):**
| Role | Colour |
|---|---|
| master | `#00BFFF` |
| replica | `#005F99` |
| derived | `#00FF7F` |
| aggregate | `#BF00FF` |
| golden | `#FFD700` |
| reference | `#708090` |
| consumer | `#3A3A5C` |

Tokyo canvas background: `#0d0d14`. Glow: `feGaussianBlur stdDeviation=3`.

### Border Styles

| State | stroke-width | stroke-dasharray | fill-opacity |
|---|---|---|---|
| current | 2px | solid | 1.0 |
| new | 4px | solid | 1.0 |
| changing | 2px | `6,4` | **0.5** |
| decommissioned | 2px | `2,4` | 1.0 |

### Store Rendering

- Rectangle filled with role colour
- Label centred inside
- Role badge (italic) rendered below the store
- Optional `[id]` badge below role when `@show-ids on`

---

## Legend Box

Rendered automatically in the **upper-right corner** of the page area (unless `@legend off`).

- Scans `model.stores` for unique roles actually in use — does not show unused roles
- Each row: a small swatch rect using the correct role fill, followed by the role name
- Sorted by role order for consistent layout
- Header: `Legend` in italic at the top
- Background and text colours from `theme.metaBox`
- **Draggable** — position persisted via `@position __legend__ x y`

---

## Layout (`src/iff/layout.ts`)

Simple grid: 4 columns, 200px horizontal spacing, 160px vertical spacing. Honours `@position` overrides.

---

## Drag

- `attachIffDrag` — stores draggable; links redraw on move
- `attachIffGroupDrag` — dragging a group moves all member stores
- `attachIffLegendBoxDrag` — legend box draggable; position persisted as `@position __legend__`

---

## Data Model (`src/iff/types.ts`)

```typescript
type IFFRole         = 'master' | 'replica' | 'derived' | 'aggregate' | 'golden' | 'reference' | 'consumer';
type IFFRelationship = 'replicate' | 'publish' | 'ingest' | 'derive' | 'aggregate' | 'enrich' | 'merge' | 'serve';
type IFFState        = 'current' | 'new' | 'changing' | 'decommissioned';
type IFFLabelCorner  = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

interface IFFStore extends Position {
  kind:  'store';
  id:    string;
  label: string;
  role:  IFFRole;
  state: IFFState;
}

interface IFFLink {
  kind:         'link';
  id:           string;
  from:         string;
  to:           string;
  relationship: IFFRelationship;
  transport?:   string;
}

interface IFFGroup {
  kind:        'group';
  id:          string;
  label:       string;
  members:     string[];
  labelCorner: IFFLabelCorner;
}

interface IFFModel {
  meta:           ModelMeta;
  stores:         IFFStore[];
  links:          IFFLink[];
  groups:         IFFGroup[];
  savedPositions: Record<string, Position>;
}
```

---

## Fixtures

| File | Purpose |
|---|---|
| `fixtures/customer_information.iff` | Customer data landscape — all 7 roles, 2 groups |
