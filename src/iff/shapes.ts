import * as d3 from 'd3';
import type { IFFNode, IFFState } from './types';

export const STORE_W = 140;
export const STORE_H = 72;
export const PROCESS_W = 124;
export const PROCESS_H = 72;
export const DRUM_RIM_H = 16;

export interface BorderStyle {
  strokeWidth: number;
  dashArray: string | null;
  fillOpacity: number;
  showCross: boolean;
}

export function getBorderStyle(state: IFFState): BorderStyle {
  switch (state) {
    case 'current':        return { strokeWidth: 2, dashArray: null,  fillOpacity: 1.0, showCross: false };
    case 'new':            return { strokeWidth: 2, dashArray: '2,4', fillOpacity: 1.0, showCross: false };
    case 'changing':       return { strokeWidth: 2, dashArray: '6,4', fillOpacity: 0.5, showCross: false };
    case 'decommissioned': return { strokeWidth: 2, dashArray: null,  fillOpacity: 1.0, showCross: true };
  }
}

export function elementBounds(node: IFFNode): { hw: number; hh: number } {
  if (node.kind === 'process') {
    return { hw: PROCESS_W / 2, hh: PROCESS_H / 2 };
  }
  return { hw: STORE_W / 2, hh: STORE_H / 2 };
}

export function drawNode(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: IFFNode,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  if (node.kind === 'process') {
    const rect = g.append('rect')
      .attr('x', -PROCESS_W / 2).attr('y', -PROCESS_H / 2)
      .attr('width', PROCESS_W).attr('height', PROCESS_H)
      .attr('fill', fill)
      .attr('fill-opacity', border.fillOpacity)
      .attr('stroke', stroke)
      .attr('stroke-width', border.strokeWidth);
    if (border.dashArray) rect.attr('stroke-dasharray', border.dashArray);
    if (border.showCross) {
      g.append('line')
        .attr('x1', -PROCESS_W / 2).attr('y1', -PROCESS_H / 2)
        .attr('x2', PROCESS_W / 2).attr('y2', PROCESS_H / 2)
        .attr('stroke', stroke)
        .attr('stroke-width', 2);
      g.append('line')
        .attr('x1', -PROCESS_W / 2).attr('y1', PROCESS_H / 2)
        .attr('x2', PROCESS_W / 2).attr('y2', -PROCESS_H / 2)
        .attr('stroke', stroke)
        .attr('stroke-width', 2);
    }
    return;
  }

  const topY = -STORE_H / 2 + DRUM_RIM_H / 2;
  const bottomY = STORE_H / 2 - DRUM_RIM_H / 2;
  const rimRx = STORE_W / 2;
  const rimRy = DRUM_RIM_H / 2;

  const bodyPath = [
    `M ${-STORE_W / 2} ${topY}`,
    `L ${-STORE_W / 2} ${bottomY}`,
    `C ${-STORE_W / 4} ${bottomY + rimRy} ${STORE_W / 4} ${bottomY + rimRy} ${STORE_W / 2} ${bottomY}`,
    `L ${STORE_W / 2} ${topY}`,
    `C ${STORE_W / 4} ${topY + rimRy} ${-STORE_W / 4} ${topY + rimRy} ${-STORE_W / 2} ${topY}`,
    'Z',
  ].join(' ');

  const body = g.append('path')
    .attr('d', bodyPath)
    .attr('fill', fill)
    .attr('fill-opacity', border.fillOpacity)
    .attr('stroke', stroke)
    .attr('stroke-width', border.strokeWidth);
  if (border.dashArray) body.attr('stroke-dasharray', border.dashArray);

  g.append('ellipse')
    .attr('cx', 0).attr('cy', topY)
    .attr('rx', rimRx).attr('ry', rimRy)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', border.strokeWidth);

  g.append('ellipse')
    .attr('cx', 0).attr('cy', bottomY)
    .attr('rx', rimRx).attr('ry', rimRy)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', border.strokeWidth);

  if (border.showCross) {
    g.append('line')
      .attr('x1', -STORE_W / 2).attr('y1', -STORE_H / 2)
      .attr('x2', STORE_W / 2).attr('y2', STORE_H / 2)
      .attr('stroke', stroke)
      .attr('stroke-width', 2);
    g.append('line')
      .attr('x1', -STORE_W / 2).attr('y1', STORE_H / 2)
      .attr('x2', STORE_W / 2).attr('y2', -STORE_H / 2)
      .attr('stroke', stroke)
      .attr('stroke-width', 2);
  }
}
