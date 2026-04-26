import * as d3 from 'd3';
import type {
  IFFModel, IFFNode, IFFStore, IFFProcess, IFFGroup, IFFLabelCorner, IFFState, Position,
} from './types';
import { getTheme, getLocationColour } from '../themes';
import type { FlowType, LocationType, SystemType } from '../types';
import type { IFFTheme } from '../themes';
import { pageRect } from '../sd/renderer';
import {
  DRUM_RIM_H,
  PROCESS_H,
  PROCESS_W,
  STORE_H,
  STORE_W,
  drawNode,
  elementBounds,
  getBorderStyle,
} from './shapes';

const GROUP_PADDING = 40;
const GROUP_LABEL_PAD = 12;
const GROUP_FONT_SIZE = 12;

interface GroupRect { x: number; y: number; w: number; h: number; }
type IffSvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

function getNode(model: IFFModel, id: string): IFFNode | undefined {
  return model.nodes.find(node => node.id === id);
}

function computeGroupRect(group: IFFGroup, model: IFFModel): GroupRect {
  const members = group.members
    .map(id => getNode(model, id))
    .filter((node): node is IFFNode => !!node);

  if (members.length === 0) return { x: 0, y: 0, w: 120, h: 80 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const member of members) {
    const { hw, hh } = elementBounds(member);
    minX = Math.min(minX, member.x - hw);
    minY = Math.min(minY, member.y - hh);
    maxX = Math.max(maxX, member.x + hw);
    maxY = Math.max(maxY, member.y + hh);
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
    case 'upper-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + GROUP_LABEL_PAD + GROUP_FONT_SIZE, anchor: 'end' };
    case 'lower-left':  return { x: gr.x + GROUP_LABEL_PAD,        y: gr.y + gr.h - GROUP_LABEL_PAD, anchor: 'start' };
    case 'lower-right': return { x: gr.x + gr.w - GROUP_LABEL_PAD, y: gr.y + gr.h - GROUP_LABEL_PAD, anchor: 'end' };
  }
}

function processEdge(node: IFFProcess, tx: number, ty: number): Position {
  const dx = tx - node.x;
  const dy = ty - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };
  const hw = PROCESS_W / 2;
  const hh = PROCESS_H / 2;
  const t = Math.abs(dx) * hh > Math.abs(dy) * hw ? hw / Math.abs(dx) : hh / Math.abs(dy);
  return { x: node.x + dx * t, y: node.y + dy * t };
}

function storeEdge(node: IFFStore, tx: number, ty: number): Position {
  const dx = tx - node.x;
  const dy = ty - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

  const hw = STORE_W / 2;
  const rectHalfHeight = (STORE_H - DRUM_RIM_H) / 2;
  if (Math.abs(dx) * rectHalfHeight > Math.abs(dy) * hw) {
    return { x: node.x + Math.sign(dx) * hw, y: node.y + dy * (hw / Math.abs(dx)) };
  }

  const ellipseRy = STORE_H / 2;
  const denom = Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (ellipseRy * ellipseRy));
  return { x: node.x + dx / denom, y: node.y + dy / denom };
}

export function iffNodeEdge(node: IFFNode, tx: number, ty: number): Position {
  return node.kind === 'process' ? processEdge(node, tx, ty) : storeEdge(node, tx, ty);
}

export function iffFlowStyle(flowType: string | undefined, declaredFlowTypes: FlowType[] | undefined): { dashArray: string | null; strokeWidth: number } {
  const style = declaredFlowTypes?.find(entry => entry.name === flowType)?.style ?? flowType;
  switch ((style ?? '').toLowerCase()) {
    case 'dashed':
      return { dashArray: '6,4', strokeWidth: 1.5 };
    case 'thick':
      return { dashArray: null, strokeWidth: 3 };
    default:
      return { dashArray: null, strokeWidth: 1.5 };
  }
}

