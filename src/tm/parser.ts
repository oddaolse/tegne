import type { TMModel, TMRef, TMBoundary, TMFlow, TMThreat, TMMitigation } from './types';
import type { ModelMeta, Position, ParseError, ParseResult } from '../types';
import type { StrideCategory } from '../themes';
import { THEMES } from '../themes';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

const VALID_STRIDE = new Set<string>(['S', 'T', 'R', 'I', 'D', 'E']);

export function parseTM(lines: string[]): ParseResult {
  let idCounter = 0;
  const nextId = (p: string) => `${p}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'tm' };
  const refFiles:    string[]        = [];
  const refs:        TMRef[]         = [];
  const boundaries:  TMBoundary[]    = [];
  const flows:       TMFlow[]        = [];
  const threats:     TMThreat[]      = [];
  const mitigations: TMMitigation[]  = [];
  const savedPositions: Record<string, Position> = {};

  let currentBoundary: TMBoundary | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line    = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    // ── @ directives ─────────────────────────────────────────────────────────
    if (line.startsWith('@')) {
      const spaceIdx = line.indexOf(' ');
      const keyword  = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
      const value    = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1).trim();

      switch (keyword) {
        case '@type':    /* consumed by dispatcher */ break;
        case '@name':    meta.name    = value; break;
        case '@version': meta.version = value; break;
        case '@date':    meta.date    = value; break;
        case '@author':  meta.author  = value; break;
        case '@ref':     refFiles.push(value); break;

        case '@theme': {
          if (!THEMES[value]) {
            errors.push({ line: lineNum, message: `Unknown theme: "${value}". Available: ${Object.keys(THEMES).join(', ')}` });
          } else {
            meta.theme = value;
          }
          break;
        }

        case '@orientation': {
          if (value !== 'landscape' && value !== 'portrait') {
            errors.push({ line: lineNum, message: `@orientation must be landscape or portrait, got: "${value}"` });
          } else {
            meta.orientation = value;
          }
          break;
        }

        case '@size': {
          const valid = ['a4', 'a3', 'a2', 'a1', 'a0'];
          if (!valid.includes(value.toLowerCase())) {
            errors.push({ line: lineNum, message: `@size must be one of: ${valid.join(', ')}, got: "${value}"` });
          } else {
            meta.size = value.toLowerCase() as ModelMeta['size'];
          }
          break;
        }

        case '@show-ids': {
          const v = value.toLowerCase();
          if (v !== 'on' && v !== 'off') {
            errors.push({ line: lineNum, message: `@show-ids must be on or off, got: "${value}"` });
          } else {
            meta.showIds = v === 'on';
          }
          break;
        }

        case '@position': {
          const parts = value.split(/\s+/);
          if (parts.length !== 3) { errors.push({ line: lineNum, message: `@position requires: @position <id> <x> <y>` }); break; }
          const [nodeId, xStr, yStr] = parts;
          const x = Number(xStr), y = Number(yStr);
          if (!Number.isFinite(x) || !Number.isFinite(y)) { errors.push({ line: lineNum, message: `@position x and y must be numbers` }); break; }
          savedPositions[nodeId] = { x: Math.round(x), y: Math.round(y) };
          break;
        }

        default:
          errors.push({ line: lineNum, message: `Unknown directive: ${keyword}` });
      }
      continue;
    }

    // ── Element keywords ──────────────────────────────────────────────────────
    const firstSpace = line.indexOf(' ');
    const keyword    = firstSpace === -1 ? line : line.slice(0, firstSpace);
    const rest       = firstSpace === -1 ? '' : line.slice(firstSpace + 1).trim();

    switch (keyword) {

      // ref <id>
      case 'ref': {
        const id = rest.trim();
        if (!id) { errors.push({ line: lineNum, message: 'ref requires an id' }); break; }
        const pos = savedPositions[id] ?? { x: 0, y: 0 };
        refs.push({ kind: 'ref', id, x: pos.x, y: pos.y });
        if (currentBoundary) currentBoundary.members.push(id);
        break;
      }

      // boundary <id> [label:"..."]
      case 'boundary': {
        if (currentBoundary) {
          errors.push({ line: lineNum, message: `Cannot nest boundaries — already inside "${currentBoundary.id}"` });
          break;
        }
        const bracketStart   = rest.indexOf('[');
        const beforeBrackets = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
        const spaceIdx       = beforeBrackets.indexOf(' ');
        const boundaryId     = spaceIdx === -1 ? beforeBrackets : beforeBrackets.slice(0, spaceIdx).trim();
        const rawLabel       = spaceIdx === -1 ? '' : beforeBrackets.slice(spaceIdx + 1).trim();
        if (!boundaryId) { errors.push({ line: lineNum, message: 'boundary requires an id' }); break; }

        let label = rawLabel || boundaryId;
        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim());
        for (const b of brackets) {
          if (b.startsWith('label:')) {
            label = b.slice(6).replace(/^["']|["']$/g, '').trim();
          } else {
            errors.push({ line: lineNum, message: `Unknown boundary qualifier: [${b}]` });
          }
        }

        currentBoundary = { kind: 'boundary', id: boundaryId, label, members: [] };
        break;
      }

      case 'end': {
        if (!currentBoundary) { errors.push({ line: lineNum, message: '"end" without a matching "boundary"' }); break; }
        boundaries.push(currentBoundary);
        currentBoundary = null;
        break;
      }

      // flow <id> <from> -> <to> [label:"..."]
      case 'flow': {
        const arrowIdx = rest.indexOf('->');
        if (arrowIdx === -1) { errors.push({ line: lineNum, message: 'flow requires "->" between from and to' }); break; }

        const beforeArrow = rest.slice(0, arrowIdx).trim();
        const afterArrow  = rest.slice(arrowIdx + 2).trim();

        const parts = beforeArrow.split(/\s+/);
        if (parts.length < 2) { errors.push({ line: lineNum, message: 'flow requires an id and a source: flow <id> <from> -> <to>' }); break; }

        const flowId = parts[0];
        const from   = parts[1];

        const bracketStart  = afterArrow.indexOf('[');
        const toRaw         = (bracketStart === -1 ? afterArrow : afterArrow.slice(0, bracketStart)).trim();
        const brackets      = [...afterArrow.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim());
        let flowLabel: string | undefined;
        for (const b of brackets) {
          if (b.startsWith('label:')) flowLabel = b.slice(6).replace(/^["']|["']$/g, '').trim();
        }

        if (!from || !toRaw) { errors.push({ line: lineNum, message: 'flow: missing from or to id' }); break; }
        flows.push({ kind: 'flow', id: flowId, from, to: toRaw, label: flowLabel });
        break;
      }

      // threat <id> [stride:X] <targetId> : "description"
      case 'threat': {
        // Extract [stride:X] bracket
        const bracketMatch = rest.match(/\[stride:([A-Za-z])\]/i);
        if (!bracketMatch) { errors.push({ line: lineNum, message: 'threat requires [stride:S|T|R|I|D|E]' }); break; }

        const strideRaw = bracketMatch[1].toUpperCase();
        if (!VALID_STRIDE.has(strideRaw)) {
          errors.push({ line: lineNum, message: `Unknown STRIDE category: "${strideRaw}". Valid: S, T, R, I, D, E` });
          break;
        }

        const withoutBracket = rest.replace(/\[stride:[A-Za-z]\]/i, '').trim();
        const colonIdx = withoutBracket.indexOf(':');
        if (colonIdx === -1) { errors.push({ line: lineNum, message: 'threat requires ": \\"description\\""' }); break; }

        const parts = withoutBracket.slice(0, colonIdx).trim().split(/\s+/);
        if (parts.length < 2) { errors.push({ line: lineNum, message: 'threat requires: threat <id> [stride:X] <targetId> : "desc"' }); break; }

        const threatId = parts[0];
        const targetId = parts[1];
        const desc     = withoutBracket.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

        threats.push({ kind: 'threat', id: threatId, stride: strideRaw as StrideCategory, targetId, description: desc });
        break;
      }

      // mitigate <threatId> : "description"
      case 'mitigate': {
        const colonIdx = rest.indexOf(':');
        if (colonIdx === -1) { errors.push({ line: lineNum, message: 'mitigate requires ": \\"description\\""' }); break; }
        const threatId = rest.slice(0, colonIdx).trim();
        const desc     = rest.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!threatId) { errors.push({ line: lineNum, message: 'mitigate requires a threat id' }); break; }
        mitigations.push({ kind: 'mitigation', id: nextId('mit'), threatId, description: desc });
        break;
      }

      default:
        errors.push({ line: lineNum, message: `Unknown keyword: "${keyword}"` });
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────────────
  if (currentBoundary) {
    errors.push({ line: 0, message: `Boundary "${currentBoundary.id}" was never closed with "end"` });
  }

  const refIds  = new Set(refs.map(r => r.id));
  const flowIds = new Set(flows.map(f => f.id));
  for (const t of threats) {
    if (!refIds.has(t.targetId) && !flowIds.has(t.targetId)) {
      errors.push({ line: 0, message: `threat "${t.id}": target "${t.targetId}" is not a declared ref or flow id` });
    }
  }
  for (const m of mitigations) {
    if (!threats.find(t => t.id === m.threatId)) {
      errors.push({ line: 0, message: `mitigate: threat "${m.threatId}" is not declared` });
    }
  }

  const model: TMModel = { meta, refFiles, refs, boundaries, flows, threats, mitigations, savedPositions };
  return { model, errors };
}
