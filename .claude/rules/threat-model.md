# Threat Model (`@type tm`)

> **Status: implemented.**

---

## Purpose

Allows Security Architects to create STRIDE-based threat models that reference elements from other diagrams (ID, IFF), define trust boundaries, data flows, threats, and mitigations.

---

## Parser Rules (`src/tm/parser.ts`)

- `@type tm` activates the TM parser via dispatch in `parser.ts`
- Line-by-line parsing, same approach as other parsers
- Keywords: `ref`, `boundary`, `end`, `flow`, `threat`, `mitigate`
- Metadata directives: `@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation`, `@size`, `@position`, `@ref`, `@show-ids`
- `@ref <filename>` — declares referenced diagram files (loaded into registry for label/type resolution)
- `@theme` supported — valid values: `dark`, `light`, `tokyo`
- `@position` lines written by Save; read back to restore layout

---

## Element Syntax

### Ref (Ghost Reference)

```
ref <id>
```

- `<id>` — references an element id declared in another diagram (via `@ref`)
- Renders as a dashed "ghost" box
- If found in registry: shows resolved label and a source-type badge (`id·system`, `iff·store`, etc.)
- If inside a `boundary` block: added to boundary's members list

### Boundary (Trust Boundary)

```
boundary <id> [label:"Human Readable Name"]
  ref declarations...
end
```

- `<id>` — unique identifier (no spaces)
- `[label:"..."]` — optional display text; defaults to id
- Refs declared inside the block are added to the boundary's `members` list
- Boundaries cannot be nested
- `end` without a matching `boundary` is a `ParseError`
- A `boundary` not closed before EOF is a post-parse `ParseError`

### Flow

```
flow <id> <from> -> <to> [label:"description"]
```

- `<id>` — unique flow identifier (used as threat target)
- `<from>` and `<to>` — ref ids
- `->` unidirectional data flow
- `[label:"..."]` — optional flow description

### Threat

```
threat <id> [stride:S|T|R|I|D|E] <targetId> : "description"
```

- `<id>` — unique threat identifier (used by `mitigate`)
- `[stride:X]` — **required**; STRIDE category (S, T, R, I, D, or E)
- `<targetId>` — must be a declared ref id or flow id
- `: "description"` — threat description (quotes optional but recommended)

### Mitigate

```
mitigate <threatId> : "description"
```

- `<threatId>` — must match a declared threat id
- `: "description"` — mitigation description

---

## STRIDE Categories

| Letter | Category | Meaning |
|---|---|---|
| S | Spoofing | Impersonating something or someone else |
| T | Tampering | Modifying data or code |
| R | Repudiation | Claiming to have not performed an action |
| I | Information Disclosure | Exposing information to unauthorised parties |
| D | Denial of Service | Denying or degrading service to users |
| E | Elevation of Privilege | Gaining capabilities without proper authorisation |

---

## SVG Rendering (`src/tm/renderer.ts`)

### Shapes

| Element | SVG |
|---|---|
| `ref` | `<rect>` — 130×50px, rx=4, dashed stroke, 70% fill-opacity |
| `boundary` | `<rect>` — bounding box + padding, rx=10, dashed stroke, 60% fill-opacity |
| `flow` | `<line>` with arrow marker |
| `threat` | `<circle>` badge — r=11px, STRIDE colour fill, letter label |

### Theme System

All colours come from `getTheme(model.meta.theme).tm` — **no hardcoded colour values in `tm-renderer.ts`**.

The `TMTheme` interface (defined in `themes.ts`) has slots for:
- `canvasBg`, `boundaryFill`, `boundaryStroke`, `connStroke`
- `refFill`, `refStroke`, `refLabelText`
- `stride` — per-category colours (S, T, R, I, D, E)
- `metaBox`

### STRIDE Colours per Theme

**dark:**
| Category | Colour |
|---|---|
| S | `#cc3333` |
| T | `#e06c00` |
| R | `#d4a017` |
| I | `#7c3aed` |
| D | `#0077cc` |
| E | `#2a7a2a` |

**light:** Adjusted for readability on light canvas.

**tokyo (neon):**
| Category | Colour |
|---|---|
| S | `#FF1744` |
| T | `#FF6600` |
| R | `#FFD700` |
| I | `#BF00FF` |
| D | `#00BFFF` |
| E | `#00FF7F` |

### Threat Badge Rendering

- Coloured circle badge at target position
- Multiple threats on same target: horizontally offset
- Mitigated threats: 35% fill-opacity + dashed stroke
- White letter label centred in badge
- Tooltip shows `threat.id: threat.description`

---

## STRIDE Key Box

Rendered automatically in the **upper-right corner** of the page area.

- Shows only STRIDE categories that have threats in the model
- Each row: coloured circle badge + full category name
- Header: `STRIDE` in italic
- Background and text colours from `theme.metaBox`
- **Draggable** — position persisted via `@position __stride_key__ x y`

---

## Mitigations Panel

Rendered automatically in the **bottom-left corner** of the page area (only if mitigations exist).

- Lists all mitigations with their threat id and description
- Each row: small colour swatch (matching threat's STRIDE category) + text
- Header: `Mitigations` in italic
- **Draggable** — position persisted via `@position __mitigations__ x y`

---

## Registry Integration

The TM diagram uses `src/project/registry.ts` to resolve ref ids:

1. Files listed in `@ref` directives are loaded
2. Their elements are added to an `IDRegistry` (maps id → element info)
3. When rendering a `ref`, the registry provides:
   - Resolved label (from source element)
   - Source type badge (`id·system`, `iff·store`, etc.)

If a ref id is not found in the registry, it renders with just the id as label.

---

## Layout (`src/tm/layout.ts`)

Simple grid: 4 columns, 200px horizontal spacing, 160px vertical spacing. Honours `@position` overrides.

---

## Drag

- `attachTmDrag` — refs draggable; flows, boundaries, and threat badges update on move
- `attachTmMetaBoxDrag` — meta box, STRIDE key, and mitigations panel all draggable; positions persisted

---

## Data Model (`src/tm/types.ts`)

```typescript
type StrideCategory = 'S' | 'T' | 'R' | 'I' | 'D' | 'E';

interface TMRef extends Position {
  kind: 'ref';
  id:   string;
}

interface TMBoundary {
  kind:    'boundary';
  id:      string;
  label:   string;
  members: string[];   // ref ids
}

interface TMFlow {
  kind:   'flow';
  id:     string;
  from:   string;
  to:     string;
  label?: string;
}

interface TMThreat {
  kind:        'threat';
  id:          string;
  stride:      StrideCategory;
  targetId:    string;   // flow id or ref id
  description: string;
}

interface TMMitigation {
  kind:        'mitigation';
  id:          string;
  threatId:    string;
  description: string;
}

interface TMModel {
  meta:           ModelMeta;
  refFiles:       string[];
  refs:           TMRef[];
  boundaries:     TMBoundary[];
  flows:          TMFlow[];
  threats:        TMThreat[];
  mitigations:    TMMitigation[];
  savedPositions: Record<string, Position>;
}
```

---

## Fixtures

| File | Purpose |
|---|---|
| `fixtures/threat_model_example.tm` | E-commerce threat model — all STRIDE categories; refs e-commerce-platform.id |
