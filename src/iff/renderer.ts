import * as d3 from 'd3';
import type { IFFModel, IFFStore, IFFGroup, IFFLabelCorner, Position } from './types';
import { getTheme } from '../themes';
import type { IFFTheme } from '../themes';
import { pageRect } from '../sd/renderer';
import { STORE_W, STORE_H, elementBounds, getBorderStyle, drawStore } from './shapes';

// ── Group geometry ────────────────────────────────────────────────────────────

const GROUP_PADDING   = 40;
const GROUP_LABEL_PAD = 12;
const GROUP_FONT_SIZE = 12;

interface GroupRect { x: number; y: number; w: number; h: number; }

function computeGroupRect(group: IFFGroup, model: IFFModel): GroupRect {
  const members = group.members
    .map(id => model.stores.find(s => s.id === id))
    .filter((s): s is IFFStore => !!s);

  if (members.length === 0) return { x: 0, y: 0, w: 120, h: 80 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const store of members) {
    const { hw, hh } = elementBounds(store);
    minX = Math.min(minX, store.x - hw);
    minY = Math.min(minY, store.y - hh);
    maxX = Math.max(maxX, store.x + hw);
    maxY = Math.max(maxY, store.y + hh);
  }

  return {
    x: minX - GROUP_PADDING,
    y: minY - GROUP_PADDING,
    w: maxX - minX + 2 * GROUP_PADDING,
    h: maxY - minY + 2 * GROUP_PADDING,
  };
}

