import type {
  IDModel, IDElement, IDConnection, ParseError, ParseResult,
  Platform, IDState, Direction, LabelPos, ModelMeta, Position,
} from './types';
import { THEMES } from './themes';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const VALID_PLATFORMS: readonly Platform[] = ['aws', 'azure', 'on-prem', 'gcp', 'oracle'];
const VALID_STATES:    readonly IDState[]  = ['new', 'changing', 'decommissioned'];

function defaultLabelPos(kind: IDElement['kind']): LabelPos {
  return kind === 'system' ? 'inside' : 'below';
}

export function parseID(lines: string[]): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'id' };
  const elements:    IDElement[]    = [];
  const connections: IDConnection[] = [];
  const savedPositions: Record<string, Position> = {};

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line    = lines[i].trim();

    if (line === '' || line.startsWith('#')) continue;

    // ── @ directives ─────────────────────────────────────────────────
    if (line.startsWith('@')) {
      const spaceIdx = line.indexOf(' ');
      const keyword  = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
      const value    = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1).trim();

      switch (keyword) {
        case '@type':    /* consumed by dispatch */ break;
        case '@name':    meta.name    = value; break;
        case '@version': meta.version = value; break;
        case '@date':    meta.date    = value; break;
        case '@author':  meta.author  = value; break;
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

        case '@position': {
          const parts = value.split(/\s+/);
          if (parts.length !== 3) {
            errors.push({ line: lineNum, message: `@position requires: @position <id> <x> <y>` });
            break;
          }
          const [nodeId, xStr, yStr] = parts;
          const x = Number(xStr), y = Number(yStr);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            errors.push({ line: lineNum, message: `@position x and y must be numbers` });
            break;
          }
          savedPositions[nodeId] = { x: Math.round(x), y: Math.round(y) };
          break;
        }

        default:
          errors.push({ line: lineNum, message: `Unknown directive: ${keyword}` });
      }
      continue;
    }

    // ── Element keywords ─────────────────────────────────────────────
    const firstSpace = line.indexOf(' ');
    const keyword    = firstSpace === -1 ? line : line.slice(0, firstSpace);
    const rest       = firstSpace === -1 ? '' : line.slice(firstSpace + 1).trim();

    switch (keyword) {

      case 'system':
      case 'database':
      case 'queue': {
        const kind = keyword as IDElement['kind'];

        // id is everything before the first '['
        const bracketStart = rest.indexOf('[');
        const id = bracketStart === -1 ? rest.trim() : rest.slice(0, bracketStart).trim();

        if (!id) {
          errors.push({ line: lineNum, message: `${keyword} requires an id` });
          break;
        }

        // Extract all [...] tokens
        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim().toLowerCase());

        let platform: Platform | undefined;
        let state:    IDState  = 'current';
        let labelPos: LabelPos = defaultLabelPos(kind);

        for (const b of brackets) {
          if ((VALID_PLATFORMS as readonly string[]).includes(b)) {
            platform = b as Platform;
          } else if ((VALID_STATES as readonly string[]).includes(b)) {
            state = b as IDState;
          } else if (b === 'label:inside') {
            labelPos = 'inside';
          } else if (b === 'label:below') {
            labelPos = 'below';
          } else {
            errors.push({ line: lineNum, message: `Unknown qualifier: [${b}]. Valid platforms: ${VALID_PLATFORMS.join(', ')}` });
          }
        }

        if (!platform) {
          errors.push({ line: lineNum, message: `${keyword} "${id}" requires a platform: [${VALID_PLATFORMS.join('], [')}]` });
          break;
        }

        elements.push({ kind, id, label: id, platform, state, labelPos, x: 0, y: 0 });
        break;
      }

      case 'connect': {
        // connect <from> -> <to> : <protocol>
        // connect <from> <-> <to> : <protocol>
        let direction: Direction;
        let arrowIdx: number;
        let arrowLen: number;

        const biIdx  = rest.indexOf('<->');
        const uniIdx = rest.indexOf('->');

        if (biIdx !== -1) {
          direction = 'bidirectional';
          arrowIdx  = biIdx;
          arrowLen  = 3;
        } else if (uniIdx !== -1) {
          direction = 'unidirectional';
          arrowIdx  = uniIdx;
          arrowLen  = 2;
        } else {
          errors.push({ line: lineNum, message: `connect requires "->" or "<->" between from and to` });
          break;
        }

        const from       = rest.slice(0, arrowIdx).trim();
        const afterArrow = rest.slice(arrowIdx + arrowLen).trim();
        const colonIdx   = afterArrow.indexOf(':');

        if (colonIdx === -1) {
          errors.push({ line: lineNum, message: `connect requires ":" before protocol label` });
          break;
        }

        const to       = afterArrow.slice(0, colonIdx).trim();
        const protocol = afterArrow.slice(colonIdx + 1).trim();

        if (!from)     { errors.push({ line: lineNum, message: `connect: missing source id` });   break; }
        if (!to)       { errors.push({ line: lineNum, message: `connect: missing target id` });   break; }
        if (!protocol) { errors.push({ line: lineNum, message: `connect: missing protocol label` }); break; }

        connections.push({ kind: 'connection', id: nextId('conn'), from, to, direction, protocol });
        break;
      }

      case 'group':
        errors.push({ line: lineNum, message: `Groupings are not yet supported — planned for v2` });
        break;

      default:
        errors.push({ line: lineNum, message: `Unknown keyword: "${keyword}"` });
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────
  const elementIds = new Set(elements.map(e => e.id));
  for (const conn of connections) {
    if (!elementIds.has(conn.from)) {
      errors.push({ line: 0, message: `connect: unknown id "${conn.from}"` });
    }
    if (!elementIds.has(conn.to)) {
      errors.push({ line: 0, message: `connect: unknown id "${conn.to}"` });
    }
  }

  const model: IDModel = { meta, elements, connections, savedPositions };
  return { model, errors };
}
