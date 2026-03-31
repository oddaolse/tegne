# Testing

## Approach
- Parser unit tests run via **Vitest**: `npm test`
- Test file: `tests/parser.test.ts`
- Fixtures are read as raw text using Vite's `?raw` import: `import dsl from '../fixtures/population.sd?raw'`
- Visual validation is done by loading fixtures into the editor and inspecting the rendered diagram

## Fixtures
All fixtures are plain `.sd` text files, openable via the Open button in the UI.
The `.ts` wrapper files (TypeScript `dslString` exports) have been deleted — they had no consumers.

| File                | Purpose                                                         |
|---------------------|-----------------------------------------------------------------|
| `population.sd`     | Simple population model — verifies all five element types       |
| `factory_dynamics.sd` | Forrester production-distribution chain — bullwhip effect     |

## Acceptance Criteria
- Each `.sd` file opens via the Open button and renders without errors
- All five element types (stock, cloud, aux, flow, connector) are present and correct in `population.sd`
- All elements in all fixtures are draggable; connectors redraw correctly after drag
- SVG export produces a valid, self-contained `.svg` file for each fixture
- Zoom and pan controls work correctly on all fixtures
