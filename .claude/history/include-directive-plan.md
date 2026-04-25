# `@include` Directive Plan

## Goal

Add an `@include <filename>` directive to all four diagram types so that recurring "setup" — palettes, dictionaries, and default display preferences — can live in a shared file rather than being duplicated across every diagram. The host file owns its own nodes, links, and identity (`@name`, `@author`, etc.); included files contribute only definitions.

## Scope

- Same-type include only: `.sd ⇢ .sd`, `.id ⇢ .id`, `.iff ⇢ .iff`, `.tm ⇢ .tm`. Cross-type sharing remains the job of `@ref` (TM only).
- One level only. An included file may not itself contain `@include`.
- Included files must already be loaded in the active project (open via directory picker or `.tegne` manifest). Standalone single-file open with an unresolved include → parse error.
- Included files are normal diagram files. There is no separate "header" file format.

## Constraints Before Implementation

- `src/parser.ts` is a thin dispatcher. It does not currently see the project file map.
- Parsers in `src/sd|id|iff|tm/parser.ts` take only `lines: string[]` and have no access to other files.
- The project file map is built today via `src/project/loader.ts` and `src/project/registry.ts`. The registry is consumed at render time, not parse time.
- IFF is the only diagram with rich dictionary blocks (`@location-types`, `@systems`, `@flow-types`). SD/ID/TM only have shared metadata directives that could be defaulted.
- TM has `@ref` (a separate, registry-time mechanism) that must continue to work alongside `@include`.

## Design Decisions

### Syntax

```
@include <filename>
```

- `<filename>` resolves against the loaded project file map (same map that drives `@ref`).
- Multiple `@include` directives are allowed; merged in declaration order.
- Convention: place `@include` near the top of the file (with other directives). Parser does not enforce position.

### What Merges From The Included File

| Category | Behaviour |
|---|---|
| Dictionary blocks (`@location-types`, `@systems`, `@flow-types`) | **Additive merge.** Entries from included file appear first; locally-defined entries appear after. Duplicate name across files → `ParseError`. |
| Display defaults (`@theme`, `@orientation`, `@size`, `@legend`, `@show-ids`) | **Default-only.** Apply if and only if the host file has not set the value. Local always wins. |
| Identity (`@name`, `@version`, `@date`, `@author`) | **Never merged.** These belong to the host. |
| `@position` directives | **Never merged.** Positions are diagram-specific. |
| `@ref` (TM only) | **Additive merge.** Included refs are appended to host's `refFiles`. |
| `@include` | **Forbidden inside an included file** → `ParseError`. |
| Positional elements (`stock`, `cloud`, `flow`, `connector`, `aux`, `system`, `database`, `queue`, `connect`, `store`, `process`, `link`, `group`, `boundary`, `flow`, `threat`, `mitigate`, `ref`) | **Forbidden in included file** → `ParseError`. |

### Type Match

When resolving an include, the parser parses the target file and checks `meta.diagramType` matches the host's. Mismatch → `ParseError` (e.g. `@include cannot include diagram type "sd" into "infoflow"`).

### Mechanism: Parse-Time Injection

- `parse(dsl, includeFiles?)` accepts an optional `Map<string, string>` of filename → content.
- The dispatcher plumbs this through to each diagram parser.
- Each diagram parser gains an internal flag `includeMode: boolean`. In include mode:
  - Positional elements emit a `ParseError` ("not allowed in included file").
  - Nested `@include` emits a `ParseError`.
  - Identity, position, and host-only directives are ignored (or warned).
- When the host parser sees `@include foo.iff`, it:
  1. Looks up `foo.iff` in the file map. Missing → `ParseError`.
  2. Calls the matching parser with `includeMode=true` and an empty file map.
  3. Verifies the included file's diagram type matches the host's.
  4. Merges dictionary entries (with collision detection) and applies metadata defaults.
- All include processing happens before per-line validation needs the merged dictionaries — i.e. `@include` directives are resolved in a first pass, then the rest of the file parses against the merged state.

### Loading Plumbing

- `src/main.ts` already holds the loaded project file map when a directory or `.tegne` manifest is open.
- `parse()` gains an optional second argument; `main.ts` passes the map at parse time.
- For solo file open (no project), the map is empty; `@include` against any name fails with a clear "file not loaded; open project directory" message.

## Implementation Phases

### Phase 1: Dispatcher & Parser Plumbing

- Extend `parse(dsl: string, includeFiles?: Map<string,string>): ParseResult` in `src/parser.ts`.
- Add an internal options type passed through to each diagram parser:
  ```ts
  interface ParseOptions {
    includeFiles?: Map<string, string>;
    includeMode?: boolean;
  }
  ```
- Update each diagram parser's signature to accept `(lines, options?)`.
- All existing call sites pass nothing → no behaviour change.

Exit: TypeScript compiles, all existing tests pass.

### Phase 2: IFF `@include`

IFF first because it has the richest dictionary surface.

- Implement `@include` directive in `src/iff/parser.ts`.
- First pass scans for `@include` lines; resolves and parses each, then merges.
- Merge rules per the table above.
- Emit errors for: missing file, type mismatch, nested include, positional content in include.

Exit: Parser tests below pass.

