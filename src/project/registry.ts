import { parse } from '../parser';
import type { SDModel, IDModel, IFFModel } from '../types';
import type { IDRegistry, RegistryEntry } from './types';

export function buildRegistry(files: Map<string, string>): IDRegistry {
  const entries = new Map<string, RegistryEntry>();
  const byId    = new Map<string, RegistryEntry[]>();
  const errors: Array<{ filename: string; message: string }> = [];

  for (const [filename, content] of files) {
    // Skip project manifest itself
    if (filename.endsWith('.tegne')) continue;

    const { model, errors: parseErrors } = parse(content);
    if (!model) {
      if (parseErrors.length > 0) {
        errors.push({ filename, message: `Parse failed: ${parseErrors.map(e => e.message).join('; ')}` });
      }
      continue;
    }

    const diagramType = model.meta.diagramType ?? 'sd';

    const addEntry = (id: string, elementKind: string, label: string) => {
      const existing = byId.get(id);
      if (existing) {
        const sameType = existing.filter(e => e.diagramType === diagramType);
        if (sameType.length > 0) {
          errors.push({
            filename,
            message: `ID collision: "${id}" (${diagramType}) already declared in "${sameType[0].filename}"`,
          });
        }
      }

      const entry: RegistryEntry = {
        id,
        diagramType: diagramType as RegistryEntry['diagramType'],
        filename,
        elementKind,
        label,
      };
      entries.set(`${filename}:${id}`, entry);

      const list = byId.get(id) ?? [];
      list.push(entry);
      byId.set(id, list);
    };

    if (diagramType === 'id') {
      const m = model as IDModel;
      for (const el of m.elements) addEntry(el.id, el.kind, el.label);
    } else if (diagramType === 'infoflow') {
      const m = model as IFFModel;
      for (const s of m.stores) addEntry(s.id, 'store', s.label);
    } else {
      const m = model as SDModel;
      for (const s of m.stocks)      addEntry(s.id, 'stock',  s.label);
      for (const c of m.clouds)      addEntry(c.id, 'cloud',  c.label);
      for (const a of m.auxiliaries) addEntry(a.id, 'aux',    a.label);
    }
  }

  return { entries, byId, errors };
}

export function emptyRegistry(): IDRegistry {
  return { entries: new Map(), byId: new Map(), errors: [] };
}
