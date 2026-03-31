import * as d3 from 'd3';
import type { SDModel, Node, Flow, Connector, Position, FlowStrength } from './types';
import { getTheme } from './themes';
import type { Theme } from './themes';

// ── Canvas constants ──────────────────────────────────────────────────────────
const VB_W = 1600;
const VB_H = 900;

// ── A4 page guide dimensions ──────────────────────────────────────────────────
// Computed per render from model.meta.orientation (default: landscape).
// Stripped from SVG export.
const A4_LANDSCAPE = { x: 30, y: 12, w: 1240, h: 876  } as const; // 1240/876  ≈ 297/210
const A4_PORTRAIT  = { x: 30, y: 12, w: 619,  h: 876  } as const; // 619/876   ≈ 210/297

export function pageRect(orientation?: 'landscape' | 'portrait') {
  return orientation === 'portrait' ? A4_PORTRAIT : A4_LANDSCAPE;
}

// ── Node geometry ─────────────────────────────────────────────────────────────
const STOCK_W  = 120;
const STOCK_H  = 50;
const AUX_R    = 28;
const CLOUD_RX = 38;  // approximate ellipse radii for cloud intersection
const CLOUD_RY = 26;
const VALVE_R  = 12;

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
  const p      = pageRect(model.meta.orientation);
  const BOX_X  = p.x + 16;
  const BOX_Y  = p.y + p.h - BOX_H - 16;

  const g = svg.append('g').attr('class', 'meta-box');

  g.append('rect')
    .attr('x', BOX_X).attr('y', BOX_Y)
    .attr('width', BOX_W).attr('height', BOX_H)
    .attr('rx', 4)
    .attr('fill', theme.metaBox.fill)
    .attr('stroke', theme.metaBox.stroke)
    .attr('stroke-width', 1);

  lines.forEach((text, i) => {
    g.append('text')
      .attr('x', BOX_X + PAD)
      .attr('y', BOX_Y + PAD + i * LINE_H + 11)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(text);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

export function render(svg: SvgSel, model: SDModel): void {
  const theme = getTheme(model.meta.theme);

  svg.selectAll('*').remove();
  defineMarkers(svg, theme);

  // Canvas background (full viewBox rect — exported with SVG)
  svg.append('rect')
    .attr('class', 'canvas-bg')
    .attr('x', 0).attr('y', 0)
    .attr('width', VB_W).attr('height', VB_H)
    .attr('fill', theme.canvasBg);

  drawFlows(svg, model, theme);
  drawConnectors(svg, model, theme);
  drawStocks(svg, model, theme);
  drawClouds(svg, model, theme);
  drawAuxiliaries(svg, model, theme);
  drawMetaBox(svg, model, theme);
}

export function redrawConnectors(svg: SvgSel, model: SDModel): void {
  const theme = getTheme(model.meta.theme);
  svg.selectAll('.flow-group').remove();
  svg.selectAll('.connector-group').remove();
  drawFlows(svg, model, theme);
  drawConnectors(svg, model, theme);
  // Bring nodes and meta box back to front
  svg.selectAll('g.node').raise();
  svg.selectAll('.meta-box').raise();
}