### Phase 3: SD / ID / TM `@include`

- Add same directive to the other three parsers. Their merge surface is just display defaults (and `refFiles` for TM).
- Same error rules.

Exit: Parser tests for each pass.

### Phase 4: main.ts Wiring

- Identify where `parse()` is invoked in `src/main.ts`.
- When a project is loaded, pass the file map to `parse()`.
- When no project is loaded, pass `undefined`.

Exit: Manually loading an `.iff` whose `@include` targets a sibling file in the same opened directory renders correctly.

### Phase 5: Documentation & Help

- `.claude/specs/*.md` — add `@include` section to each spec.
- `.claude/rules/*.md` — note the cross-cutting rule once (probably in `architecture.md`).
- `index.html` Help panel — add `@include` row to syntax tables.
- `README.md` — short example.
- `.claude/requirements.md` — describe the user-visible behaviour.
- `CLAUDE.md` — add to the "When changing DSL syntax, update all of these" list if missing.

### Phase 6: Fixtures

- Add a small shared fixture per relevant diagram type, e.g.:
  - `fixtures/common-types.iff` — empty body, only `@location-types` / `@systems` / `@flow-types`.
  - One existing IFF fixture migrated to use `@include common-types.iff`.
- For SD/ID/TM: at least one fixture demonstrating `@include` with display defaults if practical; otherwise document that the IFF case is the canonical example and other diagrams support it for symmetry.

## Testing Strategy

### Parser Tests (per diagram, IFF first)

- `@include` resolves against provided file map; entries are present in resulting model.
- Included dictionary entry name collides with local → error.
- `@include` with file not in map → error.
- `@include` of file with different `@type` → error.
- `@include` inside an included file → error.
- Positional element inside an included file → error.
- Local `@theme` overrides included default; absent local takes included default.
- Multiple `@include` directives merge in order.
- TM: `@include` of TM file additively contributes `refFiles`.

### Round-Trip Tests

- Saving a host file does not inline included content; the host's own DSL (including its `@include` lines) is what's serialised.
- `@position` directives in the host still round-trip after include resolution.

### Quality Gate

- Full Vitest suite passes.
- All existing fixtures still parse and render unchanged.
- New include-using fixture parses, renders, exports SVG, and round-trips through Save.

## Risks / Open Items

- **Solo file open UX.** If a user opens just `customer_information_process.iff` (without the directory) and it has `@include common-types.iff`, the parse error must be readable and actionable. Plan: error message names the missing file and tells the user to open the project directory.
- **Saving with includes from the directory picker.** The Save flow writes the host file's DSL verbatim plus regenerated `@position` lines; `@include` lines must be preserved. Verify in round-trip test.
- **Future: cycle detection.** With one-level only, cycles are impossible by construction (an include cannot include). If we later relax this, add a visited-set.

## Working Todo List

Update in-place. Mark items complete only when the change is implemented, tested, and documented for that step.

- [x] Phase 1: Extend `parse()` signature in `src/parser.ts` to accept an optional file map.
- [x] Phase 1: Plumb `ParseOptions` through all four diagram parsers (no behaviour change yet).
- [x] Phase 2: Implement `@include` resolution in `src/iff/parser.ts`, including type-match, missing-file, collision, nested-include, and positional-content errors.
- [x] Phase 2: Implement merge rules in IFF (dictionary additive, metadata default-only).
- [x] Phase 2: Add IFF parser tests for every include branch above.
- [x] Phase 3: Implement `@include` in `src/sd/parser.ts` (metadata defaults only).
- [x] Phase 3: Implement `@include` in `src/id/parser.ts` (metadata defaults only).
- [x] Phase 3: Implement `@include` in `src/tm/parser.ts` (metadata defaults + `refFiles` merge).
- [x] Phase 3: Add parser tests for SD, ID, TM include behaviour.
- [x] Phase 4: Wire `src/main.ts` to pass the loaded project file map into `parse()`.
- [x] Phase 4: Confirm solo-file open still works (empty file map -> readable error if include used).
- [x] Phase 5: Update `.claude/specs/information-flow-diagram.md` with `@include` section.
- [x] Phase 5: Update `.claude/specs/stock-flow.md`, `integration-diagram.md`, `threat-model.md` with `@include` section.
- [x] Phase 5: Update `.claude/rules/architecture.md` (or new shared rule) with `@include` semantics.
- [x] Phase 5: Update `index.html` Help panel.
- [x] Phase 5: Update `README.md` with a short `@include` example.
- [x] Phase 5: Update `.claude/requirements.md` with user-visible behaviour.
- [x] Phase 5: Update `CLAUDE.md` cross-update list if needed.
- [x] Phase 6: Add `fixtures/common-types.iff` and migrate an existing IFF fixture to use it.
- [x] Phase 6: Add round-trip and fixture tests for the include-using fixture.
- [x] Final: Run full Vitest suite and `npm run build`; fix any regression.
- [x] Final: Move this plan to `.claude/history/include-directive-plan.md`.

## Blocker Log

Record blockers here with date, file area, symptom, and next action.

- 2026-04-25, build command: `npm run build` was blocked by PowerShell execution policy for `npm.ps1`; reran successfully with `npm.cmd run build`.
