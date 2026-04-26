import type {
  IDModel, IDElement, IDConnection, IDGroup,
  IDState, Direction, PlacementPos, LabelCorner,
} from './types';
import type { FlowType, ModelMeta, Position, TextBlock, ParseError, ParseResult, LocationType, ParseOptions } from '../types';
import { applyMetaDefaults, resolveIncludes } from '../include';
import { THEMES, VALID_PALETTE_COLOURS } from '../themes';

const POSITIONAL_KEYWORDS_ID = new Set(['system', 'database', 'queue', 'connect', 'group', 'end', 'text']);
const VALID_FLOW_STYLES = new Set(['solid', 'dashed', 'thick']);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const VALID_STATES: readonly IDState[] = ['new', 'changing', 'decommissioned'];

function defaultPlacement(kind: IDElement['kind']): PlacementPos {
  return kind === 'system' ? 'inside' : 'below';
}

function parseFlowTypeBlockLine(line: string, lineNum: number, errors: ParseError[]): FlowType | null {
  const parts = line.split(/\s+/);
  if (parts.length !== 2) {
    errors.push({ line: lineNum, message: 'flow-type requires: <name> <style>' });
    return null;
  }
  const [name, style] = parts;
  const normalizedStyle = style.toLowerCase();
  if (!VALID_FLOW_STYLES.has(normalizedStyle)) {
    errors.push({ line: lineNum, message: `Unknown flow style: "${style}". Valid: solid, dashed, thick` });
    return null;
  }
  return { name, style: normalizedStyle };
}

