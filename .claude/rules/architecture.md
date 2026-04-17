# Architecture

## File Structure

See `CLAUDE.md` for the canonical file tree. Do **not** create files outside that structure without explicit instruction. Do **not** create a `components/` folder — this is not a UI component project. Keep each module focused on its single responsibility.

## Parser Rules
- Line-by-line parser — no grammar library
- Each line classified by leading keyword: `@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation`, `@position`, `stock`, `cloud`, `flow`, `aux`, `connector`, `group`, `end`, `#`
- On parse error: collect all errors with line numbers, return alongside partial model
- Do **not** throw exceptions — return `{ model: SDModel | null, errors: ParseError[] }`
- Blank lines are silently ignored
- Unknown keywords produce a `ParseError` with line number and offending text

### `@` metadata directives
Lines starting with `@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation` set the corresponding `ModelMeta` field. The remainder of the line after the keyword (trimmed) is the value. Directives may appear anywhere in the file but conventionally go at the top. If `@date` is absent, the parser sets `meta.date` to today's ISO date. Unknown `@` keywords produce a `ParseError`.

- `@theme` — value must be a key in `THEMES` (imported from `themes.ts`); unknown values produce a `ParseError` listing valid names
- `@orientation` — value must be `landscape` or `portrait`; anything else is a `ParseError`

### `@position` directives
`@position <node-id> <x> <y>` — sets the saved position of a node. Written by the Save action; read by the parser and stored in `SDModel.savedPositions`.
- If **any** `@position` directives are present in the file, `layout.ts` skips auto-layout entirely and uses saved positions for all nodes that have them; nodes without a saved position fall back to auto-layout
- `x` and `y` are integers (SVG user units)

### `flow` strength
An optional trailing keyword `weak`, `medium`, or `strong` follows the polarity token:
```
flow <from> -> <to> : <label> (<polarity>) [weak|medium|strong]
```
- If the keyword is absent, default to `'medium'`
- Any other trailing word is a `ParseError`

### `aux` syntax
`aux <name>` — declares an auxiliary node with no connections
`aux <name> <- <from1> (<pol>)[, <from2> (<pol>)] ...` — declares the auxiliary **and** creates one `Connector` object per listed source (identical to writing `aux <name>` + separate `connector <name> <- <source>` lines)

### Multi-source connector lines
`connector X <- A (+), B (-)` produces **two** `Connector` entries in `SDModel.connectors`. The same rule applies to multi-source `aux` lines.

### `group` / `end` blocks
`group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]` begins a group; `end` closes it.
- `<id>` — unique identifier (no spaces)
- `<label>` — display text; defaults to id if omitted
- `[corner:*]` — label position in group rect; default `upper-right`
- **Stocks and auxiliaries** declared inside the block are added to `group.members[]`
- **Clouds cannot be grouped** — they auto-position relative to their connected stock
- Groups cannot be nested; an element can belong to at most one group
- Unclosed groups and duplicate membership produce `ParseError`

### Connector endpoint resolution
`Connector.from` and `Connector.to` may reference any of four namespaces. The renderer resolves them in this order:
1. Stock id
2. Cloud id
3. Auxiliary id
4. Flow label (resolves to the valve midpoint position)

If an id is not found in any namespace, treat it as a `ParseError`.

### Name collision rule
A flow's `label` and an `aux` name **must not be identical**. If they are, emit a `ParseError`.

### Inline comment restriction
The polarity token is located using `lastIndexOf('(')` and `lastIndexOf(')')` on the trimmed line. This means any `(...)` appearing **after** the polarity in an inline comment will be mistaken for the polarity. Example:

```
connector sale <- order_filling (+)   # see loop (B1)   ← ERROR: parses (B1) as polarity
```

This is a known parser limitation. The workaround is to avoid parentheses in inline comments on `flow`, `connector`, and `aux` lines. Document this rule in `requirements.md` and `README.md`. A proper fix would strip the `#`-comment before scanning for polarity.

## Layout Heuristic
1. Stocks placed in a **horizontal row**, centred vertically, evenly spaced (spacing: 220px)
2. Clouds placed **inline with connected stock** — source left, sink right (offset: 160px)
3. Auxiliaries placed **above** the stock they most directly influence (offset: −120px vertical)
4. Two auxiliaries on the same stock: offset horizontally (±80px)
5. All positions in SVG user units

## Drag Behaviour
- Use `d3.drag()` attached to each node group (`<g>` element)
- On `drag` event: update node `x`/`y` in live model, then call `renderer.redrawConnectors()`
- `redrawConnectors()` recomputes and redraws **all** flows, valve positions, and connector paths
- Do **not** redraw only connectors touching the dragged node — redraw all (simpler, fast enough)
- Use `d3.pointer(event, svgElement)` — not raw `event.clientX/Y`
