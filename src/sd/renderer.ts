import * as d3 from 'd3';
import type { SDModel, SDGroup, SDLabelCorner, Node, Stock, Auxiliary, Flow, FlowStrength, Position } from './types';
import { getTheme } from '../themes';
import type { Theme } from '../themes';

// ── Page dimensions ───────────────────────────────────────────────────────────
// All sizes use the same physical scale (≈4.175 SVG units/mm, from A4 landscape).
// Each step is ×√2 in both dimensions.  Portrait = landscape with w/h swapped.
// x=30, y=12 margin is consistent across all sizes.
const PAGE_MARGIN = { x: 30, y: 12 } as const;

const PAGE_RECTS = {
  a4: { landscape: { ...PAGE_MARGIN, w: 1240, h:  876 }, portrait: { ...PAGE_MARGIN, w:  876, h: 1240 } },
  a3: { landscape: { ...PAGE_MARGIN, w: 1754, h: 1240 }, portrait: { ...PAGE_MARGIN, w: 1240, h: 1754 } },
  a2: { landscape: { ...PAGE_MARGIN, w: 2480, h: 1754 }, portrait: { ...PAGE_MARGIN, w: 1754, h: 2480 } },
  a1: { landscape: { ...PAGE_MARGIN, w: 3508, h: 2480 }, portrait: { ...PAGE_MARGIN, w: 2480, h: 3508 } },
  a0: { landscape: { ...PAGE_MARGIN, w: 4960, h: 3508 }, portrait: { ...PAGE_MARGIN, w: 3508, h: 4960 } },
} as const;

export const VALID_PAGE_SIZES = Object.keys(PAGE_RECTS) as Array<keyof typeof PAGE_RECTS>;

export function pageRect(orientation?: string, size?: string) {
  const s = (size && size in PAGE_RECTS) ? size as keyof typeof PAGE_RECTS : 'a4';
  return orientation === 'portrait' ? PAGE_RECTS[s].portrait : PAGE_RECTS[s].landscape;
}

// ── Node geometry ─────────────────────────────────────────────────────────────
const STOCK_W  = 120;
const STOCK_H  = 50;
const AUX_R    = 28;
const CLOUD_RX = 38;  // approximate ellipse radii for cloud intersection
const CLOUD_RY = 26;
const VALVE_R  = 12;

// ── Group geometry ────────────────────────────────────────────────────────────
const GROUP_PADDING   = 40;
const GROUP_LABEL_PAD = 12;
const GROUP_FONT_SIZE = 12;

interface GroupRect { x: number; y: number; w: number; h: number; }

function nodeBounds(node: Node): { hw: number; hh: number } {
  switch (node.kind) {
    case 'stock': return { hw: STOCK_W / 2, hh: STOCK_H / 2 };
    case 'cloud': return { hw: CLOUD_RX,    hh: CLOUD_RY };
    case 'aux':   return { hw: AUX_R,       hh: AUX_R };
  }
}

function computeGroupRect(group: SDGroup, model: SDModel): GroupRect {
  const members = group.members
    .map(id => model.stocks.find(s => s.id === id) ?? model.auxiliaries.find(a => a.id === id))
    .filter((n): n is Stock | Auxiliary => !!n);

  if (members.length === 0) return { x: 0, y: 0, w: 120, h: 80 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of members) {
    const { hw, hh } = nodeBounds(node);
    minX = Math.min(minX, node.x - hw);
    minY = Math.min(minY, node.y - hh);
    maxX = Math.max(maxX, node.x + hw);
    maxY = Math.max(maxY, node.y + hh);
  }

  return {
    x: minX - GROUP_PADDING,
    y: minY - GROUP_PADDING,
    w: maxX - minX + 2 * GROUP_PADDING,
    h: maxY - minY + 2 * GROUP_PADDING,
  };
}

function groupLabelAttrs(gr: GroupRect, corner: SDLabelCorner): { x: number; y: number; anchor: string } {
  switch (corner) {
    case 'upper-left':  return { x: gr.x + GROUP_LABEL_PAD,        y: gr.y + GROUP_LABEL_PAD + GROUP_FONT_SIZE, anchor: 'start' };
    case 'upper-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + GROUP_LABEL_PAD + GROUP_FONT_SIZE, anchor: 'end'   };
    case 'lower-left':  return { x: gr.x + GROUP_LABEL_PAD,        y: gr.y + gr.h - GROUP_LABEL_PAD,            anchor: 'start' };
    case 'lower-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + gr.h - GROUP_LABEL_PAD,            anchor: 'end'   };
  }
}

