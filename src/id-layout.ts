import type { IDModel } from './types';

const COLS        = 4;
const COL_SPACING = 220;
const ROW_SPACING = 180;
const START_X     = 200;
const START_Y     = 220;

export function idLayout(model: IDModel): void {
  const hasSaved = Object.keys(model.savedPositions).length > 0;

  if (hasSaved) {
    for (const el of model.elements) {
      const pos = model.savedPositions[el.id];
      if (pos) { el.x = pos.x; el.y = pos.y; }
    }
    const missing = model.elements.filter(e => !model.savedPositions[e.id]);
    if (missing.length === 0) return;
  }

  let col = 0, row = 0;
  for (const el of model.elements) {
    if (hasSaved && model.savedPositions[el.id]) continue;
    el.x = START_X + col * COL_SPACING;
    el.y = START_Y + row * ROW_SPACING;
    col++;
    if (col >= COLS) { col = 0; row++; }
  }
}
