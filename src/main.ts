import * as d3 from 'd3';
import { parse } from './parser';
import { layout } from './layout';
import { render, pageRect } from './renderer';
import { attachDrag } from './drag';
import { exportSVG, saveSD } from './export';
import type { SDModel } from './types';

const LS_KEY = 'tegne-dsl';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const editor      = document.getElementById('editor')      as HTMLTextAreaElement;
const errorPanel  = document.getElementById('error-panel') as HTMLDivElement;
const fileInput   = document.getElementById('file-input')  as HTMLInputElement;
const btnOpen     = document.getElementById('btn-open')    as HTMLButtonElement;
const btnSave     = document.getElementById('btn-save')    as HTMLButtonElement;
const btnRender   = document.getElementById('btn-render')  as HTMLButtonElement;
const btnExport   = document.getElementById('btn-export')  as HTMLButtonElement;
const btnZoomIn       = document.getElementById('btn-zoom-in')      as HTMLButtonElement;
const btnZoomOut      = document.getElementById('btn-zoom-out')     as HTMLButtonElement;
const btnZoomFit      = document.getElementById('btn-zoom-fit')     as HTMLButtonElement;
const zoomLabel       = document.getElementById('zoom-label')       as HTMLSpanElement;
const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;
const svgEl           = document.getElementById('canvas')           as unknown as SVGSVGElement;
const svg             = d3.select(svgEl);

let currentModel: SDModel | null = null;

// ── Zoom & pan ────────────────────────────────────────────────────────────────
const ZOOM_STEP = 1.10;
const ZOOM_MIN  = 0.25;
const ZOOM_MAX  = 4.0;
let zoomLevel   = 1.0;
let panX        = 0;
let panY        = 0;

function applyZoom(): void {
  const p  = pageRect(currentModel?.meta.orientation);
  const w  = p.w / zoomLevel;
  const h  = p.h / zoomLevel;
  const x  = p.x + panX + (p.w - w) / 2;
  const y  = p.y + panY + (p.h - h) / 2;
  svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
}

function resetView(): void {
  zoomLevel = 1.0;
  panX      = 0;
  panY      = 0;
  applyZoom();
}

// ── Render pipeline ───────────────────────────────────────────────────────────
function runRender(): void {
  const dsl = editor.value;
  localStorage.setItem(LS_KEY, dsl);

  const { model, errors } = parse(dsl);

  if (errors.length > 0) {
    errorPanel.innerHTML = errors
      .map(e => `<div>${e.line > 0 ? `Line ${e.line}: ` : ''}${escHtml(e.message)}</div>`)
      .join('');
    errorPanel.classList.add('visible');
  } else {
    errorPanel.innerHTML = '';
    errorPanel.classList.remove('visible');
  }

  if (!model || errors.some(e => e.line > 0)) {
    // Parse errors on specific lines — keep last valid diagram
    return;
  }

  layout(model);
  render(svg, model);
  attachDrag(svg, model);
  currentModel = model;
  resetView();
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Button handlers ───────────────────────────────────────────────────────────
btnOpen.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.value = reader.result as string;
    runRender();
  };
  reader.readAsText(file);
  fileInput.value = '';   // allow re-opening same file
});

btnSave.addEventListener('click', () => {
  if (!currentModel) { alert('Nothing to save — render a model first.'); return; }
  void saveSD(editor.value, currentModel);
});

btnRender.addEventListener('click', runRender);

btnZoomIn.addEventListener('click', () => {
  zoomLevel = Math.min(ZOOM_MAX, zoomLevel * ZOOM_STEP);
  applyZoom();
});
btnZoomOut.addEventListener('click', () => {
  zoomLevel = Math.max(ZOOM_MIN, zoomLevel / ZOOM_STEP);
  applyZoom();
});
btnZoomFit.addEventListener('click', resetView);

// ── Scroll to pan ─────────────────────────────────────────────────────────────
canvasContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Scale scroll delta to SVG units; faster panning when zoomed in
  const sensitivity = 0.8 / zoomLevel;
  panX += e.deltaX * sensitivity;
  panY += e.deltaY * sensitivity;
  applyZoom();
}, { passive: false });

btnExport.addEventListener('click', () => {
  if (!currentModel) { alert('Nothing to export — render a model first.'); return; }
  void exportSVG(svgEl, currentModel);
});

// ── Restore from localStorage ─────────────────────────────────────────────────
const saved = localStorage.getItem(LS_KEY);
if (saved) {
  editor.value = saved;
  runRender();
}
