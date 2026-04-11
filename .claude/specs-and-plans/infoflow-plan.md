# Implementation Plan: Information Flow Diagram (`@type infoflow`)

## Status legend
- `[ ]` planned
- `[x]` done

---

## Steps

### 1. Types — `src/iff/types.ts`
`[x]` Create `src/iff/types.ts` with:
- `IFFRole` type: `'master' | 'replica' | 'derived' | 'aggregate' | 'golden' | 'reference' | 'consumer'`
- `IFFRelationship` type: `'replicate' | 'publish' | 'ingest' | 'derive' | 'aggregate' | 'enrich' | 'merge' | 'serve'`
- `IFFState` type: `'current' | 'new' | 'changing' | 'decommissioned'`
- `IFFLabelCorner` type (reuse same values as ID: `'upper-left' | 'upper-right' | 'lower-left' | 'lower-right'`)
- `IFFStore` interface: `{ kind: 'store'; id: string; label: string; role: IFFRole; state: IFFState; x: number; y: number }`
- `IFFLink` interface: `{ kind: 'link'; id: string; from: string; to: string; relationship: IFFRelationship }`
- `IFFGroup` interface: `{ kind: 'group'; id: string; label: string; members: string[]; labelCorner: IFFLabelCorner }`
- `IFFModel` interface: `{ meta: ModelMeta; stores: IFFStore[]; links: IFFLink[]; groups: IFFGroup[]; savedPositions: Record<string, Position> }`
- Re-export `Position` from `'../types'`

---

### 2. Theme slots — `src/themes.ts`
`[x]` Add `IFFTheme` interface with slots:
- `canvasBg`, `borderStroke`, `connStroke`, `labelText`, `metaBox`
- `roles`: `Record<IFFRole, string>` (one fill colour per role)
- `glow`: boolean (tokyo only)

`[x]` Add IFF colour values to all three themes (dark, light, tokyo) using agreed hex values:

| Role | Dark | Light | Tokyo |
|---|---|---|---|
| master | `#2563EB` | `#1D4ED8` | `#00BFFF` |
| replica | `#1E3A8A` | `#3B82F6` | `#005F99` |
| derived | `#16A34A` | `#15803D` | `#00FF7F` |
| aggregate | `#7C3AED` | `#6D28D9` | `#BF00FF` |
| golden | `#D97706` | `#B45309` | `#FFD700` |
| reference | `#4B6A8A` | `#64748B` | `#708090` |
| consumer | `#374151` | `#9CA3AF` | `#3A3A5C` |

---

### 3. Shared types — `src/types.ts`
`[x]` Add `'infoflow'` to `DiagramType` union
`[x]` Import `IFFModel` from `'./iff/types'` and add to `ParseResult` model union
`[x]` Re-export all IFF types from the bottom of `src/types.ts`

---

### 4. Parser — `src/iff/parser.ts`
`[x]` Implement `parseIFF(lines: string[]): ParseResult`:
- Metadata directives: `@type`, `@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation`, `@size`, `@position`
- `store <id> [<role>] [<state>] [label:"..."]` — parse role from brackets, optional state, optional label override
- `link <from> -> <to> : <relationship>` — validate relationship is a known keyword
- `group <id> <label> [label:corner] ... end` — same pattern as ID parser
- Post-parse validation: unknown from/to ids in links, unclosed groups, elements in multiple groups

---

### 5. Layout — `src/iff/layout.ts`
`[x]` Implement `iffLayout(model: IFFModel): void`:
- Grid layout: 4 columns, 220px horizontal spacing, 180px vertical spacing, starting at (200, 220)
- Group members placed in contiguous row-aligned blocks (same logic as ID layout)
- Honour `@position` overrides

---

### 6. Shapes — `src/iff/shapes.ts`
`[x]` Implement:
- `STORE_W = 140`, `STORE_H = 60` constants
- `elementBounds(store: IFFStore): { hw: number; hh: number }`
- `getBorderStyle(state: IFFState): BorderStyle` (same rules as ID: solid/thick/dotted/decommissioned)
- `drawStore(g, fill, border, stroke)` — rounded rect (rx=8), label inside

---

### 7. Renderer — `src/iff/renderer.ts`
`[x]` Implement:
- `iffRender(svg, model)` — clears SVG, draws background, groups, links, stores, meta box
- `iffRedrawLinks(svg, model)` — removes and redraws link lines; raises nodes and meta box
- `attachIffDrag(svg, model, onDragEnd)` — drag for individual stores (same pattern as ID)
- `attachIffGroupDrag(svg, model, onDragEnd)` — drag for group backgrounds
- `drawMetaBox` — same pattern as SD/ID, reads `savedPositions['__meta__']`
- Link rendering: straight lines with closed arrowhead; relationship label at midpoint
- Group rendering: dashed rounded rect with label in corner (same as ID)
- All colours from `getTheme(model.meta.theme).iff`

---

### 8. Update dispatcher — `src/parser.ts`
`[x]` Add `import { parseIFF } from './iff/parser'`
`[x]` Add `if (value === 'infoflow') return parseIFF(lines)` in the pre-scan loop

---

### 9. Update `src/main.ts`
`[x]` Import `iffLayout` from `'./iff/layout'`
`[x]` Import `iffRender`, `attachIffDrag`, `attachIffGroupDrag` from `'./iff/renderer'`
`[x]` Add IFF branch in `runRender()` alongside SD and ID branches
`[x]` Add IFF branch in `updateEditorPositions()` to write `@position` lines for stores
`[x]` Update save button handler to call `saveIFF` for infoflow models

---

### 10. Update `src/export.ts`
`[x]` Implement `saveIFF(dslText: string, model: IFFModel): Promise<void>`:
- Strip existing `@position` lines
- Append `@position <id> x y` for each store
- Append `@position __meta__ x y` if present
- Save with `.iff` extension, suggested filename from `@name`

---

### 11. Update `index.html`
`[x]` Add `.iff` to the file input `accept` attribute: `accept=".sd,.id,.iff"`

---

### 12. Create fixture — `fixtures/customer_information.iff`
`[x]` Write fixture based on the example in the spec (Customer Information Landscape):
- Two groups: Customer Domain, Analytics
- 6 stores covering all 7 roles
- 7 links covering varied relationship types
- `@position` directives so it renders well on first load

---

### 13. Tests — `tests/iff-parser.test.ts`
`[x]` Positive tests:
- Dispatches `@type infoflow` correctly
- Parses `store` with role
- Parses all 7 roles
- Parses optional state (`[new]`, `[changing]`, `[decommissioned]`)
- Parses optional label override
- Parses `link` with all relationship types
- Parses `@position` directives
- Parses `group ... end` blocks
- Fixture parses without errors

`[x]` Negative tests:
- Store missing role
- Store with unknown role
- Link with unknown relationship
- Link with unknown from/to id
- Nested group error
- Unclosed group error
- `end` without group error
- Unknown directive error

---

### 14. Update `CLAUDE.md`
`[x]` Add `infoflow` row to the diagram types table
`[x]` Add IFF to the Definition of Done checklist

---

### 15. Update `requirements.md`
`[x]` Add `## Information Flow Diagram (@type infoflow)` chapter with:
- Purpose
- Element types (store, link, group)
- Roles table
- Relationships table
- Lifecycle states
- DSL example
