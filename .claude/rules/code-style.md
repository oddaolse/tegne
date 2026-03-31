# Code Style

## Language
- All source code is **TypeScript** — no plain `.js` files in `src/`
- Use strict mode: `"strict": true` in `tsconfig.json`
- Prefer explicit types on function signatures; avoid `any`
- Use `interface` for model data structures, `type` for unions and aliases
- Do **not** use TypeScript decorators or experimental features
- Do **not** generate `any` types to silence TypeScript errors — fix the types instead
- Do **not** use `// @ts-ignore` or `// @ts-nocheck`

## Build Tool
- Use **Vite** as the build tool and dev server
- TypeScript support via Vite's built-in handling — no manual `tsconfig` tuning unless required
- Dev command: `vite` — produces hot-reloading dev server
- Build command: `vite build` — produces clean static output in `dist/`
- Do **not** use webpack, Parcel, Rollup directly, or bare `tsc` compilation
- Do **not** introduce a monorepo structure or workspace setup

## Do-Not-Do List
- Do **not** add React, Vue, Svelte, or any other UI framework
- Do **not** add a CSS framework (Tailwind, Bootstrap etc.)
- Do **not** add a grammar/parser library (PEG.js etc.)
- Do **not** add a code editor widget (CodeMirror, Monaco)
- Do **not** add simulation or equation evaluation logic
- Do **not** add a backend, API, or any server-side component
- Do **not** commit `dist/` or `node_modules/`
