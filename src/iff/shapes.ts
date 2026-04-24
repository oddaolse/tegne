import * as d3 from 'd3';
import type { IFFStore, IFFState } from './types';

// ── Shape dimensions ──────────────────────────────────────────────────────────

export const STORE_W = 140;
export const STORE_H = 60;

// ── Border style ──────────────────────────────────────────────────────────────

export interface BorderStyle { strokeWidth: number; dashArray: string | null; fillOpacity: number; }

export function getBorderStyle(state: IFFState): BorderStyle {
  switch (state) {
    case 'current':        return { strokeWidth: 2, dashArray: null,  fillOpacity: 1.0 };
    case 'new':            return { strokeWidth: 4, dashArray: null,  fillOpacity: 1.0 };
    case 'changing':       return { strokeWidth: 2, dashArray: '6,4', fillOpacity: 0.5 };
    case 'decommissioned': return { strokeWidth: 2, dashArray: '2,4', fillOpacity: 1.0 };
  }
}

// ── Bounding box ──────────────────────────────────────────────────────────────

export function elementBounds(_store: IFFStore): { hw: number; hh: number } {
  return { hw: STORE_W / 2, hh: STORE_H / 2 };
}

// ── Shape draw function ───────────────────────────────────────────────────────

export function drawStore(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  const rect = g.append('rect')
    .attr('x', -STORE_W / 2).attr('y', -STORE_H / 2)
    .attr('width', STORE_W).attr('height', STORE_H)
    .attr('rx', 8)
    .attr('fill', fill)
    .attr('fill-opacity', border.fillOpacity)
    .attr('stroke', stroke)
    .attr('stroke-width', border.strokeWidth);
  if (border.dashArray) rect.attr('stroke-dasharray', border.dashArray);
}
