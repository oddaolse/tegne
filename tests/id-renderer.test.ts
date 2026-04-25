import { describe, it, expect } from 'vitest';
import { idFlowStyle } from '../src/id/renderer';

describe('id renderer flow styles', () => {
  it('maps declared dashed flow types to dashed normal-width lines', () => {
    expect(idFlowStyle('async', [{ name: 'async', style: 'dashed' }])).toEqual({
      dashArray: '6,4',
      strokeWidth: 1.5,
    });
  });

  it('maps declared thick flow types to thick solid lines', () => {
    expect(idFlowStyle('batch', [{ name: 'batch', style: 'thick' }])).toEqual({
      dashArray: null,
      strokeWidth: 3,
    });
  });

  it('maps built-in async and batch flow types without declarations', () => {
    expect(idFlowStyle('async', undefined)).toEqual({
      dashArray: '6,4',
      strokeWidth: 1.5,
    });
    expect(idFlowStyle('batch', undefined)).toEqual({
      dashArray: null,
      strokeWidth: 3,
    });
  });

  it('defaults sync and unknown flow types to normal solid lines', () => {
    expect(idFlowStyle('sync', undefined)).toEqual({
      dashArray: null,
      strokeWidth: 1.5,
    });
    expect(idFlowStyle('custom', undefined)).toEqual({
      dashArray: null,
      strokeWidth: 1.5,
    });
  });
});
