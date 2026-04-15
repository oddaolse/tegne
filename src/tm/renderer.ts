import * as d3 from 'd3';
import type { TMModel, TMRef, TMThreat } from './types';
import type { StrideCategory, TMTheme } from '../themes';
import { getTheme } from '../themes';
import { pageRect } from '../sd/renderer';
import type { IDRegistry } from '../project/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const REF_W   = 130;
const REF_H   = 50;
const BADGE_R = 11;
const BOUNDARY_PAD = 44;
const BOUNDARY_LABEL_PAD = 10;

const STRIDE_LABELS: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Info Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
};

type TmSvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;

// ── Geometry helpers ──────────────────────────────────────────────────────────

function refEdge(ref: TMRef, tx: number, ty: number): { x: number; y: number } {
  const dx = tx - ref.x, dy = ty - ref.y;
  if (dx === 0 && dy === 0) return { x: ref.x, y: ref.y };
  const hw = REF_W / 2, hh = REF_H / 2;
  const t  = Math.abs(dx) * hh > Math.abs(dy) * hw ? hw / Math.abs(dx) : hh / Math.abs(dy);
  return { x: ref.x + dx * t, y: ref.y + dy * t };
}

// ── Boundary drawing ──────────────────────────────────────────────────────────

function computeBoundaryRect(boundary: { members: string[] }, model: TMModel) {
  const members = boundary.members
    .map(id => model.refs.find(r => r.id === id))
    .filter((r): r is TMRef => !!r);

  if (members.length === 0) return { x: 0, y: 0, w: 200, h: 100 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of members) {
    minX = Math.min(minX, r.x - REF_W / 2);
    minY = Math.min(minY, r.y - REF_H / 2);
    maxX = Math.max(maxX, r.x + REF_W / 2);
    maxY = Math.max(maxY, r.y + REF_H / 2);
  }
  return {
    x: minX - BOUNDARY_PAD,
    y: minY - BOUNDARY_PAD,
    w: maxX - minX + 2 * BOUNDARY_PAD,
    h: maxY - minY + 2 * BOUNDARY_PAD,
  };
}

function drawBoundaries(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  for (const boundary of model.boundaries) {
    const r = computeBoundaryRect(boundary, model);
    const g = svg.append('g').attr('class', 'tm-boundary').attr('data-id', boundary.id);

    g.append('rect')
      .attr('x', r.x).attr('y', r.y)
      .attr('width', r.w).attr('height', r.h)
      .attr('rx', 10)
      .attr('fill', theme.boundaryFill)
      .attr('fill-opacity', 0.6)
      .attr('stroke', theme.boundaryStroke)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '10,5');

    g.append('text')
      .attr('x', r.x + BOUNDARY_LABEL_PAD + 4)
      .attr('y', r.y + BOUNDARY_LABEL_PAD + 12)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .text(boundary.label);
  }
}

// ── Flow drawing ──────────────────────────────────────────────────────────────

function drawFlows(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  const defs = svg.select<SVGDefsElement>('defs');

  defs.append('marker')
    .attr('id', 'tm-arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', theme.connStroke);

  for (const flow of model.flows) {
    const fromRef = model.refs.find(r => r.id === flow.from);
    const toRef   = model.refs.find(r => r.id === flow.to);
    if (!fromRef || !toRef) continue;

    const fromEdge = refEdge(fromRef, toRef.x, toRef.y);
    const toEdge   = refEdge(toRef,   fromRef.x, fromRef.y);

    const g = svg.append('g').attr('class', 'tm-flow').attr('data-id', flow.id);

    g.append('line')
      .attr('x1', fromEdge.x).attr('y1', fromEdge.y)
      .attr('x2', toEdge.x).attr('y2', toEdge.y)
      .attr('stroke', theme.connStroke)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#tm-arrow)');

    if (flow.label) {
      const mx = (fromEdge.x + toEdge.x) / 2;
      const my = (fromEdge.y + toEdge.y) / 2;
      g.append('text')
        .attr('x', mx).attr('y', my - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '10px')
        .text(flow.label);
    }
  }
}

