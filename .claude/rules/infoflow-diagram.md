# Information Flow Diagram Implementation Rules

Use `.claude/specs/information-flow-diagram.md` as the authoritative syntax and semantics specification for `@type infoflow`.

## Parser

- Keep the parser in `src/iff/parser.ts`.
- Parse stores, processes, connections, groups, metadata, palettes, and saved positions line by line.
- Return line-aware `ParseError` entries for invalid syntax and references.
- Preserve compatibility for existing `.iff` fixtures unless a migration is explicitly required.
- Use `connect` for new relationship declarations.
- Preserve `link` as a legacy alias for backward compatibility.
- Keep connection endpoint validation node-based: stores and processes are both valid endpoints.

## Model

- Keep information-flow types in `src/iff/types.ts`.
- Use a generic node model for shared store/process behaviour.
- Keep store-specific fields and process-specific fields separate.
- Keep groups as lists of node IDs.

## Layout And Drag

- Layout all nodes, not only stores.
- Honour saved `@position` values for stores, processes, `__meta__`, and `__legend__`.
- Dragging a node must redraw affected connections.
- Dragging a group must move every member node and redraw affected connections.

## Rendering

- Store nodes render as database drums.
- Process nodes render as rectangles.
- Edge routing must be shape-aware.
- The legend must separate store location types, process systems, and flow types.
- State visuals must match the spec:
  - current/unchanged: solid
  - changing: dashed
  - new: dotted
  - decommissioned: dotted (harmonised with ID)

## Known Follow-Ups

- `showCross` field on `BorderStyle` in `src/iff/shapes.ts` is currently always `false`. The cross-rendering branches in `drawNode()` are dead. Kept intentionally while state-visual syntax is still maturing — strip the field, the X-rendering code, and update the spec once the design settles.

## Tests

- Add parser tests for every syntax branch and invalid reference path.
- Add fixture tests for legacy store-only diagrams and mixed store/process diagrams.
- Add geometry tests for shapes, edge routing, flow styles, and state visuals when they change.
