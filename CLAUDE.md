# Tegne Contributor Instructions

This file is the authoritative working guide for Claude Code, Codex, and human contributors. Keep `AGENTS.md` as a pointer to this file only.

## Purpose

Tegne is a browser-based structural and visual modelling tool. Users write plain-text DSL files and the app renders interactive SVG diagrams. It does not simulate models or evaluate equations.

Supported diagram types:

| `@type` | Diagram | Extension |
|---|---|---|
| `sd` or absent | Forrester stock-and-flow | `.sd` |
| `id` | Integration diagram | `.id` |
| `infoflow` | Information flow diagram | `.iff` |
| `tm` | Threat model | `.tm` |

## Source Of Truth

- Use `.claude/requirements.md` for product behaviour and shared requirements.
- Use `.claude/specs/*.md` for formal diagram syntax, semantics, valid examples, invalid examples, and test obligations.
- Use `.claude/rules/*.md` for detailed implementation rules.
- Use `.claude/history/` only for completed historical plans and migration notes.
- Use this file for repository workflow, structure, and definition of done.
- Update documentation in the same change as behaviour changes. Do not leave docs, fixtures, help text, or rule files stale.

## Context Loading Guide

Read only the files needed for the task.

- Always read this file first.
- For product, workflow, or shared behaviour changes, read `.claude/requirements.md`.
- For diagram-specific work, read only the relevant spec:
  - SD: `.claude/specs/stock-flow.md`
  - ID: `.claude/specs/integration-diagram.md`
  - IFF: `.claude/specs/information-flow-diagram.md`
  - TM: `.claude/specs/threat-model.md`
- For implementation details, read only the relevant rules:
  - parser, model, layout, and drag: `.claude/rules/architecture.md`
  - SVG, D3, shapes, themes, and edge routing: `.claude/rules/svg-rendering.md`
  - UI shell, Help panel, open/save/export, zoom, pan: `.claude/rules/ui-layout.md`
  - tests and fixtures: `.claude/rules/testing.md`
  - dependencies: `.claude/rules/dependencies.md`
  - diagram-specific implementation notes: `.claude/rules/<diagram>.md`
- Do not read `.claude/history/` unless the task asks for history, migration context, or review of completed work.

## Repository Structure

```text
index.html              UI shell and in-app Help panel
src/main.ts             browser entry point and diagram routing
src/parser.ts           DSL dispatcher based on @type
src/types.ts            shared model types and re-exports
src/themes.ts           theme definitions
src/export.ts           SVG export and DSL save helpers
src/sd/                 stock-and-flow parser, layout, drag, renderer
src/id/                 integration diagram parser, layout, renderer, shapes
src/iff/                information-flow parser, layout, renderer, shapes
src/tm/                 threat-model parser, layout, renderer
src/project/            cross-diagram registry and project loading
tests/                  Vitest tests
fixtures/               stable example DSL files
dist/                   generated build output; do not edit by hand
```

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server
npm test          # run Vitest once
npm run build     # production build into dist/
npm run preview   # preview production build
```

On Windows PowerShell, `npm.ps1` may be blocked by execution policy. Use `npm.cmd test` or direct node invocations when needed.

## Coding Rules

- Use TypeScript and keep `tsconfig.json` strictness intact.
- Follow existing style: 2-space indentation, semicolons, single quotes, explicit return types on exported functions where practical.
- Keep diagram-specific code inside its diagram folder.
- For a new diagram type, mirror the existing split: `types.ts`, `parser.ts`, `layout.ts`, `renderer.ts`, optional `shapes.ts` or `drag.ts`.
- Put shared cross-diagram behaviour in `src/types.ts`, `src/parser.ts`, `src/themes.ts`, `src/export.ts`, or `src/project/` only when it is genuinely shared.
- Do not add dependencies casually. Check `package.json` and `.claude/rules/dependencies.md` first.
- Do not edit generated `dist/` files directly.

## DSL And Parser Rules

- Parsers must return structured models plus line-aware parse errors.
- Unknown syntax should produce useful errors without clearing the last valid render.
- Preserve backward compatibility for existing fixtures unless a migration is explicitly part of the task.
- `@include` is same-type and project-scoped; included files contribute definitions/defaults, not diagram elements or positions.
- When changing DSL syntax, update all of these in the same change:
  - parser and model types
  - renderer/layout/save behaviour if affected
  - tests
  - fixtures
  - `README.md`
  - `.claude/requirements.md`
  - `index.html` Help panel
  - relevant `.claude/rules/*.md` or specs

## Rendering Rules

- Render diagrams as SVG using D3.
- Keep geometry helpers testable where possible.
- Theme colours must come from `src/themes.ts`; do not hardcode new semantic colours in renderers.
- Dragging must update model positions and redraw affected links or boundaries.
- Saved `@position` directives must round-trip for every draggable element and special box.

## Testing Rules

- Use Vitest.
- Add focused parser tests for every DSL branch, including invalid syntax.
- Add fixture tests for realistic examples.
- Add geometry or renderer-adjacent tests when changing shapes, edge routing, legends, or visual state rules.
- Run the relevant focused tests during development and the full suite before finishing when feasible.

Current useful test commands:

```bash
node node_modules\vitest\vitest.mjs run
node node_modules\vitest\vitest.mjs run tests\iff-parser.test.ts tests\iff-geometry.test.ts tests\iff-layout.test.ts
```

## Documentation Rules

- `README.md` is public-facing. Keep examples concise and accurate.
- `.claude/requirements.md` defines user-visible behaviour. Keep it aligned with implemented DSL and UI.
- `index.html` contains the in-app Help panel. Update it whenever DSL syntax changes.
- `fixtures/` are executable examples. Treat them as compatibility assets.
- `.claude/specs/` contains durable diagram specifications. Keep them accurate when implemented grammar or rendering semantics change.
- `.claude/history/` contains completed plans and migration notes. Do not treat it as the primary source of truth.

## Git Rules

- Use short, imperative commit messages.
- Keep commits scoped to one logical change.
- Do not commit unrelated local changes.
- Do not rewrite history unless explicitly asked.
- Do not use destructive git commands unless explicitly requested.

## Definition Of Done

A change is complete only when:

- the implemented behaviour matches `.claude/requirements.md` or the agreed task
- relevant tests and fixtures are added or updated
- in-app Help and public docs match the code
- strict TypeScript and existing project conventions are respected
- focused tests pass, and the full suite/build are run when the change affects shared or browser-facing behaviour
- any known limitation or follow-up is recorded in the relevant plan/spec file
