import type { TMModel } from './types';

const COL_COUNT = 4;
const COL_SPACING = 220;
const ROW_SPACING = 160;
const START_X = 200;
const START_Y = 200;

export function tmLayout(model: TMModel): void {
  const hasSaved = Object.keys(model.savedPositions).some(k => !k.startsWith('__'));
  if (hasSaved) {
    // Apply saved positions to refs that have them; leave others at (0,0) for now
    for (const ref of model.refs) {
      const saved = model.savedPositions[ref.id];
      if (saved) { ref.x = saved.x; ref.y = saved.y; }
    }
    // Second pass: position refs without saved positions in a row below existing ones
    const unsaved = model.refs.filter(r => !model.savedPositions[r.id]);
    unsaved.forEach((ref, idx) => {
      ref.x = START_X + (idx % COL_COUNT) * COL_SPACING;
      ref.y = START_Y + Math.floor(idx / COL_COUNT) * ROW_SPACING;
    });
    return;
  }

  // No saved positions — full auto-layout, group members together
  const placed = new Set<string>();
  let col = 0, row = 0;

  const placeRef = (id: string) => {
    const ref = model.refs.find(r => r.id === id);
    if (!ref || placed.has(id)) return;
    ref.x = START_X + col * COL_SPACING;
    ref.y = START_Y + row * ROW_SPACING;
    placed.add(id);
    col++;
    if (col >= COL_COUNT) { col = 0; row++; }
  };

  // Place boundary members contiguously
  for (const boundary of model.boundaries) {
    for (const memberId of boundary.members) placeRef(memberId);
    // Bump to next row after each boundary so members are grouped visually
    if (col > 0) { col = 0; row++; }
  }

  // Place any remaining ungrouped refs
  for (const ref of model.refs) placeRef(ref.id);
}
