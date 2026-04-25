# Information Flow Diagram Process Symbol Plan

## Goal

Extend the `@type infoflow` diagram so it supports a new `process` symbol while changing `store` from the current rounded rectangle to a classical database drum. The implementation must preserve existing save/load behavior, keep the DSL coherent, and maintain strong parser and renderer test coverage.

## Scope

The requested change affects more than drawing. The current information-flow implementation is store-centric: parsing, validation, layout, drag behavior, saved positions, and export all assume that every addressable node is a store. To implement `process` correctly, the internal model must be generalized to support multiple node kinds.

## Current Constraints

- `src/iff/types.ts` defines `IFFStore`, `IFFLink`, and `IFFGroup`, but no shared node abstraction.
- `src/iff/parser.ts` parses only `store`, `link`, `group`, and `@location-types`.
- `src/iff/parser.ts` validates link endpoints against `store` IDs only.
- `src/iff/layout.ts` assigns positions only to `model.stores`.
- `src/iff/renderer.ts` assumes store geometry for all nodes, labels, drag logic, and edge routing.
- `src/iff/shapes.ts` provides only one shape: the current store rectangle.
- `src/main.ts` and `src/export.ts` serialize `@position` lines for stores only.

## Design Decisions To Lock Before Coding

1. Introduce a shared node model for information-flow diagrams.
   - Add a common `IFFNode` union with `store` and `process`.
   - Keep shared fields in both node kinds: `id`, `label`, `state`, `x`, `y`.
   - Keep store-only fields separate from process-only fields.

2. Support the new syntax in phases.
   - Phase 1 should implement `process`, `@systems`, `@flow-types`, and `group [system:...]`.
   - `@store-state` should stay code-defined for now unless we explicitly decide to make state visuals fully data-driven.

3. Allow links between any valid node IDs.
   - Replace store-only endpoint validation with node-level validation.
   - Replace the current optional `transport` field with a first-class `flowType`.

4. Render node kinds differently.
   - `process`: square.
   - `store`: database drum.
   - Edge attachment math must be shape-aware.

5. Keep group and position behavior consistent.
   - Groups should contain node IDs, not only store IDs.
   - Save/load must preserve positions for both stores and processes.

6. Redesign legend semantics.
   - Stores use `@location-types`.
   - Processes use `@systems`.
   - Links use `@flow-types`.
   - The legend will likely need separate sections instead of one flat list.

## Open Questions

- Should `process` support group-level inherited system assignment when no `[SystemX]` qualifier is present? The draft says yes.
- Should `process` state reuse the same visual state system as `store`? The draft says yes.
- Should flow type be optional with inference by relationship in phase 1, or should explicit `[flow:*]` be required first and inference added later?
- The draft changes state semantics from the current implementation. We need to decide whether to preserve existing visuals or adopt the new meanings exactly:
  - current code: `new = thick solid`, `changing = dashed with reduced fill`, `decommissioned = dotted`
  - draft: `changing = bold`, `new = dashed`, `decommissioned = x`

## Implementation Phases

### Phase 1: Model Refactor

- Add a base node model and a discriminated union for `store` and `process`.
- Update group membership to reference generic nodes.
- Update top-level exports in `src/types.ts`.

Exit criteria:
- TypeScript compiles with no `IFFStore`-only assumptions left in shared code paths that should be generic.

### Phase 2: Parser Extension

- Parse `process <id> [<system>] [<state>] [label:"..."]`.
- Parse `@systems` and `@flow-types` blocks.
- Support `group ... [system:<system>]`.
- Apply inherited system to processes inside a group if omitted locally.
- Keep strict validation for unknown system names, location types, flow types, and bad qualifiers.
- Validate links against all node IDs.

Exit criteria:
- Parser accepts mixed store/process diagrams and rejects invalid references with precise errors.

### Phase 3: Shapes and Rendering

- Replace the store rectangle with a drum shape.
- Add process square rendering.
- Update node drawing, label placement, and ID badges for both node kinds.
- Update edge routing to connect to the correct shape boundary.
- Redesign the legend to separate store types, systems, and flow types.

Exit criteria:
- Mixed diagrams render correctly and remain readable across themes.

### Phase 4: Layout, Drag, and Save/Load

- Update layout to position all nodes, not only stores.
- Update drag behavior for mixed node groups.
- Update `@position` serialization in `src/main.ts` and `src/export.ts`.
- Confirm saved layouts round-trip for stores, processes, groups, legend, and meta box.

Exit criteria:
- Manual layout survives Save/Open without dropping process positions.

### Phase 5: Documentation and Fixtures

- Update `README.md` infoflow syntax and examples.
- Update `requirements.md` to describe the new node model and DSL blocks.
- Add or revise `.iff` fixtures to cover realistic mixed diagrams.

Exit criteria:
- Repository documentation matches implemented syntax and visuals.

## Testing Strategy

Testing must be expanded before or alongside implementation. Good coverage here means parser behavior, model validation, and serialization round-trips are all protected by tests.

### Parser Tests

