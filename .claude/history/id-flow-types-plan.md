# ID Flow Types Plan

Timestamp: 2026-04-25 22:16 Europe/Oslo

## Goal

Add flow classification to Integration Diagram (`@type id`) connections, matching the Information Flow Diagram concept of `@flow-types`.

Preferred syntax:

```text
@flow-types
  sync solid
  async dashed
  batch thick

connect web_app -> order_service : REST [flow:sync]
connect order_service -> message_queue : SQS [flow:async]
connect analytics_job -> analytics_db : ETL [flow:batch]
```

Existing syntax remains valid:

```text
connect web_app -> order_service : REST
```

## Design

- Protocol remains the semantic label after `:`.
- Flow type is additional visual metadata in `[flow:<type>]`.
- Explicit flow types validate against declared `@flow-types` plus built-in defaults: `sync`, `async`, `batch`.
- Rendering uses the same style mapping as IFF:
  - `solid`: normal solid line
  - `dashed`: dashed line
  - `thick`: thick solid line
- The ID legend should include flow types when used.

## Working Todo List

Update in-place. Mark items complete only when implemented and validated.

- [x] Create timestamped plan file.
- [x] Add flow fields to `IDConnection`.
- [x] Parse `@flow-types` blocks in `src/id/parser.ts`.
- [x] Parse `[flow:<type>]` qualifiers on `connect` lines.
- [x] Validate explicit flow types.
- [x] Preserve existing protocol-only `connect` syntax.
- [x] Update ID renderer connection styling.
- [x] Update ID legend to include flow types.
- [x] Update ID parser tests.
- [x] Update renderer/geometry test coverage.
- [x] Update ID fixtures with flow types.
- [x] Update `.claude/specs/integration-diagram.md`.
- [x] Update `README.md`.
- [x] Update `index.html` Help panel.
- [x] Run focused ID tests.
- [x] Run full Vitest suite.
- [x] Run production build.
- [x] Move plan to `.claude/history/id-flow-types-plan.md`.

## Blocker Log

Record blockers here with date, area, symptom, and next action.

- 2026-04-25, validation: direct `npm run build` was blocked by PowerShell execution policy for `npm.ps1`; reran successfully with `npm.cmd run build`.
- 2026-04-25, review: built-in ID flow types initially validated without `@flow-types` but did not render with built-in styles. Fixed `idFlowStyle` so `async` is dashed and `batch` is thick without declarations.
- 2026-04-25, final validation: focused ID/include tests passed with 53 tests; full Vitest suite passed with 151 tests; production build passed with `npm.cmd run build`.
