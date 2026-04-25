# IFF Connect Keyword Migration Plan

Timestamp: 2026-04-25 21:31 Europe/Oslo

## Goal

Standardize Information Flow Diagram syntax on `connect` while preserving `link` as a backward-compatible alias.

Preferred syntax:

```text
connect A -> B : query [flow:sync]
connect A <- B : serve [flow:sync]
connect A <-> B : merge [flow:sync]
```

Legacy syntax remains accepted:

```text
link A -> B : query [flow:sync]
```

## Scope

- Parser accepts both `connect` and `link` for IFF relationships.
- Fixtures and documentation use `connect`.
- Internal model names may remain `IFFLink` and `links` to avoid unnecessary renderer/layout churn.
- Existing `.iff` files using `link` must continue parsing.
- Included files still reject positional relationship declarations for both `connect` and `link`.

## Implementation Notes

- Add `connect` to `POSITIONAL_KEYWORDS_IFF`.
- Extend parser switch to handle `case 'connect'` together with `case 'link'`.
- Prefer neutral parser errors such as `connection requires...` so both keywords make sense.
- Update all repository `.iff` fixtures from `link` to `connect`.
- Update tests to use `connect` as the primary syntax.
- Add or keep one explicit test for legacy `link`.
- Update spec, README, Help, rules, and any current plan/history references only where they describe active syntax.

## Working Todo List

Update in-place. Mark items complete only when implemented and validated.

- [x] Create timestamped migration plan.
- [x] Update IFF parser to accept `connect` and legacy `link`.
- [x] Ensure include-mode rejects both `connect` and `link`.
- [x] Update parser error wording from link-specific to connection-neutral where relevant.
- [x] Migrate `.iff` fixtures to `connect`.
- [x] Update IFF parser/include/project tests to prefer `connect`.
- [x] Add/keep explicit backward compatibility test for legacy `link`.
- [x] Update `.claude/specs/information-flow-diagram.md`.
- [x] Update `.claude/rules/infoflow-diagram.md`.
- [x] Update `README.md`.
- [x] Update `index.html` Help panel.
- [x] Run focused IFF tests.
- [x] Run full Vitest suite.
- [x] Run production build.
- [x] Move plan to `.claude/history/iff-connect-keyword-plan.md`.

## Blocker Log

Record blockers here with date, area, symptom, and next action.