export function iffLinkMarkers(direction: 'unidirectional' | 'bidirectional'): { markerStart: string | null; markerEnd: string } {
  return {
    markerStart: direction === 'bidirectional' ? 'url(#iff-arrow)' : null,
    markerEnd: 'url(#iff-arrow)',
  };
}

function defineDefsSection(svg: IffSvgSel, theme: IFFTheme): void {
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

function drawLinks(svg: IffSvgSel, model: IFFModel, theme: IFFTheme): void {
  for (const link of model.links) {
    const fromNode = getNode(model, link.from);
    const toNode = getNode(model, link.to);
    if (!fromNode || !toNode) continue;

    const fromEdge = iffNodeEdge(fromNode, toNode.x, toNode.y);
    const toEdge = iffNodeEdge(toNode, fromNode.x, fromNode.y);
    const style = iffFlowStyle(link.flowType, model.meta.flowTypes);
    const markers = iffLinkMarkers(link.direction);

    const g = svg.append('g').attr('class', 'iff-link').attr('data-id', link.id);

    const line = g.append('line')
      .attr('x1', fromEdge.x).attr('y1', fromEdge.y)
      .attr('x2', toEdge.x).attr('y2', toEdge.y)
      .attr('stroke', theme.connStroke)
      .attr('stroke-width', style.strokeWidth)
      .attr('marker-end', markers.markerEnd);
    if (markers.markerStart) line.attr('marker-start', markers.markerStart);
    if (style.dashArray) line.attr('stroke-dasharray', style.dashArray);

    const mx = (fromEdge.x + toEdge.x) / 2;
    const my = (fromEdge.y + toEdge.y) / 2;
    const linkLabel = link.flowType ? `${link.relationship} [${link.flowType}]` : link.relationship;

    g.append('text')
      .attr('x', mx).attr('y', my - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.labelText)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .text(linkLabel);
  }
}

function nodeFill(node: IFFNode, model: IFFModel, theme: IFFTheme): string {
  if (node.kind === 'store') {
    const locationType = model.meta.locationTypes?.find(entry => entry.name === node.locationType);
    return locationType
      ? getLocationColour(theme.palette, locationType.colour, node.state)
      : theme.palette.grey[node.state];
  }

  const systemType = model.meta.systemTypes?.find(entry => entry.name === node.system);
  return systemType
    ? getLocationColour(theme.palette, systemType.colour, node.state)
    : theme.palette.grey[node.state];
}

function nodeBadgeLabel(node: IFFNode): string {
  return node.kind === 'store' ? node.locationType : node.system;
}

function drawNodes(svg: IffSvgSel, model: IFFModel, theme: IFFTheme): void {
  for (const node of model.nodes) {
    const fill = nodeFill(node, model, theme);
    const border = getBorderStyle(node.state);

    const g = svg.append('g')
      .attr('class', 'iff-node')
      .attr('data-id', node.id)
      .attr('data-kind', node.kind)
      .attr('transform', `translate(${node.x},${node.y})`);

    if (theme.glow) g.attr('filter', 'url(#iff-glow)');

    drawNode(g, node, fill, border, theme.borderStroke);

    g.append('text')
      .attr('x', 0).attr('y', node.kind === 'process' ? -4 : -2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', theme.labelText)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(node.label);

    g.append('text')
      .attr('x', 0).attr('y', node.kind === 'process' ? PROCESS_H / 2 + 14 : STORE_H / 2 + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', fill)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .attr('font-style', 'italic')
      .text(nodeBadgeLabel(node));

    if (model.meta.showIds) {
      g.append('text')
        .attr('x', 0).attr('y', node.kind === 'process' ? PROCESS_H / 2 + 28 : STORE_H / 2 + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '9px')
        .attr('font-style', 'italic')
        .text(`[${node.id}]`);
    }
  }
}

function drawGroups(svg: IffSvgSel, model: IFFModel, theme: IFFTheme): void {
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

    const label = group.system ? `${group.label} [${group.system}]` : group.label;
    g.append('text')
      .attr('class', 'iff-group-label')
      .attr('x', lp.x).attr('y', lp.y)
      .attr('text-anchor', lp.anchor)
      .attr('fill', theme.group.label)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', `${GROUP_FONT_SIZE}px`)
      .attr('font-style', 'italic')
      .text(label);
  }
}

function updateGroupRects(svg: IffSvgSel, model: IFFModel): void {
  for (const group of model.groups) {
    if (group.members.length === 0) continue;
    const gr = computeGroupRect(group, model);
    const lp = groupLabelAttrs(gr, group.labelCorner);
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

function drawMetaBox(svg: IffSvgSel, model: IFFModel, theme: IFFTheme): void {
  const { meta } = model;
  const lines: string[] = [];
  if (meta.name) lines.push(`name     ${meta.name}`);
  if (meta.version) lines.push(`version  ${meta.version}`);
  lines.push(`date     ${meta.date}`);
  if (meta.author) lines.push(`author   ${meta.author}`);
  lines.push('type     information flow');

  const PAD = 12;
  const LINE_H = 17;
  const BOX_W = 230;
  const BOX_H = lines.length * LINE_H + PAD * 2;
  const p = pageRect(meta.orientation, meta.size);
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

const STATE_ORDER: IFFState[] = ['current', 'new', 'changing', 'decommissioned'];

function drawLegendSectionSwatchRect(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: number,
  y: number,
  fill: string,
  state: IFFState,
  theme: IFFTheme,
): void {
  const border = getBorderStyle(state);
  const rect = g.append('rect')
    .attr('x', x)
    .attr('y', y)
    .attr('width', 22)
    .attr('height', 14)
    .attr('rx', 2)
    .attr('fill', fill)
    .attr('fill-opacity', border.fillOpacity)
    .attr('stroke', theme.borderStroke)
    .attr('stroke-width', 1);
  if (border.dashArray) rect.attr('stroke-dasharray', border.dashArray);
  if (border.showCross) {
    g.append('line')
      .attr('x1', x).attr('y1', y)
      .attr('x2', x + 22).attr('y2', y + 14)
      .attr('stroke', theme.borderStroke)
      .attr('stroke-width', 1.5);
    g.append('line')
      .attr('x1', x).attr('y1', y + 14)
      .attr('x2', x + 22).attr('y2', y)
      .attr('stroke', theme.borderStroke)
      .attr('stroke-width', 1.5);
  }
}

function uniqueStoreEntries(model: IFFModel): Array<{ locationType: string; state: IFFState }> {
  const seen = new Set<string>();
  const entries: Array<{ locationType: string; state: IFFState }> = [];
  for (const store of model.stores) {
    const key = `${store.locationType}:${store.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ locationType: store.locationType, state: store.state });
  }
  const locationTypeOrder = (model.meta.locationTypes ?? []).map(entry => entry.name);
  entries.sort((a, b) => {
    const ai = locationTypeOrder.indexOf(a.locationType);
    const bi = locationTypeOrder.indexOf(b.locationType);
    const pd = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return pd !== 0 ? pd : STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state);
  });
  return entries;
}

function uniqueProcessEntries(model: IFFModel): Array<{ system: string; state: IFFState }> {
  const seen = new Set<string>();
  const entries: Array<{ system: string; state: IFFState }> = [];
  for (const process of model.processes) {
    const key = `${process.system}:${process.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ system: process.system, state: process.state });
  }
  const systemOrder = (model.meta.systemTypes ?? []).map(entry => entry.name);
  entries.sort((a, b) => {
    const ai = systemOrder.indexOf(a.system);
    const bi = systemOrder.indexOf(b.system);
    const pd = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return pd !== 0 ? pd : STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state);
  });
  return entries;
}

function uniqueFlowEntries(model: IFFModel): string[] {
  const flowOrder = (model.meta.flowTypes ?? []).map(entry => entry.name);
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const link of model.links) {
    if (!link.flowType || seen.has(link.flowType)) continue;
    seen.add(link.flowType);
    entries.push(link.flowType);
  }
  entries.sort((a, b) => {
    const ai = flowOrder.indexOf(a);
    const bi = flowOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return entries;
}

function drawIffLegendBox(svg: IffSvgSel, model: IFFModel, theme: IFFTheme): void {
  const storeEntries = uniqueStoreEntries(model);
  const processEntries = uniqueProcessEntries(model);
  const flowEntries = uniqueFlowEntries(model);
  if (storeEntries.length === 0 && processEntries.length === 0 && flowEntries.length === 0) return;

  const PAD = 12;
  const LINE_H = 22;
  const SECTION_H = 18;
  const BOX_W = 260;
  let contentRows = 1;
  if (storeEntries.length > 0) contentRows += 1 + storeEntries.length;
  if (processEntries.length > 0) contentRows += 1 + processEntries.length;
  if (flowEntries.length > 0) contentRows += 1 + flowEntries.length;
  const BOX_H = PAD * 2 + contentRows * LINE_H + 8;

  const p = pageRect(model.meta.orientation, model.meta.size);
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

  let rowY = PAD;
  g.append('text')
    .attr('x', PAD).attr('y', rowY + 11)
    .attr('fill', theme.metaBox.text)
    .attr('font-family', 'Courier New, Courier, monospace')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text('Legend');
  rowY += LINE_H;

  const drawSectionHeader = (text: string): void => {
    g.append('text')
      .attr('x', PAD).attr('y', rowY + 11)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(text);
    rowY += SECTION_H;
  };

  if (storeEntries.length > 0) {
    drawSectionHeader('Stores');
    for (const entry of storeEntries) {
      const locationType = model.meta.locationTypes?.find((item: LocationType) => item.name === entry.locationType);
      const fill = locationType ? getLocationColour(theme.palette, locationType.colour, entry.state) : theme.palette.grey[entry.state];
      drawLegendSectionSwatchRect(g, PAD, rowY + 2, fill, entry.state, theme);
      const stateLabel = entry.state === 'current' ? '' : ` · ${entry.state}`;
      g.append('text')
        .attr('x', PAD + 30).attr('y', rowY + 13)
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '11px')
        .text(`${entry.locationType}${stateLabel}`);
      rowY += LINE_H;
    }
  }

  if (processEntries.length > 0) {
    drawSectionHeader('Processes');
    for (const entry of processEntries) {
      const systemType = model.meta.systemTypes?.find((item: SystemType) => item.name === entry.system);
      const fill = systemType ? getLocationColour(theme.palette, systemType.colour, entry.state) : theme.palette.grey[entry.state];
      drawLegendSectionSwatchRect(g, PAD, rowY + 2, fill, entry.state, theme);
      const stateLabel = entry.state === 'current' ? '' : ` · ${entry.state}`;
      g.append('text')
        .attr('x', PAD + 30).attr('y', rowY + 13)
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '11px')
        .text(`${entry.system}${stateLabel}`);
      rowY += LINE_H;
    }
  }

  if (flowEntries.length > 0) {
    drawSectionHeader('Flows');
    for (const flowName of flowEntries) {
      const style = iffFlowStyle(flowName, model.meta.flowTypes);
      const line = g.append('line')
        .attr('x1', PAD).attr('y1', rowY + 9)
        .attr('x2', PAD + 22).attr('y2', rowY + 9)
        .attr('stroke', theme.connStroke)
        .attr('stroke-width', style.strokeWidth);
      if (style.dashArray) line.attr('stroke-dasharray', style.dashArray);
      g.append('text')
        .attr('x', PAD + 30).attr('y', rowY + 13)
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '11px')
        .text(flowName);
      rowY += LINE_H;
    }
  }
}

// ── Text blocks ───────────────────────────────────────────────────────────────

const TB_PADDING   = 12;
const TB_LINE_H    = 16;
const TB_FONT_SIZE = 12;
const TB_MIN_WIDTH = 160;

function drawTextBlocks(svg: IffSvgSel, model: IFFModel): void {
  const textBlockTheme = getTheme(model.meta.theme).textBlock;
  for (let idx = 0; idx < model.textBlocks.length; idx++) {
    const tb    = model.textBlocks[idx];
    const saved = model.savedPositions[tb.id];
    if (saved) { tb.x = saved.x; tb.y = saved.y; }
    else { tb.x = 200 + idx * 20; tb.y = 80 + idx * 20; }

    const lines  = tb.content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    const tbW    = Math.max(TB_MIN_WIDTH, maxLen * 7 + TB_PADDING * 2);
    const tbH    = lines.length * TB_LINE_H + TB_PADDING * 2;

    const g = svg.append('g')
      .attr('class', 'textblock')
      .attr('data-id', tb.id)
      .attr('transform', `translate(${tb.x},${tb.y})`)
      .style('cursor', 'move');

    g.append('rect')
      .attr('width', tbW).attr('height', tbH)
      .attr('rx', 4)
      .attr('fill', textBlockTheme.fill)
      .attr('stroke', textBlockTheme.stroke)
      .attr('stroke-width', 1);

    lines.forEach((line, i) => {
      g.append('text')
        .attr('x', TB_PADDING)
        .attr('y', TB_PADDING + TB_FONT_SIZE + i * TB_LINE_H)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', `${TB_FONT_SIZE}px`)
        .attr('fill', textBlockTheme.text)
        .text(line);
    });
  }
}

export function attachIffTextBlockDrag(svg: IffSvgSel, model: IFFModel, onUpdate?: () => void): void {
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
          onUpdate?.();
        }),
    );
  });
}