// Forrester cloud path centered at (0,0) — approx 76×52px
const CLOUD_PATH =
  'M 0 24 C 10 30 28 28 30 16 C 40 16 40 2 30 -2 ' +
  'C 34 -16 22 -24 12 -20 C 8 -30 -8 -30 -12 -20 ' +
  'C -22 -24 -34 -16 -30 -2 C -40 2 -40 16 -30 16 ' +
  'C -28 28 -10 30 0 24 Z';

// ── Colour / style helpers ────────────────────────────────────────────────────
interface PipeStyle { stroke: string; strokeWidth: number; dashArray: string; }

function pipeStyle(strength: FlowStrength, theme: Theme): PipeStyle {
  switch (strength) {
    case 'strong': return { stroke: theme.flow.strong, strokeWidth: 3,   dashArray: 'none' };
    case 'medium': return { stroke: theme.flow.medium, strokeWidth: 2,   dashArray: '8,4'  };
    case 'weak':   return { stroke: theme.flow.weak,   strokeWidth: 1.5, dashArray: '2,4'  };
  }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function rectEdge(cx: number, cy: number, tx: number, ty: number, hw: number, hh: number): Position {
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.abs(dx) * hh > Math.abs(dy) * hw
    ? hw / Math.abs(dx)
    : hh / Math.abs(dy);
  return { x: cx + dx * t, y: cy + dy * t };
}

function circleEdge(cx: number, cy: number, tx: number, ty: number, r: number): Position {
  const dx = tx - cx, dy = ty - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: cx + dx / len * r, y: cy + dy / len * r };
}

