# UI Layout and Error Handling

## Layout
- Two-column layout: DSL editor left (~35% width), SVG canvas right (~65% width)
- DSL editor is a plain `<textarea>` — no CodeMirror, Monaco, or any editor widget
- A **Render** button triggers parse + layout + render manually
- Rendering also triggers automatically on file open
- Error panel sits directly below the textarea
- Minimal styling — functional over decorative
- Do **not** introduce a CSS framework

## Canvas

- The SVG viewBox is set to the A4 page rect, not the full internal coordinate space
  - Landscape: `30 12 1240 876`
  - Portrait:  `30 12 619 876`
- At zoom=1 the canvas displays exactly the A4 page — there is no dead space outside the page
- Zoom and pan adjust the viewBox; see Zoom section below
- The page rect is exported from `renderer.pageRect()` and used by both `main.ts` and `export.ts`

## Zoom and Pan

Three buttons sit in the right toolbar, left of the Export button:

| Button | Action |
|--------|--------|
| `+` | Zoom in ×1.10 |
| `−` | Zoom out ÷1.10 |
| `⊡` | Reset to 100%, recentre |

- Zoom range: 25%–400%
- A percentage label between the buttons and Export shows the current zoom level
- Zoom resets to 100% and pan resets to (0, 0) on every Render
- **Scroll to pan**: `wheel` event on the canvas container drives `panX`/`panY`; `deltaX` and `deltaY` are both applied so trackpad two-finger scroll works in both axes
- Pan sensitivity: `0.8 / zoomLevel` (consistent feel at all zoom levels)
- Zoom and pan state live in `main.ts`; they are never written to the model

## Opening Files
- An **Open** button sits above the textarea
- Implemented as `<input type="file" accept=".sd">` (hidden), triggered by a visible button
- On file select: read the file as text, replace the textarea content, then automatically trigger parse + layout + render

## Saving Files
- A **Save** button sits above the textarea alongside the Open button
- On click: take the current textarea DSL text, append `@position` directives for every node, then open a **Save As dialog**
- Uses `window.showSaveFilePicker()` (File System Access API) when available — gives native directory and filename control
- Falls back to a programmatic `<a download>` click in browsers without the API
- Cancelling the picker does nothing (catch `AbortError`, do not download)
- Suggested filename: `@name` value slugified, or `model.sd` if no name is set
- Save does **not** modify the textarea content

## Error Handling
- Parse errors displayed in a **red error panel** below the DSL editor
- Error panel shows: line number + message for each error
- A parse error does **not** clear the current diagram — last valid render stays on screen
- Runtime errors (renderer, drag) go to `console.error` only — no UI for those
- Do **not** use `alert()` or `window.confirm()` anywhere

## Export SVG
- Export produces a standalone `.svg` file using a programmatic download (no Save As dialog)
- Before export: set the viewBox to the full page rect (zoom=1, pan=0); strip all `data-*` attributes
- Exported SVG must be self-contained — no external dependencies
- Use `Courier New`, `Courier`, `monospace` — no external fonts

## Persistence
- `localStorage` is used to save the current DSL text between page reloads
- No other use of `localStorage`