export function parseID(lines: string[], options?: ParseOptions): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'id' };
  const elements:    IDElement[]    = [];
  const connections: IDConnection[] = [];
  const groups:      IDGroup[]      = [];
  const textBlocks:  TextBlock[]    = [];
  const savedPositions: Record<string, Position> = {};
  const locationTypes: LocationType[] = [];
  const flowTypes: FlowType[] = [];
  let currentGroup: IDGroup | null = null;
  let inLocationTypesBlock = false;
  let inFlowTypesBlock = false;

  const included = resolveIncludes(lines, 'id', parseID, options, errors);
  locationTypes.push(...included.locationTypes);
  flowTypes.push(...included.flowTypes);
  const includedLocationNames = new Set(included.locationTypes.map(x => x.name.toLowerCase()));
  const includedFlowTypeNames = new Set(included.flowTypes.map(x => x.name.toLowerCase()));

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
        if (includedLocationNames.has(name.toLowerCase())) {
          errors.push({ line: lineNum, message: `location-type "${name}" is already contributed by an @include` });
          continue;
        }
        if (locationTypes.find(x => x.name.toLowerCase() === name.toLowerCase())) {
          errors.push({ line: lineNum, message: `Duplicate location-type: "${name}"` });
          continue;
        }
        locationTypes.push({ name, colour: colour.toLowerCase() });
        continue;
      } else {
        // Non-indented non-empty line ends block, fall through to process normally
        inLocationTypesBlock = false;
      }
    }

    if (inFlowTypesBlock) {
      if (line === '') {
        inFlowTypesBlock = false;
        continue;
      }
      if (rawLine.startsWith('  ') || rawLine.startsWith('\t')) {
        const entry = parseFlowTypeBlockLine(line, lineNum, errors);
        if (entry) {
          const lower = entry.name.toLowerCase();
          if (includedFlowTypeNames.has(lower)) {
            errors.push({ line: lineNum, message: `flow-type "${entry.name}" is already contributed by an @include` });
          } else if (flowTypes.find(x => x.name.toLowerCase() === lower)) {
            errors.push({ line: lineNum, message: `Duplicate flow-type: "${entry.name}"` });
          } else {
            flowTypes.push(entry);
          }
        }
        continue;
      } else {
        inFlowTypesBlock = false;
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
        case '@include': {
          if (options?.includeMode) {
            errors.push({ line: lineNum, message: '@include is not allowed inside an included file (one level only)' });
          }
          break;
        }
        case '@name':    meta.name    = value; break;
        case '@version': meta.version = value; break;
        case '@date':    meta.date    = value; break;
        case '@author':  meta.author  = value; break;

        case '@location-types': {
          inLocationTypesBlock = true;
          break;
        }

        case '@flow-types': {
          inFlowTypesBlock = true;
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
          if (options?.includeMode) {
            errors.push({ line: lineNum, message: '@position is not allowed in an included file' });
            break;
          }
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

    if (options?.includeMode && POSITIONAL_KEYWORDS_ID.has(keyword)) {
      errors.push({ line: lineNum, message: `"${keyword}" is not allowed in an included file - included files contribute only definitions and defaults` });
      continue;
    }

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

        const to = afterArrow.slice(0, colonIdx).trim();
        const afterColon = afterArrow.slice(colonIdx + 1).trim();
        const bracketIdx = afterColon.indexOf('[');
        const protocol = (bracketIdx === -1 ? afterColon : afterColon.slice(0, bracketIdx)).trim();

        if (!from)     { errors.push({ line: lineNum, message: `connect: missing source id` });   break; }
        if (!to)       { errors.push({ line: lineNum, message: `connect: missing target id` });   break; }
        if (!protocol) { errors.push({ line: lineNum, message: `connect: missing protocol label` }); break; }

        let flowType: string | undefined;
        let flowTypeExplicit = false;
        const brackets = [...afterColon.matchAll(/\[([^\]]+)\]/g)].map(match => match[1].trim());
        for (const qualifier of brackets) {
          if (qualifier.startsWith('flow:')) {
            flowType = qualifier.slice(5).trim();
            flowTypeExplicit = true;
            if (!flowType) {
              errors.push({ line: lineNum, message: 'connect flow qualifier requires a type: [flow:<type>]' });
            }
          } else {
            errors.push({ line: lineNum, message: `Unknown connect qualifier: [${qualifier}]. Valid: [flow:<type>]` });
          }
        }

        connections.push({ kind: 'connection', id: nextId('conn'), from, to, direction, protocol, flowType, flowTypeExplicit });
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

      // text [<id>]
      // "<content>"
      case 'text': {
        const tbId = rest.trim() || nextId('text');
        let j = i + 1;
        while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
        if (j >= lines.length || !lines[j].trim().startsWith('"')) {
          errors.push({ line: lineNum, message: 'text block: expected quoted content on the following line(s), starting with "' });
          break;
        }
        const firstContentLine = lines[j].trim().slice(1);
        if (firstContentLine.endsWith('"')) {
          textBlocks.push({ kind: 'textblock', id: tbId, content: firstContentLine.slice(0, -1), x: 0, y: 0 });
          i = j;
        } else {
          const contentLines = [firstContentLine];
          j++;
          let closed = false;
          while (j < lines.length) {
            const cl = lines[j].trim();
            if (cl.endsWith('"')) {
              contentLines.push(cl.slice(0, -1).trimEnd());
              textBlocks.push({ kind: 'textblock', id: tbId, content: contentLines.join('\n'), x: 0, y: 0 });
              i = j;
              closed = true;
              break;
            }
            contentLines.push(cl);
            j++;
          }
          if (!closed) {
            errors.push({ line: lineNum, message: 'text block: unclosed quote — missing closing "' });
          }
        }
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

  const flowTypeNames = new Set(flowTypes.map(entry => entry.name));
  const defaultFlowTypes = new Set(['sync', 'async', 'batch']);
  for (const conn of connections) {
    if (!conn.flowType || !conn.flowTypeExplicit) continue;
    if (!flowTypeNames.has(conn.flowType) && !defaultFlowTypes.has(conn.flowType)) {
      errors.push({ line: 0, message: `connect "${conn.id}" references unknown flow type "${conn.flowType}"` });
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
  if (flowTypes.length > 0) {
    meta.flowTypes = flowTypes;
  }
  applyMetaDefaults(meta, included.metaDefaults);

  const model: IDModel = { meta, elements, connections, groups, textBlocks, savedPositions };
  return { model, errors };
}
