import type { SDModel, Node } from './types';
import { pageRect } from './renderer';

// ── SVG Export ────────────────────────────────────────────────────────────────

export async function exportSVG(svgEl: SVGSVGElement, model: SDModel): Promise<void> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Always export at full page zoom (ignore current pan/zoom state)
  const p = pageRect(model.meta.orientation);
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
  const posLines = allNodes
    .map(n => `@position ${n.id} ${Math.round(n.x)} ${Math.round(n.y)}`)
    .join('\n');

  const content = `${stripped}\n\n${posLines}\n`;

  await saveAs(content, 'text/plain', filenameFor(model, 'sd'), [
    { description: 'Tegne diagram files', accept: { 'text/plain': ['.sd'] } },
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function filenameFor(model: SDModel, ext: string): string {
  const name = model.meta.name;
  if (name) {
    return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.${ext}`;
  }
  return `model.${ext}`;
}

// Programmatic download — always triggers browser save dialog at default location.
function download(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