function ellipseEdge(cx: number, cy: number, tx: number, ty: number, rx: number, ry: number): Position {
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const angle = Math.atan2(dy, dx);
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

function nodeEdge(node: Node, tx: number, ty: number): Position {
  switch (node.kind) {
    case 'stock': return rectEdge(node.x, node.y, tx, ty, STOCK_W / 2, STOCK_H / 2);
    case 'cloud': return ellipseEdge(node.x, node.y, tx, ty, CLOUD_RX, CLOUD_RY);
    case 'aux':   return circleEdge(node.x, node.y, tx, ty, AUX_R);
  }
}

function findNode(id: string, model: SDModel): Node | undefined {
  return model.stocks.find(s => s.id === id)
      ?? model.clouds.find(c => c.id === id)
      ?? model.auxiliaries.find(a => a.id === id);
}

function valvePosition(flow: Flow, model: SDModel): Position {
  const fromNode = findNode(flow.from, model);
  const toNode   = findNode(flow.to,   model);
  if (!fromNode || !toNode) return { x: 0, y: 0 };
  const fromEdge = nodeEdge(fromNode, toNode.x, toNode.y);
  const toEdge   = nodeEdge(toNode,   fromNode.x, fromNode.y);
  return { x: (fromEdge.x + toEdge.x) / 2, y: (fromEdge.y + toEdge.y) / 2 };
}

function resolvePosition(id: string, model: SDModel): Position | undefined {
  const node = findNode(id, model);
  if (node) return { x: node.x, y: node.y };
  const flow = model.flows.find(f => f.label === id);
  if (flow) return valvePosition(flow, model);
  return undefined;
}

function resolveEdge(id: string, model: SDModel, toward: Position): Position | undefined {
  const node = findNode(id, model);
  if (node) return nodeEdge(node, toward.x, toward.y);
  const flow = model.flows.find(f => f.label === id);
  if (flow) return valvePosition(flow, model);  // valve has no radius to subtract
  return undefined;
}


// ── Marker definitions ────────────────────────────────────────────────────────

function defineMarkers(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, theme: Theme): void {
  const defs = svg.append('defs');

  const arrowConfigs: { id: string; fill: string }[] = [
    { id: 'arrow-strong',              fill: theme.flow.strong },
    { id: 'arrow-medium',              fill: theme.flow.medium },
    { id: 'arrow-weak',                fill: theme.flow.weak },
    { id: 'arrow-connector-positive',  fill: theme.connector.stroke },
    { id: 'arrow-connector-negative',  fill: theme.polarity.negative },
  ];

  for (const cfg of arrowConfigs) {
    defs.append('marker')
      .attr('id', cfg.id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', cfg.fill);
  }
}

// ── Group drawing ─────────────────────────────────────────────────────────────

function drawGroups(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  for (const group of model.groups) {
    if (group.members.length === 0) continue;

    const gr = computeGroupRect(group, model);
    const lp = groupLabelAttrs(gr, group.labelCorner);

    const g = svg.append('g')
      .attr('class', 'sd-group')
      .attr('data-id', group.id)
      .style('cursor', 'move');

    g.append('rect')
      .attr('class', 'sd-group-rect')
      .attr('x', gr.x).attr('y', gr.y)
      .attr('width', gr.w).attr('height', gr.h)
      .attr('rx', 8)
      .attr('fill', theme.group.fill)
      .attr('stroke', theme.group.stroke)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '8,4');

    g.append('text')
      .attr('class', 'sd-group-label')
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
  model: SDModel,
): void {
  for (const group of model.groups) {
    if (group.members.length === 0) continue;

    const gr  = computeGroupRect(group, model);
    const lp  = groupLabelAttrs(gr, group.labelCorner);
    const sel = svg.select<SVGGElement>(`g.sd-group[data-id="${group.id}"]`);
    if (sel.empty()) continue;

    sel.select('rect.sd-group-rect')
      .attr('x', gr.x).attr('y', gr.y)
      .attr('width', gr.w).attr('height', gr.h);

    sel.select('text.sd-group-label')
      .attr('x', lp.x).attr('y', lp.y)
      .attr('text-anchor', lp.anchor);
  }
}

// ── Flow drawing ──────────────────────────────────────────────────────────────

function drawFlows(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  for (const flow of model.flows) {
    const fromNode = findNode(flow.from, model);
    const toNode   = findNode(flow.to,   model);
    if (!fromNode || !toNode) continue;

    const toEdge   = nodeEdge(toNode,   fromNode.x, fromNode.y);
    const fromEdge = nodeEdge(fromNode, toNode.x,   toNode.y);
    const valve    = { x: (fromEdge.x + toEdge.x) / 2, y: (fromEdge.y + toEdge.y) / 2 };

    const style    = pipeStyle(flow.strength, theme);
    const markerId = `arrow-${flow.strength}`;
    const dashAttr = style.dashArray === 'none' ? null : style.dashArray;

    const g = svg.append('g').attr('class', 'flow-group').attr('data-id', flow.id);

    // Pipe segment: from-edge → valve
    const seg1 = g.append('line')
      .attr('x1', fromEdge.x).attr('y1', fromEdge.y)
      .attr('x2', valve.x).attr('y2', valve.y)
      .attr('stroke', style.stroke)
      .attr('stroke-width', style.strokeWidth);
    if (dashAttr) seg1.attr('stroke-dasharray', dashAttr);

    // Pipe segment: valve → to-edge (with arrowhead)
    const seg2 = g.append('line')
      .attr('x1', valve.x).attr('y1', valve.y)
      .attr('x2', toEdge.x).attr('y2', toEdge.y)
      .attr('stroke', style.stroke)
      .attr('stroke-width', style.strokeWidth)
      .attr('marker-end', `url(#${markerId})`);
    if (dashAttr) seg2.attr('stroke-dasharray', dashAttr);

    // Valve circle
    g.append('circle')
      .attr('cx', valve.x).attr('cy', valve.y)
      .attr('r', VALVE_R)
      .attr('fill', theme.flow.valveFill)
      .attr('stroke', style.stroke)
      .attr('stroke-width', style.strokeWidth);

    // ⊗ glyph
    g.append('text')
      .attr('x', valve.x).attr('y', valve.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', style.stroke)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '12px')
      .text('⊗');

    // Flow label (above valve)
    g.append('text')
      .attr('x', valve.x).attr('y', valve.y - VALVE_R - 5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('fill', theme.flow.label)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(flow.label);

    // Polarity label near arrowhead
    const polarityX = toEdge.x + (valve.x - toEdge.x) * 0.2;
    const polarityY = toEdge.y + (valve.y - toEdge.y) * 0.2 - 8;
    const polarityColour = flow.polarity === '+'
      ? theme.polarity.positive
      : theme.polarity.negative;
    g.append('text')
      .attr('x', polarityX).attr('y', polarityY)
      .attr('text-anchor', 'middle')
      .attr('fill', polarityColour)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '15px')
      .attr('font-weight', 'bold')
      .text(flow.polarity === '+' ? '+' : '−');
  }
}

// ── Connector drawing ─────────────────────────────────────────────────────────

function connectorCurve(x1: number, y1: number, x2: number, y2: number): string {
  const dx  = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector
  const px  = -dy / len, py = dx / len;
  const curve = Math.max(55, len * 0.35);
  const cpx = (x1 + x2) / 2 + px * curve;
  const cpy = (y1 + y2) / 2 + py * curve;
  return `M ${x1},${y1} Q ${cpx},${cpy} ${x2},${y2}`;
}

function drawConnectors(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  for (const conn of model.connectors) {
    const fromPos = resolvePosition(conn.from, model);
    const toPos   = resolvePosition(conn.to,   model);
    if (!fromPos || !toPos) continue;

    const fromEdge = resolveEdge(conn.from, model, toPos)   ?? fromPos;
    const toEdge   = resolveEdge(conn.to,   model, fromPos) ?? toPos;

    const connStroke  = conn.polarity === '+' ? theme.connector.stroke : theme.polarity.negative;
    const connMarker  = conn.polarity === '+' ? 'arrow-connector-positive' : 'arrow-connector-negative';

    const g = svg.append('g').attr('class', 'connector-group').attr('data-id', conn.id);

    g.append('path')
      .attr('d', connectorCurve(fromEdge.x, fromEdge.y, toEdge.x, toEdge.y))
      .attr('fill', 'none')
      .attr('stroke', connStroke)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,3')
      .attr('marker-end', `url(#${connMarker})`);

    // Polarity label near arrowhead
    const dx  = toEdge.x - fromEdge.x, dy = toEdge.y - fromEdge.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const lx  = toEdge.x - dx / len * 20 - dy / len * 14;
    const ly  = toEdge.y - dy / len * 20 + dx / len * 14;

    const connPolarityColour = conn.polarity === '+'
      ? theme.polarity.positive
      : theme.polarity.negative;
    g.append('text')
      .attr('x', lx).attr('y', ly)
      .attr('text-anchor', 'middle')
      .attr('fill', connPolarityColour)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '15px')
      .attr('font-weight', 'bold')
      .text(conn.polarity === '+' ? '+' : '−');
  }
}

// ── Node drawing ──────────────────────────────────────────────────────────────

function drawStocks(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  const groups = svg.selectAll<SVGGElement, typeof model.stocks[0]>('g.node-stock')
    .data(model.stocks, d => d.id)
    .join('g')
    .attr('class', 'node node-stock')
    .attr('data-id', d => d.id)
    .attr('transform', d => `translate(${d.x},${d.y})`);

  groups.append('rect')
    .attr('x', -STOCK_W / 2).attr('y', -STOCK_H / 2)
    .attr('width', STOCK_W).attr('height', STOCK_H)
    .attr('rx', 6)
    .attr('fill', theme.stock.fill)
    .attr('stroke', theme.stock.stroke)
    .attr('stroke-width', 2);

  groups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', theme.stock.text)
    .attr('font-family', 'Courier New, Courier, monospace')
    .attr('font-size', '12px')
    .text(d => d.label);

  if (model.meta.showIds) {
    groups.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', STOCK_H / 2 + 14)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '9px')
      .attr('font-style', 'italic')
      .text(d => `[${d.id}]`);
  }
}

function drawClouds(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  const groups = svg.selectAll<SVGGElement, typeof model.clouds[0]>('g.node-cloud')
    .data(model.clouds, d => d.id)
    .join('g')
    .attr('class', 'node node-cloud')
    .attr('data-id', d => d.id)
    .attr('transform', d => `translate(${d.x},${d.y})`);

  groups.append('path')
    .attr('d', CLOUD_PATH)
    .attr('fill', theme.cloud.fill)
    .attr('stroke', theme.cloud.stroke)
    .attr('stroke-width', 1.5);

  groups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', theme.cloud.text)
    .attr('font-family', 'Courier New, Courier, monospace')
    .attr('font-size', '10px')
    .text(d => d.label);

  if (model.meta.showIds) {
    groups.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', CLOUD_RY + 14)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '9px')
      .attr('font-style', 'italic')
      .text(d => `[${d.id}]`);
  }
}

function drawAuxiliaries(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  const groups = svg.selectAll<SVGGElement, typeof model.auxiliaries[0]>('g.node-aux')
    .data(model.auxiliaries, d => d.id)
    .join('g')
    .attr('class', 'node node-aux')
    .attr('data-id', d => d.id)
    .attr('transform', d => `translate(${d.x},${d.y})`);

  groups.append('circle')
    .attr('r', AUX_R)
    .attr('fill', theme.aux.fill)
    .attr('stroke', theme.aux.stroke)
    .attr('stroke-width', 1.5);

  groups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', theme.aux.text)
    .attr('font-family', 'Courier New, Courier, monospace')
    .attr('font-size', '10px')
    .text(d => d.label);

  if (model.meta.showIds) {
    groups.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', AUX_R + 12)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '9px')
      .attr('font-style', 'italic')
      .text(d => `[${d.id}]`);
  }
}

// ── Metadata box ──────────────────────────────────────────────────────────────

function drawMetaBox(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: SDModel,
  theme: Theme,
): void {
  const { meta } = model;
  const lines: string[] = [];
  if (meta.name)    lines.push(`name     ${meta.name}`);
  if (meta.version) lines.push(`version  ${meta.version}`);
  lines.push(`date     ${meta.date}`);
  if (meta.author)  lines.push(`author   ${meta.author}`);

  const PAD    = 12;
  const LINE_H = 17;
  const BOX_W  = 230;
  const BOX_H  = lines.length * LINE_H + PAD * 2;
  const p      = pageRect(meta.orientation, meta.size);
  const saved  = model.savedPositions['__meta__'];
  const BOX_X  = saved?.x ?? (p.x + 16);
  const BOX_Y  = saved?.y ?? (p.y + p.h - BOX_H - 16);

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
      .attr('x', PAD)
      .attr('y', PAD + i * LINE_H + 11)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(text);
  });
}