export function attachIffDrag(svg: IffSvgSel, model: IFFModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const [x, y] = d3.pointer(event, svg.node()!);
      const id = d3.select(this).attr('data-id');
      const node = getNode(model, id);
      if (!node) return;
      node.x = x;
      node.y = y;
      model.savedPositions[node.id] = { x, y };
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
      const group = model.groups.find(entry => entry.id === groupId);
      if (!group) return;

      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      for (const memberId of group.members) {
        const node = getNode(model, memberId);
        if (!node) continue;
        node.x += ev.dx;
        node.y += ev.dy;
        model.savedPositions[node.id] = { x: node.x, y: node.y };
        svg.select<SVGGElement>(`g.iff-node[data-id="${memberId}"]`)
          .attr('transform', `translate(${node.x},${node.y})`);
      }
      iffRedrawLinks(svg, model);
    })
    .on('end', () => onDragEnd?.());

  svg.selectAll<SVGGElement, unknown>('g.iff-group').call(drag);
}

export function attachIffLegendBoxDrag(
  svg: IffSvgSel,
  model: { savedPositions: Record<string, Position> },
  onDragEnd?: () => void,
): void {
  let cx = 0;
  let cy = 0;
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
  drawNodes(svg, model, theme);
  drawTextBlocks(svg, model);
  if (model.meta.legend !== false) drawIffLegendBox(svg, model, theme);
  drawMetaBox(svg, model, theme);
}

export function iffRedrawLinks(svg: IffSvgSel, model: IFFModel): void {
  const theme = getTheme(model.meta.theme).iff;
  svg.selectAll('.iff-link').remove();
  drawLinks(svg, model, theme);
  updateGroupRects(svg, model);
  svg.selectAll('g.iff-node').raise();
  svg.selectAll('g.textblock').raise();
  svg.selectAll('.legend-box').raise();
  svg.selectAll('.meta-box').raise();
}
