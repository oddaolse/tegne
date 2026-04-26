# Infoflow Relationship Vocabulary Plan

Timestamp: 2026-04-26 Europe/Oslo

## Goal

Constrain the Information Flow / future Dataflow relationship vocabulary to a small semantic set that is suitable for later analysis:

`replicate`, `publish`, `ingest`, `derive`, `aggregate`, `enrich`, `serve`.

The relationship verb describes business information semantics. Transport behavior remains represented by `[flow:<type>]`.

## Scope

- Update the existing `@type infoflow` / `.iff` implementation.
- Do not introduce `.df` file handling in this change; treat `.df` naming as a later format-migration task.
- Preserve `connect` and legacy `link` keyword support.
- Preserve legacy bare flow qualifiers such as `[kafka]`.
- Reject removed relationship verbs with actionable migration guidance.

## Migration Rules

- `query` becomes `serve` when the source provides information to a consumer.
- `subscribe` is removed; model the source side as `publish`.
- `merge` becomes `aggregate`, `derive`, or `enrich` depending on the business meaning.

## Working Todo List

Update in-place as work proceeds.

- [x] Create timestamped plan file.
- [x] Update `IFFRelationship` type and parser relationship validation.
- [x] Add actionable parser messages for removed verbs.
- [x] Update flow inference for the seven allowed verbs.
- [x] Update parser tests for allowed and removed verbs.
- [x] Update include and registry tests that use removed verbs.
- [x] Update `.iff` fixtures that use removed verbs.
- [x] Update `.claude/specs/information-flow-diagram.md`.
- [x] Update `README.md`.
- [x] Update `index.html` Help panel.
- [x] Run focused infoflow tests.
- [x] Run full Vitest suite.
- [x] Run production build.
- [x] Move plan to `.claude/history/infoflow-relationship-vocabulary-plan.md`.

## Blocker Log

Record blockers here with date, area, symptom, and next action.

- 2026-04-26, validation: focused infoflow/include/registry tests passed with 53 tests; full Vitest suite passed with 152 tests; production build passed with `npm.cmd run build`.
