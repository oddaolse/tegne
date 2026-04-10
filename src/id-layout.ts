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
    if (model.elements.every(e => model.savedPositions[e.id])) return;
  }

  // Place group members in contiguous row-aligned blocks, then ungrouped elements.
  // A group that would spill across a row boundary is pushed to the next row so
  // its members always land in a single horizontal band.
  let col = 0;
  let row = 0;
  const groupedIds = new Set<string>();

  for (const group of model.groups) {
    const members = group.members
      .map(id => model.elements.find(e => e.id === id))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .filter(e => !(hasSaved && model.savedPositions[e.id]));

    for (const id of group.members) groupedIds.add(id);
    if (members.length === 0) continue;

    // If the group won't fit on the current row, wrap first
    if (col > 0 && col + members.length > COLS) {
      row++;
      col = 0;
    }

    for (const el of members) {
      el.x = START_X + col * COL_SPACING;
      el.y = START_Y + row * ROW_SPACING;
      col++;
      if (col >= COLS) { col = 0; row++; }
    }
  }

  // Ungrouped elements continue from where groups left off
  for (const el of model.elements) {
    if (hasSaved && model.savedPositions[el.id]) continue;
    if (groupedIds.has(el.id)) continue;

    el.x = START_X + col * COL_SPACING;
    el.y = START_Y + row * ROW_SPACING;
    col++;
    if (col >= COLS) { col = 0; row++; }
  }
}
