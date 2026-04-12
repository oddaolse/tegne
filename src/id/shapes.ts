import * as d3 from 'd3';
import type { IDElement, IDState } from './types';

// ── Shape dimensions ──────────────────────────────────────────────────────────

export const SYS_W     = 140;
export const SYS_H     = 60;
export const DB_W      = 80;
export const DB_BODY_H = 60;
export const DB_RY     = 12;
export const Q_BODY_W  = 100;
export const Q_H       = 40;
export const Q_RX      = 15;

// ── Border style ──────────────────────────────────────────────────────────────

export interface BorderStyle { strokeWidth: number; dashArray: string | null; fillOpacity: number; }

export function getBorderStyle(state: IDState): BorderStyle {
  switch (state) {
    case 'current':        return { strokeWidth: 2, dashArray: null,  fillOpacity: 1.0 };
    case 'new':            return { strokeWidth: 4, dashArray: null,  fillOpacity: 1.0 };
    case 'changing':       return { strokeWidth: 2, dashArray: '6,4', fillOpacity: 0.5 };
    case 'decommissioned': return { strokeWidth: 2, dashArray: '2,4', fillOpacity: 1.0 };
  }
}

// ── Bounding box (for group rect and edge calculations) ───────────────────────

export function elementBounds(el: IDElement): { hw: number; hh: number } {
  switch (el.kind) {
    case 'system':   return { hw: SYS_W / 2,          hh: SYS_H / 2              };
    case 'database': return { hw: DB_W / 2,            hh: (DB_BODY_H + DB_RY) / 2 };
    case 'queue':    return { hw: Q_BODY_W / 2 + Q_RX, hh: Q_H / 2               };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyStroke(
  sel: d3.Selection<SVGElement, unknown, null, undefined>,
  border: BorderStyle,
  stroke: string,
): void {
  sel.attr('stroke', stroke).attr('stroke-width', border.strokeWidth);
  if (border.dashArray) sel.attr('stroke-dasharray', border.dashArray);
}

// ── Shape draw functions ──────────────────────────────────────────────────────

export function drawSystem(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  const rect = g.append('rect')
    .attr('x', -SYS_W / 2).attr('y', -SYS_H / 2)
    .attr('width', SYS_W).attr('height', SYS_H)
    .attr('rx', 4).attr('fill', fill).attr('fill-opacity', border.fillOpacity);
  applyStroke(rect as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}

export function drawDatabase(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  const hw     = DB_W / 2;
  const top    = -DB_BODY_H / 2;
  const bottom =  DB_BODY_H / 2;

  g.append('rect')
    .attr('x', -hw).attr('y', top)
    .attr('width', DB_W).attr('height', DB_BODY_H)
    .attr('fill', fill).attr('fill-opacity', border.fillOpacity).attr('stroke', 'none');

  const mkLine = (x1: number, y1: number, x2: number, y2: number) => {
    const ln = g.append('line')
      .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      .attr('stroke', stroke).attr('stroke-width', border.strokeWidth);
    if (border.dashArray) ln.attr('stroke-dasharray', border.dashArray);
  };
  mkLine(-hw, top, -hw, bottom);
  mkLine( hw, top,  hw, bottom);

  const botEll = g.append('ellipse')
    .attr('cx', 0).attr('cy', bottom)
    .attr('rx', hw).attr('ry', DB_RY).attr('fill', fill).attr('fill-opacity', border.fillOpacity);
  applyStroke(botEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);

  const topEll = g.append('ellipse')
    .attr('cx', 0).attr('cy', top)
    .attr('rx', hw).attr('ry', DB_RY).attr('fill', fill).attr('fill-opacity', border.fillOpacity);
  applyStroke(topEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}

export function drawQueue(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  const hh    = Q_H / 2;
  const left  = -Q_BODY_W / 2;
  const right =  Q_BODY_W / 2;

  g.append('rect')
    .attr('x', left).attr('y', -hh)
    .attr('width', Q_BODY_W).attr('height', Q_H)
    .attr('fill', fill).attr('fill-opacity', border.fillOpacity).attr('stroke', 'none');

  const mkLine = (x1: number, y1: number, x2: number, y2: number) => {
    const ln = g.append('line')
      .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      .attr('stroke', stroke).attr('stroke-width', border.strokeWidth);
    if (border.dashArray) ln.attr('stroke-dasharray', border.dashArray);
  };
  mkLine(left, -hh, right, -hh);
  mkLine(left,  hh, right,  hh);

  const leftEll = g.append('ellipse')
    .attr('cx', left).attr('cy', 0)
    .attr('rx', Q_RX).attr('ry', hh).attr('fill', fill).attr('fill-opacity', border.fillOpacity);
  applyStroke(leftEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);

  const rightEll = g.append('ellipse')
    .attr('cx', right).attr('cy', 0)
    .attr('rx', Q_RX).attr('ry', hh).attr('fill', fill).attr('fill-opacity', border.fillOpacity);
  applyStroke(rightEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}
