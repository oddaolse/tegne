# IFF Bidirectional Links Plan

## Goal

Support directional operators for information-flow links:

```text
link A -> B : query
link A <- B : query
link A <-> B : query
```

`->` and `<-` are unidirectional. `<->` is bidirectional and renders arrowheads at both ends.

## Semantics

- `link A -> B` means data flows from `A` to `B`.
- `link A <- B` means data flows from `B` to `A`; normalize internally to `from: "B"`, `to: "A"`.
- `link A <-> B` means bidirectional exchange between `A` and `B`; keep `from: "A"`, `to: "B"` and mark the link bidirectional.
- Relationship names and flow-type handling remain unchanged.
- Existing `.iff` files using `->` remain valid.

## Implementation Steps

1. Add an IFF link direction type and store it on `IFFLink`.
2. Replace the parser's hardcoded `->` parsing with operator detection for `<->`, `->`, and `<-`.
3. Update parser errors to list the valid operators.
4. Update rendering so bidirectional links use both start and end arrow markers.
5. Add parser tests for all operators and invalid operator handling.
6. Add renderer/geometry-adjacent test coverage for bidirectional marker attributes if practical.
7. Update specs, README, Help, and fixture examples.
8. Run focused tests, full suite, and production build.
9. Move this plan to `.claude/history/` when complete.

## Working Todo List

Update in-place. Mark items complete only when implemented and validated.

- [x] Create implementation plan file.
- [x] Update `src/iff/types.ts` with link direction.
- [x] Update `src/iff/parser.ts` to parse `->`, `<-`, and `<->`.
- [x] Update parser errors for invalid/missing operators.
- [x] Update `src/iff/renderer.ts` to render bidirectional arrowheads.
- [x] Add parser tests for all supported operators.
- [x] Add renderer or SVG marker test coverage for bidirectional links.
- [x] Update an IFF fixture where semantically useful.
- [x] Update `.claude/specs/information-flow-diagram.md`.
- [x] Update `README.md`.
- [x] Update `index.html` Help panel.
- [x] Run focused IFF tests.
- [x] Run full Vitest suite.
- [x] Run production build.
- [x] Move plan to `.claude/history/iff-bidirectional-links-plan.md`.

## Blocker Log

Record blockers here with date, area, symptom, and next action.

- 2026-04-25, parser: `<->` was initially counted as both `<-` and `->`; switched to non-overlapping regex tokenization.
- 2026-04-25, tests: DOM-based renderer test failed in Node environment; replaced it with pure marker helper coverage in geometry tests.
