import type { IFFModel } from './types';

const COLS        = 4;
const COL_SPACING = 220;
const ROW_SPACING = 180;
const START_X     = 200;
const START_Y     = 220;

export function iffLayout(model: IFFModel): void {
  const hasSaved = Object.keys(model.savedPositions).length > 0;

  if (hasSaved) {
    for (const store of model.stores) {
      const pos = model.savedPositions[store.id];
      if (pos) { store.x = pos.x; store.y = pos.y; }
    }
    if (model.stores.every(s => model.savedPositions[s.id])) return;
  }

  // Place group members in contiguous row-aligned blocks, then ungrouped stores.
  // A group that would spill across a row boundary is pushed to the next row.
  let col = 0;
  let row = 0;
  const groupedIds = new Set<string>();

  for (const group of model.groups) {
    const members = group.members
      .map(id => model.stores.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .filter(s => !(hasSaved && model.savedPositions[s.id]));

    for (const id of group.members) groupedIds.add(id);
    if (members.length === 0) continue;

    if (col > 0 && col + members.length > COLS) {
      row++;
      col = 0;
    }

    for (const store of members) {
      store.x = START_X + col * COL_SPACING;
      store.y = START_Y + row * ROW_SPACING;
      col++;
      if (col >= COLS) { col = 0; row++; }
    }
  }

  for (const store of model.stores) {
    if (hasSaved && model.savedPositions[store.id]) continue;
    if (groupedIds.has(store.id)) continue;

    store.x = START_X + col * COL_SPACING;
    store.y = START_Y + row * ROW_SPACING;
    col++;
    if (col >= COLS) { col = 0; row++; }
  }
}