// ── Ref drawing ───────────────────────────────────────────────────────────────

function drawRefs(
  svg: TmSvgSel,
  model: TMModel,
  theme: TMTheme,
  registry: IDRegistry,
): void {
  for (const ref of model.refs) {
    const entry  = registry.byId.get(ref.id)?.[0];
    const label  = entry?.label ?? ref.id;

    const g = svg.append('g')
      .attr('class', 'tm-ref')
      .attr('data-id', ref.id)
      .attr('transform', `translate(${ref.x},${ref.y})`)
      .style('cursor', 'move');

    g.append('rect')
      .attr('x', -REF_W / 2).attr('y', -REF_H / 2)
      .attr('width', REF_W).attr('height', REF_H)
      .attr('rx', 4)
      .attr('fill', theme.refFill)
      .attr('fill-opacity', 0.7)
      .attr('stroke', theme.refStroke)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3');

    g.append('text')
      .attr('x', 0).attr('y', 0)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', theme.refLabelText)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '11px')
      .text(label);

    // Small source-type badge if we found it in the registry
    if (entry) {
      g.append('text')
        .attr('x', 0).attr('y', REF_H / 2 + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '9px')
        .attr('font-style', 'italic')
        .text(`${entry.diagramType}·${entry.elementKind}`);
    }

    if (model.meta.showIds) {
      g.append('text')
        .attr('x', 0).attr('y', REF_H / 2 + (entry ? 24 : 12))
        .attr('text-anchor', 'middle')
        .attr('fill', theme.metaBox.text)
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '9px')
        .attr('font-style', 'italic')
        .text(`[${ref.id}]`);
    }
  }
}

// ── Threat badge drawing ──────────────────────────────────────────────────────

function drawThreats(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  // Group threats by target so we can offset multiple badges
  const byTarget = new Map<string, TMThreat[]>();
  for (const t of model.threats) {
    const list = byTarget.get(t.targetId) ?? [];
    list.push(t);
    byTarget.set(t.targetId, list);
  }

  for (const [targetId, targetThreats] of byTarget) {
    const flow = model.flows.find(f => f.id === targetId);
    const ref  = model.refs.find(r => r.id === targetId);

    let baseX = 0, baseY = 0;

    if (flow) {
      const fromRef = model.refs.find(r => r.id === flow.from);
      const toRef   = model.refs.find(r => r.id === flow.to);
      if (fromRef && toRef) {
        baseX = (fromRef.x + toRef.x) / 2;
        baseY = (fromRef.y + toRef.y) / 2 - BADGE_R * 2;
      }
    } else if (ref) {
      baseX = ref.x + REF_W / 2 - BADGE_R;
      baseY = ref.y - REF_H / 2 + BADGE_R;
    } else {
      continue;
    }

    targetThreats.forEach((threat, idx) => {
      const cx = baseX + idx * (BADGE_R * 2 + 4);
      const cy = baseY;
      const colour = theme.stride[threat.stride];
      const mitigated = model.mitigations.some(m => m.threatId === threat.id);

      const g = svg.append('g').attr('class', 'tm-threat').attr('data-id', threat.id);

      g.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', BADGE_R)
        .attr('fill', colour)
        .attr('fill-opacity', mitigated ? 0.35 : 1.0)
        .attr('stroke', colour)
        .attr('stroke-width', mitigated ? 1.5 : 0)
        .attr('stroke-dasharray', mitigated ? '3,2' : null as unknown as string);

      g.append('text')
        .attr('x', cx).attr('y', cy)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-family', 'Courier New, Courier, monospace')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(threat.stride);

      // Tooltip-style id above the badge
      g.append('title').text(`${threat.id}: ${threat.description}`);
    });
  }
}

// ── Mitigations panel ─────────────────────────────────────────────────────────

