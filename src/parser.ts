import type { ParseResult } from './types';
import { parseSD }  from './sd/parser';
import { parseID }  from './id/parser';
import { parseIFF } from './iff/parser';

export function parse(dsl: string): ParseResult {
  const lines = dsl.split('\n');

  // Pre-scan for @type — dispatch to the appropriate parser
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@type')) {
      const value = trimmed.slice('@type'.length).trim();
      if (value === 'id')       return parseID(lines);
      if (value === 'infoflow') return parseIFF(lines);
      if (value === 'sd')       break;  // fall through to SD parser
      // Unknown type — let the SD parser emit the error
      break;
    }
  }

  return parseSD(lines);
}