export function attachMetaBoxDrag(
  svg: SvgSel,
  model: { savedPositions: Record<string, Position> },
  onDragEnd?: () => void,
): void {
  let cx = 0, cy = 0;
  const drag = d3.drag<SVGGElement, unknown>()
    .on('start', function () {
      const t = d3.select(this).attr('transform') ?? '';
      const m = t.match(/translate\(([^,]+),\s*([^)]+)\)/);
      cx = m ? parseFloat(m[1]) : 0;
      cy = m ? parseFloat(m[2]) : 0;
    })
    .on('drag', function (event) {
      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      cx += ev.dx;
      cy += ev.dy;
      model.savedPositions['__meta__'] = { x: Math.round(cx), y: Math.round(cy) };
      d3.select(this).attr('transform', `translate(${cx},${cy})`);
    })
    .on('end', () => onDragEnd?.());
  svg.select<SVGGElement>('g.meta-box').call(drag);
}

// ── Legend box ────────────────────────────────────────────────────────────────

function drawSDLegendBox(svg: SvgSel, model: SDModel, theme: Theme): void {
  const PAD      = 12;
  const LINE_H   = 24;
  const ICON_W   = 36;
  const ICON_H   = 16;
  const BOX_W    = 190;
  const HEADER_H = LINE_H;

  interface LegendEntry { label: string; draw: (g: d3.Selection<SVGGElement, unknown, null, undefined>) => void; }
  const entries: LegendEntry[] = [];

  if (model.stocks.length > 0) {
    entries.push({ label: 'stock', draw: g => {
      g.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', ICON_W).attr('height', ICON_H)
        .attr('rx', 3)
        .attr('fill', theme.stock.fill)
        .attr('stroke', theme.stock.stroke)
        .attr('stroke-width', 1.5);
    }});
  }

  if (model.clouds.length > 0) {
    entries.push({ label: 'cloud', draw: g => {
      const sx = ICON_W / 76, sy = ICON_H / 52;
      g.append('path')
        .attr('d', CLOUD_PATH)
        .attr('transform', `translate(${ICON_W / 2},${ICON_H / 2}) scale(${sx},${sy})`)
        .attr('fill', theme.cloud.fill)
        .attr('stroke', theme.cloud.stroke)
        .attr('stroke-width', 1);
    }});
  }

  if (model.auxiliaries.length > 0) {
    entries.push({ label: 'auxiliary', draw: g => {
      g.append('circle')
        .attr('cx', ICON_W / 2).attr('cy', ICON_H / 2)
        .attr('r', ICON_H / 2)
        .attr('fill', theme.aux.fill)
        .attr('stroke', theme.aux.stroke)
        .attr('stroke-width', 1.5);
    }});
  }

  if (model.flows.length > 0) {
    entries.push({ label: 'flow', draw: g => {
      g.append('line')
        .attr('x1', 0).attr('y1', ICON_H / 2)
        .attr('x2', ICON_W).attr('y2', ICON_H / 2)
        .attr('stroke', theme.flow.medium)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '8,4');
      g.append('circle')
        .attr('cx', ICON_W / 2).attr('cy', ICON_H / 2)
        .attr('r', 5)
        .attr('fill', theme.flow.valveFill)
        .attr('stroke', theme.flow.medium)
        .attr('stroke-width', 1.5);
    }});
  }

  if (model.connectors.length > 0) {
    entries.push({ label: 'connector', draw: g => {
      g.append('line')
        .attr('x1', 0).attr('y1', ICON_H / 2)
        .attr('x2', ICON_W).attr('y2', ICON_H / 2)
        .attr('stroke', theme.connector.stroke)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3');
    }});
  }

  if (entries.length === 0) return;

  const BOX_H = PAD * 2 + HEADER_H + entries.length * LINE_H;
  const p     = pageRect(model.meta.orientation, model.meta.size);
  const saved = model.savedPositions['__legend__'];
  const BOX_X = saved?.x ?? (p.x + p.w - BOX_W - 16);
  const BOX_Y = saved?.y ?? (p.y + 16);

  const g = svg.append('g')
    .attr('class', 'legend-box')
    .attr('transform', `translate(${BOX_X},${BOX_Y})`)
    .style('cursor', 'move');

  g.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', BOX_W).attr('height', BOX_H)
    .attr('rx', 4)
    .attr('fill', theme.metaBox.fill)
    .attr('stroke', theme.metaBox.stroke)
    .attr('stroke-width', 1);

  g.append('text')
    .attr('x', PAD).attr('y', PAD + 11)
    .attr('fill', theme.metaBox.text)
    .attr('font-family', 'Courier New, Courier, monospace')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text('Legend');

  entries.forEach((entry, i) => {
    const rowY = PAD + HEADER_H + i * LINE_H;
    const rowG = g.append<SVGGElement>('g').attr('transform', `translate(${PAD},${rowY + (LINE_H - ICON_H) / 2})`);
    entry.draw(rowG);
    g.append('text')
      .attr('x', PAD + ICON_W + 8)
      .attr('y', rowY + LINE_H / 2 + 4)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(entry.label);
  });
}

