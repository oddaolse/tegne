import type { SDModel, IDModel, IFFModel, TMModel, Node } from './types';
import { pageRect } from './sd/renderer';

// ── SVG Export ────────────────────────────────────────────────────────────────

export async function exportSVG(svgEl: SVGSVGElement, model: SDModel | IDModel | IFFModel | TMModel): Promise<void> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Always export at full page zoom (ignore current pan/zoom state)
  const p = pageRect(model.meta.orientation, model.meta.size);
  clone.setAttribute('viewBox', `${p.x} ${p.y} ${p.w} ${p.h}`);

  // Strip data-* attributes
  clone.querySelectorAll('[data-id]').forEach(el => el.removeAttribute('data-id'));

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(clone);
  // Ensure correct XML namespace declaration
  const svgStr = raw.startsWith('<?xml') ? raw : `<?xml version="1.0" encoding="utf-8"?>\n${raw}`;

  await saveAs(svgStr, 'image/svg+xml', filenameFor(model, 'svg'), [
    { description: 'SVG files', accept: { 'image/svg+xml': ['.svg'] } },
  ]);
}

// ── SD File Save (DSL + positions) ───────────────────────────────────────────

export async function saveSD(dslText: string, model: SDModel): Promise<void> {
  // Strip any existing @position lines from the DSL text
  const stripped = dslText
    .split('\n')
    .filter(l => !l.trim().startsWith('@position'))
    .join('\n')
    .trimEnd();

  const allNodes: Node[] = [...model.stocks, ...model.clouds, ...model.auxiliaries];
  let posLines = allNodes
    .map(n => `@position ${n.id} ${Math.round(n.x)} ${Math.round(n.y)}`)
    .join('\n');

  const metaPos = model.savedPositions['__meta__'];
  if (metaPos) posLines += `\n@position __meta__ ${Math.round(metaPos.x)} ${Math.round(metaPos.y)}`;

  const content = `${stripped}\n\n${posLines}\n`;

  await saveAs(content, 'text/plain', filenameFor(model, 'sd'), [
    { description: 'Tegne diagram files', accept: { 'text/plain': ['.sd'] } },
  ]);
}

// ── ID File Save ──────────────────────────────────────────────────────────────

export async function saveID(dslText: string, model: IDModel): Promise<void> {
  const stripped = dslText
    .split('\n')
    .filter(l => !l.trim().startsWith('@position'))
    .join('\n')
    .trimEnd();

  let posLines = model.elements
    .map(e => `@position ${e.id} ${Math.round(e.x)} ${Math.round(e.y)}`)
    .join('\n');

  const metaPos = model.savedPositions['__meta__'];
  if (metaPos) posLines += `\n@position __meta__ ${Math.round(metaPos.x)} ${Math.round(metaPos.y)}`;

  const content = `${stripped}\n\n${posLines}\n`;

  await saveAs(content, 'text/plain', filenameFor(model, 'id'), [
    { description: 'Tegne integration diagram files', accept: { 'text/plain': ['.id'] } },
  ]);
}

// ── IFF File Save ─────────────────────────────────────────────────────────────

export async function saveIFF(dslText: string, model: IFFModel): Promise<void> {
  const stripped = dslText
    .split('\n')
    .filter(l => !l.trim().startsWith('@position'))
    .join('\n')
    .trimEnd();

  let posLines = model.nodes
    .map(node => `@position ${node.id} ${Math.round(node.x)} ${Math.round(node.y)}`)
    .join('\n');

  const metaPos = model.savedPositions['__meta__'];
  if (metaPos) posLines += `\n@position __meta__ ${Math.round(metaPos.x)} ${Math.round(metaPos.y)}`;

  const content = `${stripped}\n\n${posLines}\n`;

  await saveAs(content, 'text/plain', filenameFor(model, 'iff'), [
    { description: 'Tegne information flow files', accept: { 'text/plain': ['.iff'] } },
  ]);
}

// ── TM File Save ─────────────────────────────────────────────────────────────

export async function saveTM(dslText: string, model: TMModel): Promise<void> {
  const stripped = dslText
    .split('\n')
    .filter(l => !l.trim().startsWith('@position'))
    .join('\n')
    .trimEnd();

  let posLines = model.refs
    .map(r => `@position ${r.id} ${Math.round(r.x)} ${Math.round(r.y)}`)
    .join('\n');

  const metaPos = model.savedPositions['__meta__'];
  if (metaPos) posLines += `\n@position __meta__ ${Math.round(metaPos.x)} ${Math.round(metaPos.y)}`;
  const mitPos = model.savedPositions['__mitigations__'];
  if (mitPos)  posLines += `\n@position __mitigations__ ${Math.round(mitPos.x)} ${Math.round(mitPos.y)}`;
  const strideKeyPos = model.savedPositions['__stride_key__'];
  if (strideKeyPos) posLines += `\n@position __stride_key__ ${Math.round(strideKeyPos.x)} ${Math.round(strideKeyPos.y)}`;

  const content = `${stripped}\n\n${posLines}\n`;

  await saveAs(content, 'text/plain', filenameFor(model, 'tm'), [
    { description: 'Tegne threat model files', accept: { 'text/plain': ['.tm'] } },
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function filenameFor(model: SDModel | IDModel | IFFModel | TMModel, ext: string): string {
  const name = model.meta.name;
  if (name) {
    return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.${ext}`;
  }
  return `model.${ext}`;
}

// Uses the File System Access API when available (Chrome/Edge) for a native
// Save As dialog; falls back to a programmatic download link elsewhere.
async function saveAs(
  content: string,
  mime: string,
  filename: string,
  types: FilePickerAcceptType[],
): Promise<void> {
  const blob = new Blob([content], { type: mime });

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled the dialog — do nothing
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Unexpected error — fall through to download fallback
    }
  }

  // Fallback: programmatic download (Firefox, Safari, file:// contexts)
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
