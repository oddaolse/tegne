import type {
  IFFModel, IFFStore, IFFLink, IFFGroup,
  IFFRole, IFFRelationship, IFFState, IFFLabelCorner,
} from './types';
import type { ModelMeta, Position, ParseError, ParseResult } from '../types';
import { THEMES } from '../themes';

const VALID_ROLES: readonly IFFRole[] = [
  'master', 'replica', 'derived', 'aggregate', 'golden', 'reference', 'consumer',
];

const VALID_RELATIONSHIPS: readonly IFFRelationship[] = [
  'replicate', 'publish', 'ingest', 'derive', 'aggregate', 'enrich', 'merge', 'serve',
];

const VALID_STATES: readonly IFFState[] = ['new', 'changing', 'decommissioned'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseIFF(lines: string[]): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'infoflow' };
  const stores:         IFFStore[]  = [];
  const links:          IFFLink[]   = [];
  const groups:         IFFGroup[]  = [];
  const savedPositions: Record<string, Position> = {};
  let currentGroup: IFFGroup | null = null;

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
        case '@type':    /* consumed by dispatcher */ break;
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
        case '@size': {
          const valid = ['a4', 'a3', 'a2', 'a1', 'a0'];
          if (!valid.includes(value.toLowerCase())) {
            errors.push({ line: lineNum, message: `@size must be one of: ${valid.join(', ')}, got: "${value}"` });
          } else {
            meta.size = value.toLowerCase() as ModelMeta['size'];
          }
          break;
        }
        case '@position': {
          const parts = value.split(/\s+/);
          if (parts.length !== 3) {
            errors.push({ line: lineNum, message: `@position requires exactly: @position <id> <x> <y>` });
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
        case '@legend': {
          const v = value.toLowerCase();
          if (v !== 'on' && v !== 'off') {
            errors.push({ line: lineNum, message: `@legend must be on or off, got: "${value}"` });
          } else {
            meta.legend = v === 'on';
          }
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

      // store <id> [<role>] [<state>] [label:"..."]
      case 'store': {
        const bracketStart = rest.indexOf('[');
        const id = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();

        if (!id) {
          errors.push({ line: lineNum, message: 'store requires an id' });
          break;
        }

        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim());

        let role:  IFFRole  | undefined;
        let state: IFFState = 'current';
        let label: string   = id;

        for (const b of brackets) {
          const bLower = b.toLowerCase();
          if ((VALID_ROLES as readonly string[]).includes(bLower)) {
            role = bLower as IFFRole;
          } else if ((VALID_STATES as readonly string[]).includes(bLower)) {
            state = bLower as IFFState;
          } else if (b.startsWith('label:')) {
            // label:"Human Readable Label" — strip quotes
            label = b.slice(6).replace(/^["']|["']$/g, '').trim();
          } else {
            errors.push({ line: lineNum, message: `Unknown qualifier: [${b}]. Valid roles: ${VALID_ROLES.join(', ')}` });
          }
        }

        if (!role) {
          errors.push({ line: lineNum, message: `store "${id}" requires a role: [${VALID_ROLES.join('], [')}]` });
          break;
        }

        stores.push({ kind: 'store', id, label, role, state, x: 0, y: 0 });
        if (currentGroup) currentGroup.members.push(id);
        break;
      }

      // link <from> -> <to> : <relationship>
      case 'link': {
        const arrowIdx = rest.indexOf('->');
        if (arrowIdx === -1) {
          errors.push({ line: lineNum, message: 'link requires "->" between from and to' });
          break;
        }
        const from       = rest.slice(0, arrowIdx).trim();
        const afterArrow = rest.slice(arrowIdx + 2).trim();
        const colonIdx   = afterArrow.indexOf(':');
        if (colonIdx === -1) {
          errors.push({ line: lineNum, message: 'link requires ":" before relationship' });
          break;
        }
        const to          = afterArrow.slice(0, colonIdx).trim();
        const afterColon  = afterArrow.slice(colonIdx + 1).trim();

        // Optional transport bracket: relationship [transport]
        const bracketIdx    = afterColon.indexOf('[');
        const relationship  = (bracketIdx === -1 ? afterColon : afterColon.slice(0, bracketIdx)).trim().toLowerCase();
        const transportRaw  = bracketIdx !== -1 ? afterColon.slice(bracketIdx) : '';
        const transportMatch = transportRaw.match(/\[([^\]]+)\]/);
        const transport      = transportMatch ? transportMatch[1].trim() : undefined;

        if (!from) { errors.push({ line: lineNum, message: 'link: missing source id' });   break; }
        if (!to)   { errors.push({ line: lineNum, message: 'link: missing target id' });   break; }

        if (!(VALID_RELATIONSHIPS as readonly string[]).includes(relationship)) {
          errors.push({ line: lineNum, message: `Unknown relationship: "${relationship}". Valid: ${VALID_RELATIONSHIPS.join(', ')}` });
          break;
        }

        links.push({ kind: 'link', id: nextId('link'), from, to, relationship: relationship as IFFRelationship, transport });
        break;
      }

      // group <id> <label> [label:corner] ... end
      case 'group': {
        if (currentGroup) {
          errors.push({ line: lineNum, message: `Cannot nest groups — already inside group "${currentGroup.id}"` });
          break;
        }
        const bracketStart   = rest.indexOf('[');
        const beforeBrackets = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
        const spaceIdx       = beforeBrackets.indexOf(' ');
        const groupId        = spaceIdx === -1 ? beforeBrackets : beforeBrackets.slice(0, spaceIdx).trim();
        const rawLabel       = spaceIdx === -1 ? '' : beforeBrackets.slice(spaceIdx + 1).trim();

        if (!groupId) {
          errors.push({ line: lineNum, message: 'group requires an id' });
          break;
        }

        let labelCorner: IFFLabelCorner = 'upper-right';
        const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim().toLowerCase());
        for (const b of brackets) {
          if      (b === 'label:upper-left')  labelCorner = 'upper-left';
          else if (b === 'label:upper-right') labelCorner = 'upper-right';
          else if (b === 'label:lower-left')  labelCorner = 'lower-left';
          else if (b === 'label:lower-right') labelCorner = 'lower-right';
          else errors.push({ line: lineNum, message: `Unknown group qualifier: [${b}]` });
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

  const storeIds = new Set(stores.map(s => s.id));
  for (const link of links) {
    if (!storeIds.has(link.from)) {
      errors.push({ line: 0, message: `link: unknown id "${link.from}"` });
    }
    if (!storeIds.has(link.to)) {
      errors.push({ line: 0, message: `link: unknown id "${link.to}"` });
    }
  }

  const memberGroupMap = new Map<string, string>();
  for (const group of groups) {
    for (const memberId of group.members) {
      if (memberGroupMap.has(memberId)) {
        errors.push({ line: 0, message: `Store "${memberId}" appears in both group "${memberGroupMap.get(memberId)}" and group "${group.id}"` });
      } else {
        memberGroupMap.set(memberId, group.id);
      }
    }
  }

  const model: IFFModel = { meta, stores, links, groups, savedPositions };
  return { model, errors };
}
