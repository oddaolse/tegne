import { describe, it, expect } from 'vitest';
import { iffFlowStyle, iffLinkMarkers, iffNodeEdge } from '../src/iff/renderer';
import { elementBounds, getBorderStyle, PROCESS_H, PROCESS_W, STORE_H, STORE_W } from '../src/iff/shapes';
import type { FlowType } from '../src/types';
import type { IFFProcess, IFFStore } from '../src/iff/types';

describe('iff geometry helpers', () => {
  const store: IFFStore = {
    kind: 'store',
    id: 'store1',
    label: 'Store',
    locationType: 'master',
    state: 'current',
    x: 100,
    y: 100,
  };

  const process: IFFProcess = {
    kind: 'process',
    id: 'proc1',
    label: 'Process',
    system: 'SystemA',
    state: 'current',
    x: 300,
    y: 300,
  };

  it('returns different bounds for stores and processes', () => {
    expect(elementBounds(store)).toEqual({ hw: STORE_W / 2, hh: STORE_H / 2 });
    expect(elementBounds(process)).toEqual({ hw: PROCESS_W / 2, hh: PROCESS_H / 2 });
  });

  it('anchors process edges on the square boundary', () => {
    expect(PROCESS_W).toBeGreaterThan(PROCESS_H);
    const edge = iffNodeEdge(process, 500, 300);
    expect(edge).toEqual({ x: 300 + PROCESS_W / 2, y: 300 });
  });

  it('anchors store edges on the drum boundary', () => {
    const edge = iffNodeEdge(store, 100, 0);
    expect(edge.x).toBeCloseTo(100, 5);
    expect(edge.y).toBeLessThan(100 - STORE_H / 4);
  });

  it('maps dashed and thick flow styles from declarations', () => {
    const flowTypes: FlowType[] = [
      { name: 'async', style: 'dashed' },
      { name: 'batch', style: 'thick' },
    ];

    expect(iffFlowStyle('async', flowTypes)).toEqual({ dashArray: '6,4', strokeWidth: 1.5 });
    expect(iffFlowStyle('batch', flowTypes)).toEqual({ dashArray: null, strokeWidth: 3 });
  });

  it('falls back to solid styling for undeclared flow types', () => {
    expect(iffFlowStyle('sync', undefined)).toEqual({ dashArray: null, strokeWidth: 1.5 });
    expect(iffFlowStyle(undefined, undefined)).toEqual({ dashArray: null, strokeWidth: 1.5 });
  });

  it('maps link direction to SVG marker placement', () => {
    expect(iffLinkMarkers('unidirectional')).toEqual({ markerStart: null, markerEnd: 'url(#iff-arrow)' });
    expect(iffLinkMarkers('bidirectional')).toEqual({ markerStart: 'url(#iff-arrow)', markerEnd: 'url(#iff-arrow)' });
  });

  it('uses dotted borders for new and X markers for decommissioned', () => {
    expect(getBorderStyle('new')).toMatchObject({ dashArray: '2,4', strokeWidth: 2, showCross: false });
    expect(getBorderStyle('decommissioned')).toMatchObject({ dashArray: null, strokeWidth: 2, showCross: true });
    expect(getBorderStyle('current')).toMatchObject({ dashArray: null, showCross: false });
    expect(getBorderStyle('changing')).toMatchObject({ dashArray: '6,4', showCross: false });
  });
});
