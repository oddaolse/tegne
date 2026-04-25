import type {
  DiagramType, FlowType, LocationType, ModelMeta, ParseError, ParseOptions,
  ParseResult, SystemType,
} from './types';

export interface IncludedContent {
  locationTypes: LocationType[];
  systemTypes:   SystemType[];
  flowTypes:     FlowType[];
  refFiles:      string[];
  metaDefaults:  Partial<Pick<ModelMeta, 'theme' | 'orientation' | 'size' | 'legend' | 'showIds'>>;
}

export function emptyIncludedContent(): IncludedContent {
  return { locationTypes: [], systemTypes: [], flowTypes: [], refFiles: [], metaDefaults: {} };
}

const META_DEFAULT_KEYS: ReadonlyArray<keyof IncludedContent['metaDefaults']> = [
  'theme', 'orientation', 'size', 'legend', 'showIds',
];

/**
 * Scan `lines` for `@include <filename>` directives and resolve each by parsing
 * the referenced file with `includeMode=true`. Merges contributed dictionaries,
 * ref-file lists, and metadata defaults across all includes. Collisions on
 * dictionary names are reported. The result is intended to be merged into the
 * host model BEFORE per-line parsing of the host file.
 *
 * In include mode (i.e. the host parse is itself resolving an include), this
 * function does nothing — nested includes are flagged as errors elsewhere.
 */
export function resolveIncludes(
  lines: string[],
  hostType: DiagramType,
  hostParser: (lines: string[], opts?: ParseOptions) => ParseResult,
  options: ParseOptions | undefined,
  errors: ParseError[],
): IncludedContent {
  const merged = emptyIncludedContent();
  if (options?.includeMode) return merged;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('@include')) continue;
    const filename = trimmed.slice('@include'.length).trim();
    const lineNum  = i + 1;

    if (!filename) {
      errors.push({ line: lineNum, message: '@include requires a filename' });
      continue;
    }

    if (!options?.includeFiles) {
      errors.push({ line: lineNum, message: `@include "${filename}": no project loaded — use Open Folder to load related files` });
      continue;
    }

    const content = options.includeFiles.get(filename);
    if (content === undefined) {
      const available = [...options.includeFiles.keys()].join(', ') || 'none';
      errors.push({ line: lineNum, message: `@include "${filename}": file not found in project. Available: ${available}` });
      continue;
    }

    const includedLines = content.split('\n');
    const declaredType = detectDiagramType(includedLines);
    if (declaredType !== hostType) {
      errors.push({ line: lineNum, message: `@include "${filename}": expected @type "${hostType}", got "${declaredType}"` });
      continue;
    }

    const subResult     = hostParser(includedLines, { includeMode: true });

    // Forward sub-parse errors with file context so users can locate them.
    for (const e of subResult.errors) {
      const where = e.line > 0 ? `${filename}:${e.line}` : filename;
      errors.push({ line: lineNum, message: `@include "${filename}": ${e.message} (${where})` });
    }

    if (!subResult.model) continue;
    if (subResult.errors.length > 0) continue;

    const subMeta = subResult.model.meta;

    if (subMeta.locationTypes) {
      for (const lt of subMeta.locationTypes) {
        if (merged.locationTypes.find(x => x.name.toLowerCase() === lt.name.toLowerCase())) {
          errors.push({ line: lineNum, message: `@include "${filename}": location-type "${lt.name}" already contributed by another include` });
          continue;
        }
        merged.locationTypes.push(lt);
      }
    }
    if (subMeta.systemTypes) {
      for (const st of subMeta.systemTypes) {
        if (merged.systemTypes.find(x => x.name.toLowerCase() === st.name.toLowerCase())) {
          errors.push({ line: lineNum, message: `@include "${filename}": system "${st.name}" already contributed by another include` });
          continue;
        }
        merged.systemTypes.push(st);
      }
    }
    if (subMeta.flowTypes) {
      for (const ft of subMeta.flowTypes) {
        if (merged.flowTypes.find(x => x.name.toLowerCase() === ft.name.toLowerCase())) {
          errors.push({ line: lineNum, message: `@include "${filename}": flow-type "${ft.name}" already contributed by another include` });
          continue;
        }
        merged.flowTypes.push(ft);
      }
    }

    // TM specifically: pull refFiles out of the included model so they are
    // additively contributed to the host's TM `refFiles` list.
    const subRefs = (subResult.model as { refFiles?: string[] }).refFiles;
    if (Array.isArray(subRefs)) {
      for (const r of subRefs) {
        if (!merged.refFiles.includes(r)) merged.refFiles.push(r);
      }
    }

    for (const key of META_DEFAULT_KEYS) {
      if (merged.metaDefaults[key] === undefined && subMeta[key] !== undefined) {
        (merged.metaDefaults as Record<string, unknown>)[key] = subMeta[key];
      }
    }
  }

  return merged;
}

/**
 * Apply metadata defaults from included files to the host's meta — only where
 * the host has not already set a value (local always wins).
 */
export function applyMetaDefaults(meta: ModelMeta, defaults: IncludedContent['metaDefaults']): void {
  for (const key of META_DEFAULT_KEYS) {
    if (meta[key] === undefined && defaults[key] !== undefined) {
      (meta as Record<string, unknown>)[key] = defaults[key];
    }
  }
}

function detectDiagramType(lines: string[]): DiagramType {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@type')) continue;
    const value = trimmed.slice('@type'.length).trim();
    if (value === 'id' || value === 'infoflow' || value === 'tm' || value === 'sd') return value;
    return 'sd';
  }
  return 'sd';
}
