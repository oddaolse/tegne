import type { IFFModel } from './types';

const COLS        = 4;
const COL_SPACING = 220;
const ROW_SPACING = 180;
const START_X     = 200;
const START_Y     = 220;

export function iffLayout(model: IFFModel): void {
  const hasSaved = Object.keys(model.savedPositions).length > 0;

  if (hasSaved) {
    for (const node of model.nodes) {
      const pos = model.savedPositions[node.id];
      if (pos) { node.x = pos.x; node.y = pos.y; }
    }
    if (model.nodes.every(node => model.savedPositions[node.id])) return;
  }

  // Place group members in contiguous row-aligned blocks, then ungrouped stores.
  // A group that would spill across a row boundary is pushed to the next row.
  let col = 0;
  let row = 0;
  const groupedIds = new Set<string>();

  for (const group of model.groups) {
    const members = group.members
      .map(id => model.nodes.find(node => node.id === id))
      .filter((node): node is NonNullable<typeof node> => !!node)
      .filter(node => !(hasSaved && model.savedPositions[node.id]));

    for (const id of group.members) groupedIds.add(id);
    if (members.length === 0) continue;

    if (col > 0 && col + members.length > COLS) {
      row++;
      col = 0;
    }

    for (const node of members) {
      node.x = START_X + col * COL_SPACING;
      node.y = START_Y + row * ROW_SPACING;
      col++;
      if (col >= COLS) { col = 0; row++; }
    }
  }

  for (const node of model.nodes) {
    if (hasSaved && model.savedPositions[node.id]) continue;
    if (groupedIds.has(node.id)) continue;

    node.x = START_X + col * COL_SPACING;
    node.y = START_Y + row * ROW_SPACING;
    col++;
    if (col >= COLS) { col = 0; row++; }
  }
}