function drawMitigationsPanel(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  if (model.mitigations.length === 0) return;

  const PAD    = 12;
  const LINE_H = 17;
  const BOX_W  = 320;
  const HEADER = LINE_H;
  const BOX_H  = PAD * 2 + HEADER + model.mitigations.length * LINE_H;
  const p      = pageRect(model.meta.orientation, model.meta.size);
  const saved  = model.savedPositions['__mitigations__'];
  const BOX_X  = saved?.x ?? (p.x + 16);
  const BOX_Y  = saved?.y ?? (p.y + p.h - BOX_H - 16);

  const g = svg.append('g')
    .attr('class', 'mitigations-box')
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
    .text('Mitigations');

  model.mitigations.forEach((mit, i) => {
    const threat  = model.threats.find(t => t.id === mit.threatId);
    const colour  = threat ? theme.stride[threat.stride] : theme.metaBox.text;
    const lineY   = PAD + HEADER + i * LINE_H + 11;

    // Stride colour swatch
    g.append('rect')
      .attr('x', PAD).attr('y', PAD + HEADER + i * LINE_H + 2)
      .attr('width', 10).attr('height', 10)
      .attr('rx', 2)
      .attr('fill', colour);

    g.append('text')
      .attr('x', PAD + 16).attr('y', lineY)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .text(`${mit.threatId}: ${mit.description}`);
  });
}

// ── Meta box ──────────────────────────────────────────────────────────────────

