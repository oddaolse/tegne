import * as d3 from 'd3';
import type { SDModel, Node } from './types';
import { redrawConnectors, type SvgSel } from './renderer';

export function attachDrag(svg: SvgSel, model: SDModel): void {
  const drag = d3.drag<SVGGElement, Node>()
    .on('drag', function (event, d) {
      const [x, y] = d3.pointer(event, svg.node()!);
      d.x = x;
      d.y = y;
      d3.select(this).attr('transform', `translate(${x},${y})`);
      redrawConnectors(svg, model);
    });

  svg.selectAll<SVGGElement, Node>('g.node').call(drag);
}