Add tests for:

- valid `process` declarations
- valid `@systems` block parsing
- valid `@flow-types` block parsing
- group-level system inheritance
- process-level system override of inherited group system
- mixed store/process links
- unknown process system
- unknown group system
- unknown flow type
- link to unknown node ID
- duplicate node IDs across store and process declarations
- invalid qualifiers on store, process, link, and group lines

### Renderer and Shape Tests

If renderer tests are practical in the current setup, add focused tests for:

- store node renders as a drum
- process node renders as a square
- decommissioned marker behavior once finalized
- link labels include explicit flow type when present

If DOM-level renderer tests are too brittle, keep the geometry and shape-generation logic factored so it can be tested without snapshot-heavy SVG assertions.

### Serialization and Integration Tests

Add tests for:

- `@position` persistence for stores and processes
- mixed-node diagrams survive parse -> layout -> save position updates
- group membership remains valid after parsing mixed-node diagrams

### Quality Gate

Before considering the work complete:

- run the full test suite
- add new tests for every new parser branch
- add regression coverage for any bug found during implementation
- confirm that no existing `.iff` fixtures fail unless intentionally migrated

## Working Todo List

Update this section in-place during implementation. Only mark an item complete when code and tests for that item are done.

- [x] Phase 1: Introduce generic IFF node types and update exports.
- [x] Phase 1: Refactor group membership, layout inputs, and saved-position handling to use generic nodes.
- [x] Phase 2: Add parser support for `process`.
- [x] Phase 2: Add parser support for `@systems`.
- [x] Phase 2: Add parser support for `@flow-types`.
- [x] Phase 2: Add parser support for `group [system:...]` inheritance.
- [x] Phase 2: Replace store-only link validation with node-level validation.
- [x] Phase 2: Add parser tests for valid and invalid mixed-node syntax.
- [x] Phase 3: Implement store drum shape.
- [x] Phase 3: Implement process square shape.
- [x] Phase 3: Make edge geometry shape-aware.
- [x] Phase 3: Update mixed-node rendering and labels.
- [x] Phase 3: Redesign and implement the legend for location types, systems, and flow types.
- [x] Phase 3: Add renderer or geometry-focused tests for the new shapes and link labels.
- [x] Phase 4: Update drag behavior for mixed nodes and group drags.
- [x] Phase 4: Update save/load position serialization in `src/main.ts` and `src/export.ts`.
- [x] Phase 4: Add round-trip tests for positions and mixed-node diagrams.
- [x] Phase 5: Update `README.md` and `requirements.md`.
- [x] Phase 5: Add or update `.iff` fixtures for realistic mixed-node diagrams.
- [x] Phase 5: Compare `.claude` infoflow EBNF specification with the implemented parser and record syntax mismatches.
- [x] Final verification: Run the full test suite and fix regressions.

## Blocker Log

Record blockers here with date, file area, symptom, and next action. This section is intentionally blank until implementation begins.

Example format:

- `2026-04-25` `src/iff/parser.ts` parser ambiguity around `[label:"..."]` and `[flow:*]`; next action: split qualifier parsing by keyword instead of reusing store logic.

## Spec Alignment Notes

Reviewed `.claude/specs-and-plans/information-flow-diagram-specification.md` against `src/iff/parser.ts`.

Key mismatches found:

- `process` system syntax differs.
  The EBNF specifies `[system:SystemA]`; the implementation currently accepts bare system qualifiers like `[SystemA]`.
- `@store-state` is specified but not implemented.
  State visuals remain hardcoded in code rather than declared through a DSL block.
- Link relationships are open in the EBNF but closed in code.
  The EBNF allows any identifier; the parser accepts only a fixed relationship set.
- Flow typing is stricter in the EBNF than in code.
  The EBNF uses `[flow:sync|async|batch]`; the parser also preserves legacy bare qualifiers like `[kafka]`.
- `group_body` is too broad in the EBNF.
  The grammar allows any `element`, which implies nested groups and `@position` inside groups; the implementation rejects nested groups.
- Identifiers and numbers are stricter in the EBNF than in code.
  The parser currently accepts looser IDs and general numeric coordinates.
- Group labels are stricter in the EBNF than in code.
  The grammar requires quoted strings; the parser accepts quoted and unquoted labels.

Recommended follow-up:

- Align the parser to one explicit process system syntax: `[system:<name>]`.
- Tighten the EBNF so `group_body` only contains `store`, `process`, and `link` declarations.
- Decide whether `@store-state` should become a real configurable DSL feature or be removed from the formal grammar.

## Post-Implementation Refinements

Applied after the main mixed-node implementation:

- Process nodes were changed from squares to wider rectangles so labels fit more often without wrapping or crowding.
- State visuals were adjusted:
  - unchanged/current: solid border
  - changing: dashed border
  - new: dotted border
  - decommissioned: solid border with an `X` marker
- Legend swatches, README text, requirements text, and in-app Help text were updated to match these visual rules.
- Geometry-focused tests were extended to lock in the updated process dimensions and state-style mapping.
