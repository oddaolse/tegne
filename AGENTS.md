# Repository Guidelines

## Project Structure & Module Organization
This repository is a browser-based TypeScript app built with Vite. Core source lives in `src/`, with diagram-specific logic split by type: `src/sd/`, `src/id/`, `src/iff/`, and `src/tm/` for parsers, layout, renderers, and related types. Shared entry points and cross-project logic live in files such as `src/main.ts`, `src/parser.ts`, `src/export.ts`, and `src/project/*`.

Tests live in `tests/` and are organized by parser area, for example `tests/parser.test.ts` and `tests/id-parser.test.ts`. Sample DSL inputs live in `fixtures/`. Production output is generated into `dist/` and should not be edited manually.

## Build, Test, and Development Commands
- `npm run dev`: starts the Vite dev server for local editing and browser testing.
- `npm run build`: creates a production bundle in `dist/`.
- `npm run preview`: serves the built app locally from `dist/`.
- `npm test`: runs the Vitest suite once.

Use `npm install` after cloning or when dependencies change.

## Coding Style & Naming Conventions
Use TypeScript with strict compiler settings from `tsconfig.json`; keep code compatible with `strict`, `noUnusedLocals`, and `noUnusedParameters`. Follow the existing style: 2-space indentation, semicolons, single quotes, and clear `camelCase` names for functions and variables. Use `PascalCase` for types and interfaces, and keep module names descriptive, such as `renderer.ts`, `layout.ts`, and `types.ts`.

Keep diagram concerns isolated by folder. If you add a new diagram type, mirror the existing parser/layout/renderer/type split.

## Testing Guidelines
Vitest is the test framework. Add or update tests in `tests/*.test.ts` alongside the feature area you change. Prefer focused parser and fixture-based coverage for DSL changes, including both valid input and error cases. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries, sometimes with a scope prefix, for example `improve and simplify examples` or `Phases 2-3-4: show-ids, cross-diagram registry, and threat modeling (@type tm)`. Keep commit messages specific to one logical change.

PRs should include a concise description, note any DSL or rendering behavior changes, link related issues, and attach screenshots or exported SVGs when UI output changes. Mention test coverage for parser or renderer updates.

## Configuration Notes
Do not commit generated `dist/` output unless a release workflow requires it. Treat `fixtures/` as stable examples: update them deliberately when syntax or rendering behavior changes.
