import { describe, it, expect } from 'vitest';
import { iffLayout } from '../src/iff/layout';
import type { IFFModel, IFFProcess, IFFStore } from '../src/iff/types';

function baseStore(id: string): IFFStore {
  return { kind: 'store', id, label: id, locationType: 'master', state: 'current', x: 0, y: 0 };
}

function baseProcess(id: string): IFFProcess {
  return { kind: 'process', id, label: id, system: 'SystemA', state: 'current', x: 0, y: 0 };
}

function modelWithNodes(nodes: Array<IFFStore | IFFProcess>): IFFModel {
  return {
    meta: { date: '2026-04-25', diagramType: 'infoflow' },
    stores: nodes.filter((node): node is IFFStore => node.kind === 'store'),
    processes: nodes.filter((node): node is IFFProcess => node.kind === 'process'),
    nodes,
    links: [],
    groups: [],
    savedPositions: {},
  };
}

describe('iff layout', () => {
  it('lays out mixed nodes when no saved positions exist', () => {
    const model = modelWithNodes([baseStore('A'), baseProcess('B'), baseStore('C')]);
    iffLayout(model);

    expect(model.nodes.map(node => [node.x, node.y])).toEqual([
      [200, 220],
      [420, 220],
      [640, 220],
    ]);
  });

  it('restores saved positions for both stores and processes', () => {
    const model = modelWithNodes([baseStore('A'), baseProcess('B')]);
    model.savedPositions = { A: { x: 50, y: 60 }, B: { x: 70, y: 80 } };

    iffLayout(model);

    expect(model.nodes.map(node => ({ id: node.id, x: node.x, y: node.y }))).toEqual([
      { id: 'A', x: 50, y: 60 },
      { id: 'B', x: 70, y: 80 },
    ]);
  });

  it('keeps grouped mixed nodes contiguous', () => {
    const model = modelWithNodes([baseStore('A'), baseProcess('B'), baseStore('C')]);
    model.groups = [{ kind: 'group', id: 'g1', label: 'Group', members: ['A', 'B'], labelCorner: 'upper-right' }];

    iffLayout(model);

    expect(model.nodes.find(node => node.id === 'A')).toMatchObject({ x: 200, y: 220 });
    expect(model.nodes.find(node => node.id === 'B')).toMatchObject({ x: 420, y: 220 });
    expect(model.nodes.find(node => node.id === 'C')).toMatchObject({ x: 640, y: 220 });
  });
});
