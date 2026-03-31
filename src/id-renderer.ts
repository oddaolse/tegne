import * as d3 from 'd3';
import type { IDModel, IDElement, IDConnection, Platform, IDState, Position } from './types';
import { getTheme } from './themes';
import type { IDTheme } from './themes';
import { pageRect } from './renderer';

// ── Shape dimensions ──────────────────────────────────────────────────────────

const VB_W = 1600;
const VB_H = 900;

const SYS_W     = 140;
const SYS_H     = 60;
const DB_W      = 80;
const DB_BODY_H = 60;
const DB_RY     = 12;
const Q_BODY_W  = 100;
const Q_H       = 40;
const Q_RX      = 15;

// ── Colour helpers ────────────────────────────────────────────────────────────

function getFill(el: IDElement, theme: IDTheme): string {
  return theme.platforms[el.platform][el.state];
}

function getBorderStroke(el: IDElement, theme: IDTheme): string {
  return theme.platformColoredBorder
    ? theme.platforms[el.platform][el.state]
    : theme.borderStroke;
}

interface BorderStyle { strokeWidth: number; dashArray: string | null; }

function getBorderStyle(state: IDState): BorderStyle {
  switch (state) {
    case 'current':        return { strokeWidth: 2, dashArray: null  };
    case 'new':            return { strokeWidth: 4, dashArray: null  };
    case 'changing':       return { strokeWidth: 2, dashArray: '6,4' };
    case 'decommissioned': return { strokeWidth: 2, dashArray: '2,4' };
  }
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function elementEdge(el: IDElement, tx: number, ty: number): Position {
  const dx = tx - el.x, dy = ty - el.y;
  if (dx === 0 && dy === 0) return { x: el.x, y: el.y };

  let hw: number, hh: number;
  switch (el.kind) {
    case 'system':   hw = SYS_W / 2;             hh = SYS_H / 2;              break;
    case 'database': hw = DB_W / 2;               hh = (DB_BODY_H + DB_RY) / 2; break;
    case 'queue':    hw = Q_BODY_W / 2 + Q_RX;   hh = Q_H / 2;                break;
  }

  const t = Math.abs(dx) * hh > Math.abs(dy) * hw
    ? hw / Math.abs(dx)
    : hh / Math.abs(dy);
  return { x: el.x + dx * t, y: el.y + dy * t };
}

// ── Marker and filter definitions ─────────────────────────────────────────────

function defineDefsSection(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  theme: IDTheme,
): void {
  const defs = svg.append('defs');

  // Closed (filled) arrowhead
  defs.append('marker')
    .attr('id', 'id-arrow-closed')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', theme.connStroke);

  // Open arrowhead (queue connections)
  defs.append('marker')
    .attr('id', 'id-arrow-open')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10')
    .attr('fill', 'none')
    .attr('stroke', theme.connStroke)
    .attr('stroke-width', 1.5);

  // Neon glow filter (tokyo only)
  if (theme.glow) {
    const filter = defs.append('filter')
      .attr('id', 'neon-glow')
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

// ── Connection drawing ────────────────────────────────────────────────────────

function findElement(id: string, model: IDModel): IDElement | undefined {
  return model.elements.find(e => e.id === id);
}

function drawConnections(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IDModel,
  theme: IDTheme,
): void {
  for (const conn of model.connections) {
    const fromEl = findElement(conn.from, model);
    const toEl   = findElement(conn.to,   model);
    if (!fromEl || !toEl) continue;

    const fromEdge = elementEdge(fromEl, toEl.x,   toEl.y);
    const toEdge   = elementEdge(toEl,   fromEl.x, fromEl.y);

    const useOpen  = fromEl.kind === 'queue' || toEl.kind === 'queue';
    const markerId = useOpen ? 'id-arrow-open' : 'id-arrow-closed';

    const g = svg.append('g').attr('class', 'id-connection').attr('data-id', conn.id);

    const line = g.append('line')
      .attr('x1', fromEdge.x).attr('y1', fromEdge.y)
      .attr('x2', toEdge.x).attr('y2', toEdge.y)
      .attr('stroke', theme.connStroke)
      .attr('stroke-width', 1.5)
      .attr('marker-end', `url(#${markerId})`);

    if (conn.direction === 'bidirectional') {
      line.attr('marker-start', `url(#${markerId})`);
    }

    const mx = (fromEdge.x + toEdge.x) / 2;
    const my = (fromEdge.y + toEdge.y) / 2;

    g.append('text')
      .attr('x', mx).attr('y', my - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.protocolLabel)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .text(conn.protocol);
  }
}

// ── Element drawing ───────────────────────────────────────────────────────────

function applyStroke(
  sel: d3.Selection<SVGElement, unknown, null, undefined>,
  border: BorderStyle,
  stroke: string,
): void {
  sel.attr('stroke', stroke).attr('stroke-width', border.strokeWidth);
  if (border.dashArray) sel.attr('stroke-dasharray', border.dashArray);
}

function addLabel(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  el: IDElement,
  theme: IDTheme,
  insideY: number,
  belowY: number,
): void {
  if (el.labelPos === 'inside') {
    g.append('text')
      .attr('x', 0).attr('y', insideY)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', theme.labelInside)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(el.label);
  } else {
    g.append('text')
      .attr('x', 0).attr('y', belowY)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.labelBelow)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(el.label);
  }
}

function drawSystem(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  el: IDElement,
  fill: string,
  border: BorderStyle,
  stroke: string,
): void {
  const rect = g.append('rect')
    .attr('x', -SYS_W / 2).attr('y', -SYS_H / 2)
    .attr('width', SYS_W).attr('height', SYS_H)
    .attr('rx', 4).attr('fill', fill);
  applyStroke(rect as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}

function drawDatabase(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  el: IDElement,
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
    .attr('fill', fill).attr('stroke', 'none');

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
    .attr('rx', hw).attr('ry', DB_RY).attr('fill', fill);
  applyStroke(botEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);

  const topEll = g.append('ellipse')
    .attr('cx', 0).attr('cy', top)
    .attr('rx', hw).attr('ry', DB_RY).attr('fill', fill);
  applyStroke(topEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}

function drawQueue(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  el: IDElement,
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
    .attr('fill', fill).attr('stroke', 'none');

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
    .attr('rx', Q_RX).attr('ry', hh).attr('fill', fill);
  applyStroke(leftEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);

  const rightEll = g.append('ellipse')
    .attr('cx', right).attr('cy', 0)
    .attr('rx', Q_RX).attr('ry', hh).attr('fill', fill);
  applyStroke(rightEll as unknown as d3.Selection<SVGElement, unknown, null, undefined>, border, stroke);
}

function drawElements(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IDModel,
  theme: IDTheme,
): void {
  for (const el of model.elements) {
    const fill   = getFill(el, theme);
    const border = getBorderStyle(el.state);
    const stroke = getBorderStroke(el, theme);

    const g = svg.append('g')
      .attr('class', 'id-node')
      .attr('data-id', el.id)
      .attr('transform', `translate(${el.x},${el.y})`);

    if (theme.glow) g.attr('filter', 'url(#neon-glow)');

    switch (el.kind) {
      case 'system':   drawSystem(g, el, fill, border, stroke);   break;
      case 'database': drawDatabase(g, el, fill, border, stroke); break;
      case 'queue':    drawQueue(g, el, fill, border, stroke);     break;
    }

    // Label (drawn after shape, outside glow filter scope)
    switch (el.kind) {
      case 'system':
        addLabel(g, el, theme, 0, SYS_H / 2 + 16);
        break;
      case 'database':
        addLabel(g, el, theme, 0, DB_BODY_H / 2 + DB_RY + 16);
        break;
      case 'queue':
        addLabel(g, el, theme, 0, Q_H / 2 + 16);
        break;
    }
  }
}

// ── Metadata box ──────────────────────────────────────────────────────────────

function drawMetaBox(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  model: IDModel,
  theme: IDTheme,
): void {
  const { meta } = model;
  const lines: string[] = [];
  if (meta.name)    lines.push(`name     ${meta.name}`);
  if (meta.version) lines.push(`version  ${meta.version}`);
  lines.push(`date     ${meta.date}`);
  if (meta.author)  lines.push(`author   ${meta.author}`);
  lines.push(`type     integration`);

  const PAD = 12, LINE_H = 17, BOX_W = 230;
  const BOX_H = lines.length * LINE_H + PAD * 2;
  const p     = pageRect(meta.orientation);
  const BOX_X = p.x + 16;
  const BOX_Y = p.y + p.h - BOX_H - 16;

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
      .attr('x', BOX_X + PAD).attr('y', BOX_Y + PAD + i * LINE_H + 11)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(text);
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────────

type IdSvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

export function attachIdDrag(svg: IdSvgSel, model: IDModel): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const [x, y] = d3.pointer(event, svg.node()!);
      const id = d3.select(this).attr('data-id');
      const el = model.elements.find(e => e.id === id);
      if (!el) return;
      el.x = x;
      el.y = y;
      d3.select(this).attr('transform', `translate(${x},${y})`);
      idRedrawConnections(svg, model);
    });

  svg.selectAll<SVGGElement, unknown>('g.id-node').call(drag);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function idRender(svg: IdSvgSel, model: IDModel): void {
  const theme = getTheme(model.meta.theme).id;

  svg.selectAll('*').remove();
  defineDefsSection(svg, theme);

  svg.append('rect')
    .attr('class', 'canvas-bg')
    .attr('x', 0).attr('y', 0)
    .attr('width', VB_W).attr('height', VB_H)
    .attr('fill', theme.canvasBg);

  drawConnections(svg, model, theme);
  drawElements(svg, model, theme);
  drawMetaBox(svg, model, theme);
}

export function idRedrawConnections(svg: IdSvgSel, model: IDModel): void {
  const theme = getTheme(model.meta.theme).id;
  svg.selectAll('.id-connection').remove();
  drawConnections(svg, model, theme);
  svg.selectAll('g.id-node').raise();
  svg.selectAll('.meta-box').raise();
}
