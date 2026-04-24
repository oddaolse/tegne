import type {
  IDModel, IDElement, IDConnection, IDGroup,
  IDState, Direction, PlacementPos, LabelCorner,
} from './types';
import type { ModelMeta, Position, ParseError, ParseResult, LocationType } from '../types';
import { THEMES, VALID_PALETTE_COLOURS } from '../themes';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const VALID_STATES: readonly IDState[] = ['new', 'changing', 'decommissioned'];

function defaultPlacement(kind: IDElement['kind']): PlacementPos {
  return kind === 'system' ? 'inside' : 'below';
}

export function parseID(lines: string[]): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'id' };
  const elements:    IDElement[]    = [];
  const connections: IDConnection[] = [];
  const groups:      IDGroup[]      = [];
  const savedPositions: Record<string, Position> = {};
  const locationTypes: LocationType[] = [];
  let currentGroup: IDGroup | null = null;
  let inLocationTypesBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const line    = rawLine.trim();

    // Handle @location-types block content
    if (inLocationTypesBlock) {
      if (line === '') {
        inLocationTypesBlock = false;
        continue;
      }
      // Indented line = block content
      if (rawLine.startsWith('  ') || rawLine.startsWith('\t')) {
        const parts = line.split(/\s+/);
        if (parts.length !== 2) {
          errors.push({ line: lineNum, message: 'location-type requires: <name> <colour>' });
          continue;
        }
        const [name, colour] = parts;
        if (!(VALID_PALETTE_COLOURS as readonly string[]).includes(colour.toLowerCase())) {
          errors.push({ line: lineNum, message: `Unknown palette colour: "${colour}". Valid: ${VALID_PALETTE_COLOURS.join(', ')}` });
          continue;
        }
        locationTypes.push({ name, colour: colour.toLowerCase() });
        continue;
      } else {
        // Non-indented non-empty line ends block, fall through to process normally
        inLocationTypesBlock = false;
      }
    }

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

        case '@location-types': {
          inLocationTypesBlock = true;
          break;
        }

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

        case '@legend': {
          const v = value.toLowerCase();
          if (v !== 'on' && v !== 'off') {
            errors.push({ line: lineNum, message: `@legend must be on or off, got: "${value}"` });
          } else {
            meta.legend = v === 'on';
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

        // Extract all [...] tokens — preserve case for label: value
        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim());

        // Build lookup set from declared location-types
        const knownLocationTypes = new Set(locationTypes.map(lt => lt.name.toLowerCase()));

        let locationType: string | undefined;
        let state:     IDState      = 'current';
        let placement: PlacementPos = defaultPlacement(kind);
        let label:     string       = id;

        for (const b of brackets) {
          const bLower = b.toLowerCase();
          if (knownLocationTypes.has(bLower)) {
            locationType = locationTypes.find(lt => lt.name.toLowerCase() === bLower)!.name;
          } else if ((VALID_STATES as readonly string[]).includes(bLower)) {
            state = bLower as IDState;
          } else if (b.startsWith('label:')) {
            label = b.slice(6).replace(/^["']|["']$/g, '').trim();
          } else if (bLower === 'placement:inside') {
            placement = 'inside';
          } else if (bLower === 'placement:below') {
            placement = 'below';
          } else {
            const validTypes = locationTypes.map(lt => lt.name).join(', ') || 'none defined — add @location-types block';
            errors.push({ line: lineNum, message: `Unknown qualifier: [${b}]. Valid location-types: ${validTypes}` });
          }
        }

        if (!locationType) {
          const validTypes = locationTypes.map(lt => lt.name).join('], [') || 'none defined — add @location-types block';
          errors.push({ line: lineNum, message: `${keyword} "${id}" requires a location-type: [${validTypes}]` });
          break;
        }

        elements.push({ kind, id, label, locationType, state, placement, x: 0, y: 0 });
        if (currentGroup) currentGroup.members.push(id);
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

      case 'group': {
        if (currentGroup) {
          errors.push({ line: lineNum, message: `Cannot nest groups — already inside group "${currentGroup.id}"` });
          break;
        }
        const bracketStart = rest.indexOf('[');
        const beforeBrackets = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
        const spaceIdx = beforeBrackets.indexOf(' ');
        const groupId  = spaceIdx === -1 ? beforeBrackets : beforeBrackets.slice(0, spaceIdx).trim();
        const rawLabel = spaceIdx === -1 ? ''              : beforeBrackets.slice(spaceIdx + 1).trim();

        if (!groupId) {
          errors.push({ line: lineNum, message: 'group requires an id' });
          break;
        }

        let labelCorner: LabelCorner = 'upper-right';
        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim().toLowerCase());
        for (const b of brackets) {
          if      (b === 'corner:upper-left')  labelCorner = 'upper-left';
          else if (b === 'corner:upper-right') labelCorner = 'upper-right';
          else if (b === 'corner:lower-left')  labelCorner = 'lower-left';
          else if (b === 'corner:lower-right') labelCorner = 'lower-right';
          else errors.push({ line: lineNum, message: `Unknown group qualifier: [${b}]. Valid: [corner:upper-left], [corner:upper-right], [corner:lower-left], [corner:lower-right]` });
        }

        currentGroup = { kind: 'group', id: groupId, label: rawLabel || groupId, members: [], labelCorner };
        break;
      }

      case 'end': {
        if (!currentGroup) {
          errors.push({ line: lineNum, message: '"end" without a matching "group"' });
          break;
        }
        groups.push(currentGroup);
        currentGroup = null;
        break;
      }

      default:
        errors.push({ line: lineNum, message: `Unknown keyword: "${keyword}"` });
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────
  if (currentGroup) {
    errors.push({ line: 0, message: `Group "${currentGroup.id}" was never closed with "end"` });
  }

  const elementIds = new Set(elements.map(e => e.id));
  for (const conn of connections) {
    if (!elementIds.has(conn.from)) {
      errors.push({ line: 0, message: `connect: unknown id "${conn.from}"` });
    }
    if (!elementIds.has(conn.to)) {
      errors.push({ line: 0, message: `connect: unknown id "${conn.to}"` });
    }
  }

  // Check for elements declared in multiple groups
  const memberGroupMap = new Map<string, string>();
  for (const group of groups) {
    for (const memberId of group.members) {
      if (memberGroupMap.has(memberId)) {
        errors.push({ line: 0, message: `Element "${memberId}" appears in both group "${memberGroupMap.get(memberId)}" and group "${group.id}"` });
      } else {
        memberGroupMap.set(memberId, group.id);
      }
    }
  }

  // Store location-types in meta
  if (locationTypes.length > 0) {
    meta.locationTypes = locationTypes;
  }

  const model: IDModel = { meta, elements, connections, groups, savedPositions };
  return { model, errors };
}
