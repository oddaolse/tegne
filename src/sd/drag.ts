import * as d3 from 'd3';
import type { SDModel, Node } from './types';
import { redrawConnectors, type SvgSel } from './renderer';

export function attachDrag(svg: SvgSel, model: SDModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, Node>()
    .on('drag', function (event, d) {
      const [x, y] = d3.pointer(event, svg.node()!);
      d.x = x;
      d.y = y;
      model.savedPositions[d.id] = { x, y };
      d3.select(this).attr('transform', `translate(${x},${y})`);
      redrawConnectors(svg, model);
    })
    .on('end', () => onDragEnd?.());

  svg.selectAll<SVGGElement, Node>('g.node').call(drag);
}

export function attachGroupDrag(svg: SvgSel, model: SDModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const groupId = d3.select(this).attr('data-id');
      const group   = model.groups.find(g => g.id === groupId);
      if (!group) return;

      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      for (const memberId of group.members) {
        // Find the member node (stock or aux)
        const stock = model.stocks.find(s => s.id === memberId);
        const aux   = model.auxiliaries.find(a => a.id === memberId);
        const node  = stock ?? aux;
        if (!node) continue;

        node.x += ev.dx;
        node.y += ev.dy;
        model.savedPositions[node.id] = { x: node.x, y: node.y };
        svg.select<SVGGElement>(`g.node[data-id="${memberId}"]`)
          .attr('transform', `translate(${node.x},${node.y})`);
      }
      redrawConnectors(svg, model);
    })
    .on('end', () => onDragEnd?.());

  svg.selectAll<SVGGElement, unknown>('g.sd-group').call(drag);
}