function drawMetaBox(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  const { meta } = model;
  const lines: string[] = [];
  if (meta.name)    lines.push(`name     ${meta.name}`);
  if (meta.version) lines.push(`version  ${meta.version}`);
  lines.push(`date     ${meta.date}`);
  if (meta.author)  lines.push(`author   ${meta.author}`);
  lines.push(`type     threat model`);

  const PAD   = 12, LINE_H = 17, BOX_W = 230;
  const BOX_H = lines.length * LINE_H + PAD * 2;
  const p     = pageRect(meta.orientation, meta.size);
  const saved = model.savedPositions['__meta__'];
  const BOX_X = saved?.x ?? (p.x + p.w - BOX_W - 16);
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

// ── STRIDE key box ────────────────────────────────────────────────────────────

function drawStrideKey(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  const usedCategories = [...new Set(model.threats.map(t => t.stride))].sort();
  if (usedCategories.length === 0) return;

  const PAD    = 10;
  const LINE_H = 18;
  const BOX_W  = 200;
  const HEADER = LINE_H;
  const BOX_H  = PAD * 2 + HEADER + usedCategories.length * LINE_H;
  const p      = pageRect(model.meta.orientation, model.meta.size);
  const saved  = model.savedPositions['__stride_key__'];
  const BOX_X  = saved?.x ?? (p.x + p.w - BOX_W - 16);
  const BOX_Y  = saved?.y ?? (p.y + 16);

  const g = svg.append('g')
    .attr('class', 'stride-key')
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
    .text('STRIDE');

  usedCategories.forEach((cat, i) => {
    const rowY  = PAD + HEADER + i * LINE_H;
    const colour = theme.stride[cat as StrideCategory];

    g.append('circle')
      .attr('cx', PAD + BADGE_R).attr('cy', rowY + LINE_H / 2)
      .attr('r', BADGE_R - 2)
      .attr('fill', colour);

    g.append('text')
      .attr('x', PAD + BADGE_R).attr('y', rowY + LINE_H / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text(cat);

    g.append('text')
      .attr('x', PAD + BADGE_R * 2 + 4).attr('y', rowY + LINE_H / 2 + 4)
      .attr('fill', theme.metaBox.text)
      .attr('font-family', 'Courier New, Courier, monospace')
      .attr('font-size', '10px')
      .text(STRIDE_LABELS[cat as StrideCategory]);
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────────

export function attachTmDrag(svg: TmSvgSel, model: TMModel, onDragEnd?: () => void): void {
  const drag = d3.drag<SVGGElement, unknown>()
    .on('drag', function (event) {
      const [x, y] = d3.pointer(event, svg.node()!);
      const id  = d3.select(this).attr('data-id');
      const ref = model.refs.find(r => r.id === id);
      if (!ref) return;
      ref.x = x; ref.y = y;
      model.savedPositions[ref.id] = { x: Math.round(x), y: Math.round(y) };
      d3.select(this).attr('transform', `translate(${x},${y})`);
      tmRedrawFlows(svg, model, getTheme(model.meta.theme).tm);
    })
    .on('end', () => onDragEnd?.());
  svg.selectAll<SVGGElement, unknown>('g.tm-ref').call(drag);
}

export function attachTmMetaBoxDrag(
  svg: TmSvgSel,
  model: { savedPositions: Record<string, { x: number; y: number }> },
  onDragEnd?: () => void,
): void {
  let cx = 0, cy = 0;
  const drag = d3.drag<SVGGElement, unknown>()
    .on('start', function () {
      const t = d3.select(this).attr('transform') ?? '';
      const m = t.match(/translate\(([^,]+),\s*([^)]+)\)/);
      cx = m ? parseFloat(m[1]) : 0; cy = m ? parseFloat(m[2]) : 0;
    })
    .on('drag', function (event) {
      const ev = event as d3.D3DragEvent<SVGGElement, unknown, unknown>;
      cx += ev.dx; cy += ev.dy;
      const key = (d3.select(this).attr('class') === 'mitigations-box') ? '__mitigations__'
                : (d3.select(this).attr('class') === 'stride-key')      ? '__stride_key__'
                : '__meta__';
      model.savedPositions[key] = { x: Math.round(cx), y: Math.round(cy) };
      d3.select(this).attr('transform', `translate(${cx},${cy})`);
    })
    .on('end', () => onDragEnd?.());

  svg.select<SVGGElement>('g.meta-box').call(drag);
  svg.select<SVGGElement>('g.mitigations-box').call(drag);
  svg.select<SVGGElement>('g.stride-key').call(drag);
}

function tmRedrawFlows(svg: TmSvgSel, model: TMModel, theme: TMTheme): void {
  svg.selectAll('.tm-flow').remove();
  svg.selectAll('.tm-threat').remove();
  drawFlows(svg, model, theme);
  drawThreats(svg, model, theme);
  updateBoundaryRects(svg, model, theme);
  svg.selectAll('g.tm-ref').raise();
  svg.selectAll('.meta-box').raise();
  svg.selectAll('.mitigations-box').raise();
  svg.selectAll('.stride-key').raise();
}

function updateBoundaryRects(svg: TmSvgSel, model: TMModel, _theme: TMTheme): void {
  for (const boundary of model.boundaries) {
    const r   = computeBoundaryRect(boundary, model);
    const sel = svg.select<SVGGElement>(`g.tm-boundary[data-id="${boundary.id}"]`);
    if (sel.empty()) continue;
    sel.select('rect')
      .attr('x', r.x).attr('y', r.y)
      .attr('width', r.w).attr('height', r.h);
    sel.select('text')
      .attr('x', r.x + BOUNDARY_LABEL_PAD + 4)
      .attr('y', r.y + BOUNDARY_LABEL_PAD + 12);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function tmRender(svg: TmSvgSel, model: TMModel, registry: IDRegistry): void {
  const theme = getTheme(model.meta.theme).tm;

  svg.selectAll('*').remove();
  svg.append('defs');

  const p = pageRect(model.meta.orientation, model.meta.size);
  svg.append('rect')
    .attr('class', 'canvas-bg')
    .attr('x', 0).attr('y', 0)
    .attr('width', p.x + p.w + 100).attr('height', p.y + p.h + 100)
    .attr('fill', theme.canvasBg);

  drawBoundaries(svg, model, theme);
  drawFlows(svg, model, theme);
  drawRefs(svg, model, theme, registry);
  drawThreats(svg, model, theme);
  drawStrideKey(svg, model, theme);
  drawMitigationsPanel(svg, model, theme);
  drawMetaBox(svg, model, theme);
}