export function attachSDLegendBoxDrag(
  svg: SvgSel,
  model: { savedPositions: Record<string, Position> },
  onDragEnd?: () => void,
): void {
  let cx = 0, cy = 0;
  const drag = d3.drag<SVGGElement, unknown>()
    .on('start', function () {
      const t = d3.select(this).attr('transform') ?? '';
      const m = t.match(/translate\(([^,]+),\s*([^)]+)\)/);
      cx = m ? parseFloat(m[1]) : 0;
      cy = m ? parseFloat(m[2]) : 0;
    })
    .on('drag', function (event) {
      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      cx += ev.dx;
      cy += ev.dy;
      model.savedPositions['__legend__'] = { x: Math.round(cx), y: Math.round(cy) };
      d3.select(this).attr('transform', `translate(${cx},${cy})`);
    })
    .on('end', () => onDragEnd?.());
  svg.select<SVGGElement>('g.legend-box').call(drag);
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

// ── Text blocks ───────────────────────────────────────────────────────────────

const TB_PADDING    = 12;
const TB_LINE_H     = 16;
const TB_FONT_SIZE  = 12;
const TB_MIN_WIDTH  = 160;
const TB_DEFAULT_X  = 200;
const TB_DEFAULT_Y  = 80;

function drawTextBlocks(svg: SvgSel, model: SDModel, theme: Theme): void {
  for (let idx = 0; idx < model.textBlocks.length; idx++) {
    const tb = model.textBlocks[idx];
    const saved = model.savedPositions[tb.id];
    if (saved) { tb.x = saved.x; tb.y = saved.y; }
    else { tb.x = TB_DEFAULT_X + idx * 20; tb.y = TB_DEFAULT_Y + idx * 20; }

    const lines   = tb.content.split('\n');
    const maxLen  = Math.max(...lines.map(l => l.length));
    const tbW     = Math.max(TB_MIN_WIDTH, maxLen * 7 + TB_PADDING * 2);
    const tbH     = lines.length * TB_LINE_H + TB_PADDING * 2;

    const g = svg.append('g')
      .attr('class', 'textblock')
      .attr('data-id', tb.id)
      .attr('transform', `translate(${tb.x},${tb.y})`)
      .style('cursor', 'move');

    g.append('rect')
      .attr('width', tbW).attr('height', tbH)
      .attr('rx', 4)
      .attr('fill', theme.textBlock.fill)
      .attr('stroke', theme.textBlock.stroke)
      .attr('stroke-width', 1);

    lines.forEach((line, i) => {
      g.append('text')
        .attr('x', TB_PADDING)
        .attr('y', TB_PADDING + TB_FONT_SIZE + i * TB_LINE_H)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', `${TB_FONT_SIZE}px`)
        .attr('fill', theme.textBlock.text)
        .text(line);
    });
  }
}

