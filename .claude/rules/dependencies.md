# Dependencies

## Allowed Dependencies

```json
{
  "dependencies": {
    "d3": "^7.x"
  },
  "devDependencies": {
    "@types/d3": "^7.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

## Rules
- Do **not** add any dependency not listed above without explicit instruction from the user
- Do **not** add UI frameworks (React, Vue, Svelte)
- Do **not** add CSS frameworks (Tailwind, Bootstrap)
- Do **not** add parser libraries (PEG.js, nearley)
- Do **not** add code editor libraries (CodeMirror, Monaco)
- Do **not** add test frameworks (Jest, Vitest)
- Do **not** add utility libraries (lodash, ramda) — use native TypeScript/ES2022