function groupLabelAttrs(gr: GroupRect, corner: IFFLabelCorner): { x: number; y: number; anchor: string } {
  switch (corner) {
    case 'upper-left':  return { x: gr.x + GROUP_LABEL_PAD,        y: gr.y + GROUP_LABEL_PAD + GROUP_FONT_SIZE, anchor: 'start' };
    case 'upper-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + GROUP_LABEL_PAD + GROUP_FONT_SIZE, anchor: 'end'   };
    case 'lower-left':  return { x: gr.x + GROUP_LABEL_PAD,        y: gr.y + gr.h - GROUP_LABEL_PAD,            anchor: 'start' };
    case 'lower-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + gr.h - GROUP_LABEL_PAD,            anchor: 'end'   };
  }
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function storeEdge(store: IFFStore, tx: number, ty: number): Position {
  const dx = tx - store.x, dy = ty - store.y;
  if (dx === 0 && dy === 0) return { x: store.x, y: store.y };
  const hw = STORE_W / 2, hh = STORE_H / 2;
  const t  = Math.abs(dx) * hh > Math.abs(dy) * hw
    ? hw / Math.abs(dx)
    : hh / Math.abs(dy);
  return { x: store.x + dx * t, y: store.y + dy * t };
}

// ── Marker definitions ────────────────────────────────────────────────────────

function defineDefsSection(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  theme: IFFTheme,
): void {
  const defs = svg.append('defs');

  defs.append('marker')
    .attr('id', 'iff-arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', theme.connStroke);

  if (theme.glow) {
    const filter = defs.append('filter')
      .attr('id', 'iff-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  }
}

// ── Link drawing ──────────────────────────────────────────────────────────────

function drawLinks(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IFFModel,
  theme: IFFTheme,
): void {
  for (const link of model.links) {
    const fromStore = model.stores.find(s => s.id === link.from);
    const toStore   = model.stores.find(s => s.id === link.to);
    if (!fromStore || !toStore) continue;

    const fromEdge = storeEdge(fromStore, toStore.x, toStore.y);
    const toEdge   = storeEdge(toStore,   fromStore.x, fromStore.y);

    const g = svg.append('g').attr('class', 'iff-link').attr('data-id', link.id);

    g.append('line')
      .attr('x1', fromEdge.x).attr('y1', fromEdge.y)
      .attr('x2', toEdge.x).attr('y2', toEdge.y)
      .attr('stroke', theme.connStroke)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#iff-arrow)');

    const mx = (fromEdge.x + toEdge.x) / 2;
    const my = (fromEdge.y + toEdge.y) / 2;

    const linkLabel = link.transport ? `${link.relationship} [${link.transport}]` : link.relationship;

    g.append('text')
      .attr('x', mx).attr('y', my - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.connStroke)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .text(linkLabel);
  }
}

// ── Store drawing ─────────────────────────────────────────────────────────────

function drawStores(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IFFModel,
  theme: IFFTheme,
): void {
  for (const store of model.stores) {
    const fill   = theme.roles[store.role];
    const border = getBorderStyle(store.state);

    const g = svg.append('g')
      .attr('class', 'iff-node')
      .attr('data-id', store.id)
      .attr('transform', `translate(${store.x},${store.y})`);

    if (theme.glow) g.attr('filter', 'url(#iff-glow)');

    drawStore(g, fill, border, theme.borderStroke);

    g.append('text')
      .attr('x', 0).attr('y', 0)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', theme.labelText)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(store.label);

    // Role badge — small label below store
    g.append('text')
      .attr('x', 0).attr('y', STORE_H / 2 + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', fill)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .attr('font-style', 'italic')
      .text(store.role);
  }
}

// ── Group drawing ─────────────────────────────────────────────────────────────

function drawGroups(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IFFModel,
  theme: IFFTheme,
): void {
  for (const group of model.groups) {
    if (group.members.length === 0) continue;

    const gr = computeGroupRect(group, model);
    const lp = groupLabelAttrs(gr, group.labelCorner);

    const g = svg.append('g')
      .attr('class', 'iff-group')
      .attr('data-id', group.id)
      .style('cursor', 'move');

    g.append('rect')
      .attr('class', 'iff-group-rect')
      .attr('x', gr.x).attr('y', gr.y)
      .attr('width', gr.w).attr('height', gr.h)
      .attr('rx', 8)
      .attr('fill', theme.group.fill)
      .attr('stroke', theme.group.stroke)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '8,4');

    g.append('text')
      .attr('class', 'iff-group-label')
      .attr('x', lp.x).attr('y', lp.y)
      .attr('text-anchor', lp.anchor)
      .attr('fill', theme.group.label)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', `${GROUP_FONT_SIZE}px`)
      .attr('font-style', 'italic')
      .text(group.label);
  }
}

function updateGroupRects(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IFFModel,
): void {
  for (const group of model.groups) {
    if (group.members.length === 0) continue;

    const gr  = computeGroupRect(group, model);
    const lp  = groupLabelAttrs(gr, group.labelCorner);
    const sel = svg.select<SVGGElement>(`g.iff-group[data-id="${group.id}"]`);
    if (sel.empty()) continue;

    sel.select('rect.iff-group-rect')
      .attr('x', gr.x).attr('y', gr.y)
      .attr('width', gr.w).attr('height', gr.h);

    sel.select('text.iff-group-label')
      .attr('x', lp.x).attr('y', lp.y)
      .attr('text-anchor', lp.anchor);
  }
}

// ── Metadata box ──────────────────────────────────────────────────────────────

function drawMetaBox(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IFFModel,
  theme: IFFTheme,
): void {
  const { meta } = model;
  const lines: string[] = [];
  if (meta.name)    lines.push(`name     ${meta.name}`);
  if (meta.version) lines.push(`version  ${meta.version}`);
  lines.push(`date     ${meta.date}`);
  if (meta.author)  lines.push(`author   ${meta.author}`);
  lines.push(`type     information flow`);

  const PAD = 12, LINE_H = 17, BOX_W = 230;
  const BOX_H = lines.length * LINE_H + PAD * 2;
  const p     = pageRect(meta.orientation, meta.size);
  const saved = model.savedPositions['__meta__'];
  const BOX_X = saved?.x ?? (p.x + 16);
  const BOX_Y = saved?.y ?? (p.y + p.h - BOX_H - 16);

  const g = svg.append('g')
    .attr('class', 'meta-box')
    .attr('transform', `translate(${BOX_X},${BOX_Y})`)
    .style('cursor', 'move');

  g.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', BOX_W).attr('height', BOX_H)
    .attr('rx', 4)
    .attr('fill', theme.metaBox.fill)
    .attr('stroke', theme.metaBox.stroke)
    .attr('stroke-width', 1);

  lines.forEach((text, i) => {
    g.append('text')
      .attr('x', PAD).attr('y', PAD + i * LINE_H + 11)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(text);
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────────

type IffSvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

export function attachIffDrag(svg: IffSvgSel, model: IFFModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const [x, y] = d3.pointer(event, svg.node()!);
      const id    = d3.select(this).attr('data-id');
      const store = model.stores.find(s => s.id === id);
      if (!store) return;
      store.x = x;
      store.y = y;
      model.savedPositions[store.id] = { x, y };
      d3.select(this).attr('transform', `translate(${x},${y})`);
      iffRedrawLinks(svg, model);
    })
    .on('end', () => onDragEnd?.());

  svg.selectAll<SVGGElement, unknown>('g.iff-node').call(drag);
}

export function attachIffGroupDrag(svg: IffSvgSel, model: IFFModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const groupId = d3.select(this).attr('data-id');
      const group   = model.groups.find(g => g.id === groupId);
      if (!group) return;

      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      for (const memberId of group.members) {
        const store = model.stores.find(s => s.id === memberId);
        if (!store) continue;
        store.x += ev.dx;
        store.y += ev.dy;
        model.savedPositions[store.id] = { x: store.x, y: store.y };
        svg.select<SVGGElement>(`g.iff-node[data-id="${memberId}"]`)
          .attr('transform', `translate(${store.x},${store.y})`);
      }
      iffRedrawLinks(svg, model);
    })
    .on('end', () => onDragEnd?.());

  svg.selectAll<SVGGElement, unknown>('g.iff-group').call(drag);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function iffRender(svg: IffSvgSel, model: IFFModel): void {
  const theme = getTheme(model.meta.theme).iff;

  svg.selectAll('*').remove();
  defineDefsSection(svg, theme);

  const p = pageRect(model.meta.orientation, model.meta.size);
  svg.append('rect')
    .attr('class', 'canvas-bg')
    .attr('x', 0).attr('y', 0)
    .attr('width', p.x + p.w + 100).attr('height', p.y + p.h + 100)
    .attr('fill', theme.canvasBg);

  drawGroups(svg, model, theme);
  drawLinks(svg, model, theme);
  drawStores(svg, model, theme);
  drawMetaBox(svg, model, theme);
}

export function iffRedrawLinks(svg: IffSvgSel, model: IFFModel): void {
  const theme = getTheme(model.meta.theme).iff;
  svg.selectAll('.iff-link').remove();
  drawLinks(svg, model, theme);
  updateGroupRects(svg, model);
  svg.selectAll('g.iff-node').raise();
  svg.selectAll('.meta-box').raise();
}