export function attachTextBlockDrag(
  svg: SvgSel,
  model: SDModel,
  onUpdate: () => void,
): void {
  svg.selectAll<SVGGElement, unknown>('g.textblock').each(function () {
    const el   = this as SVGGElement;
    const tbId = el.getAttribute('data-id')!;
    const tb   = model.textBlocks.find(t => t.id === tbId);
    if (!tb) return;

    d3.select(el).call(
      d3.drag<SVGGElement, unknown>()
        .on('drag', function (event) {
          tb.x += event.dx;
          tb.y += event.dy;
          model.savedPositions[tbId] = { x: Math.round(tb.x), y: Math.round(tb.y) };
          d3.select(el).attr('transform', `translate(${tb.x},${tb.y})`);
          onUpdate();
        }),
    );
  });
}

export function render(svg: SvgSel, model: SDModel): void {
  const theme = getTheme(model.meta.theme);

  svg.selectAll('*').remove();
  defineMarkers(svg, theme);

  // Canvas background — sized to cover the full page + margin
  const p = pageRect(model.meta.orientation, model.meta.size);
  svg.append('rect')
    .attr('class', 'canvas-bg')
    .attr('x', 0).attr('y', 0)
    .attr('width', p.x + p.w + 100).attr('height', p.y + p.h + 100)
    .attr('fill', theme.canvasBg);

  drawGroups(svg, model, theme);
  drawFlows(svg, model, theme);
  drawConnectors(svg, model, theme);
  drawStocks(svg, model, theme);
  drawClouds(svg, model, theme);
  drawAuxiliaries(svg, model, theme);
  drawTextBlocks(svg, model, theme);
  if (model.meta.legend !== false) drawSDLegendBox(svg, model, theme);
  if (model.meta.info !== false) drawMetaBox(svg, model, theme);
}

export function redrawConnectors(svg: SvgSel, model: SDModel): void {
  const theme = getTheme(model.meta.theme);
  svg.selectAll('.flow-group').remove();
  svg.selectAll('.connector-group').remove();
  drawFlows(svg, model, theme);
  drawConnectors(svg, model, theme);
  updateGroupRects(svg, model);
  // Bring nodes, text blocks, legend box, and meta box back to front
  svg.selectAll('g.node').raise();
  svg.selectAll('g.textblock').raise();
  svg.selectAll('.legend-box').raise();
  svg.selectAll('.meta-box').raise();
}
