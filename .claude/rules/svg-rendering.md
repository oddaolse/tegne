# SVG Rendering

## Library
- Use **D3** (`d3-selection`, `d3-drag`) for all SVG rendering and drag handling
- Do **not** use Snap.svg, SVG.js, or raw `document.createElementNS` DOM calls
- The SVG canvas is the only rendering target — no Canvas 2D API
- All SVG elements must carry a `data-id` attribute matching their model `id`
- Connector paths must be redrawn entirely on every drag event — no incremental updates

## Theme System

All colours come from the active theme — **no hardcoded colour values in `renderer.ts`**.

- Themes are defined in `src/themes.ts` as objects implementing the `Theme` interface
- `render()` and `redrawConnectors()` call `getTheme(model.meta.theme)` once and pass the result to every draw function
- The `Theme` interface has slots for: `canvasBg`, `pageGuide`, `stock`, `cloud`, `aux`, `flow` (strong/medium/weak/valveFill/label), `connector` (stroke), `polarity` (positive/negative), `metaBox`
- Adding a new colour to the renderer requires adding it to the `Theme` interface and all theme objects first

## Polarity Colour Coding

Polarity indicators (`+` / `−`) are colour-coded by sign and rendered at **15px bold**:

| Polarity | Connector line | Arrowhead | Label |
|----------|---------------|-----------|-------|
| `(+)`    | `theme.connector.stroke` | `arrow-connector-positive` marker | `theme.polarity.positive` |
| `(-)`    | `theme.polarity.negative` | `arrow-connector-negative` marker | `theme.polarity.negative` |

Both marker variants are defined in `<defs>` by `defineMarkers()`. Negative connectors are rendered entirely in the negative colour — line, arrow, and label — so balancing links are immediately distinguishable from reinforcing ones.

## Forrester Symbol Specifications

| Element    | SVG Representation                                                   |
|------------|----------------------------------------------------------------------|
| Stock      | `<rect>` — 120×50px, rounded corners (rx=6)                         |
| Cloud      | `<path>` — Forrester cloud shape (bumpy outline), approx 80×60px    |
| Auxiliary  | `<circle>` — r=28px                                                  |
| Flow pipe  | `<line>` — stroke width and style vary by strength (see below)      |
| Valve      | `<circle>` r=12px with ⊗ glyph, positioned at midpoint of flow; stroke matches pipe |
| Connector  | `<path>` quadratic bezier curve, dashed stroke, arrow at receiving end |
| Polarity   | `<text>` — `+` or `−`, placed near arrowhead of connector/flow      |

## Flow Pipe Strength Styles

Stroke colour is read from the theme (`theme.flow.strong`, `.medium`, `.weak`).

| Strength | stroke-width | stroke-dasharray | Description     |
|----------|--------------|------------------|-----------------|
| `strong` | 3px          | _(none — solid)_ | Solid pipe      |
| `medium` | 2px          | `8,4`            | Dashed pipe     |
| `weak`   | 1.5px        | `2,4`            | Dotted pipe     |

The valve circle (⊗) inherits the same stroke colour and stroke-width as its pipe. Arrow markers are defined in `<defs>` with colours from the theme.

## Metadata Box

Rendered in the **bottom-left corner** of the page area.

- Position: 16px from left edge, 16px from bottom edge of the page rect
- Container: `<rect>` with theme `metaBox.fill`, `metaBox.stroke`, rx=4, ~12px padding
- One `<text>` line per field (Courier New, 11px, `metaBox.text` colour): name, version, date, author
- Optional fields omitted if not set; `date` always shown
- Not draggable — canvas annotation only
- Included in SVG export unchanged
- Suppressed entirely when the model has `@info off` (default: on). The renderer guards the `drawMetaBox` call with `if (model.meta.info !== false)`.

## Canvas Background

- A `<rect class="canvas-bg">` fills the full internal coordinate space (0 0 1600 900) with `theme.canvasBg`
- The SVG viewBox is set by `main.ts` to the A4 page rect — the background rect extends beyond it and covers everything

## Fonts
- Use `Courier New`, `Courier`, `monospace` as the font stack for all diagram labels
- No Google Fonts, no external font loading
- Minimum horizontal spacing between stocks: 220px or `label.length * 9px + 40px`, whichever is greater
