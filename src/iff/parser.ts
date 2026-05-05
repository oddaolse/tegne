import type {
  IFFModel, IFFStore, IFFProcess, IFFNode, IFFLink, IFFGroup,
  IFFRelationship, IFFState, IFFLabelCorner,
} from './types';
import type {
  FlowType, LocationType, ModelMeta, ParseError, ParseOptions, ParseResult, Position, SystemType, TextBlock,
} from '../types';
import { applyMetaDefaults, resolveIncludes } from '../include';
import { THEMES, VALID_PALETTE_COLOURS } from '../themes';

const POSITIONAL_KEYWORDS_IFF = new Set(['store', 'process', 'connect', 'link', 'group', 'end', 'text']);

const VALID_RELATIONSHIPS: readonly IFFRelationship[] = [
  'replicate', 'publish', 'ingest', 'derive', 'aggregate', 'enrich', 'serve',
];
const REMOVED_RELATIONSHIP_GUIDANCE: Record<string, string> = {
  query: 'use "serve" when a source provides information to a consumer',
  subscribe: 'model the producer side as "publish"',
  merge: 'use "aggregate", "derive", or "enrich" depending on the business meaning',
};

const VALID_STATES: readonly string[] = ['new', 'changing', 'decommissioned', 'unchanged'];

function normalizeState(value: string): IFFState {
  return value === 'unchanged' ? 'current' : value as IFFState;
}
const VALID_GROUP_CORNERS: readonly IFFLabelCorner[] = ['upper-left', 'upper-right', 'lower-left', 'lower-right'];

type BlockKind = 'location-types' | 'systems' | 'flow-types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseBracketQualifiers(rest: string): string[] {
  return [...rest.matchAll(/\[([^\]]+)\]/g)].map(match => match[1].trim());
}

function parseKeywordAndRest(line: string): { keyword: string; rest: string } {
  const firstSpace = line.indexOf(' ');
  return {
    keyword: firstSpace === -1 ? line : line.slice(0, firstSpace),
    rest: firstSpace === -1 ? '' : line.slice(firstSpace + 1).trim(),
  };
}

function parseColourBlockLine(
  line: string,
  lineNum: number,
  errors: ParseError[],
): { name: string; colour: string } | null {
  const parts = line.split(/\s+/);
  if (parts.length !== 2) {
    errors.push({ line: lineNum, message: 'Block entry requires: <name> <colour>' });
    return null;
  }

  const [name, colour] = parts;
  const normalizedColour = colour.toLowerCase();
  if (!(VALID_PALETTE_COLOURS as readonly string[]).includes(normalizedColour)) {
    errors.push({ line: lineNum, message: `Unknown palette colour: "${colour}". Valid: ${VALID_PALETTE_COLOURS.join(', ')}` });
    return null;
  }

  return { name, colour: normalizedColour };
}

function parseFlowTypeBlockLine(
  line: string,
  lineNum: number,
  errors: ParseError[],
): FlowType | null {
  const parts = line.split(/\s+/);
  if (parts.length !== 2) {
    errors.push({ line: lineNum, message: 'flow-type requires: <name> <style>' });
    return null;
  }

  const [name, style] = parts;
  return { name, style };
}

function parseGroupHeader(
  rest: string,
  lineNum: number,
  errors: ParseError[],
): { groupId: string; label: string; labelCorner: IFFLabelCorner; system?: string } | null {
  const bracketStart = rest.indexOf('[');
  const beforeBrackets = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
  if (!beforeBrackets) {
    errors.push({ line: lineNum, message: 'group requires an id' });
    return null;
  }

  const idMatch = beforeBrackets.match(/^(\S+)(?:\s+(.+))?$/);
  if (!idMatch) {
    errors.push({ line: lineNum, message: 'group requires an id' });
    return null;
  }

  const groupId = idMatch[1];
  let label = idMatch[2]?.trim() ?? groupId;
  if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith('\'') && label.endsWith('\''))) {
    label = label.slice(1, -1);
  }

  let labelCorner: IFFLabelCorner = 'upper-right';
  let system: string | undefined;
  for (const qualifier of parseBracketQualifiers(rest)) {
    const lower = qualifier.toLowerCase();
    if (lower.startsWith('corner:')) {
      const corner = lower.slice('corner:'.length) as IFFLabelCorner;
      if (!VALID_GROUP_CORNERS.includes(corner)) {
        errors.push({ line: lineNum, message: `Unknown group qualifier: [${qualifier}]. Valid: [corner:upper-left], [corner:upper-right], [corner:lower-left], [corner:lower-right], [system:<name>]` });
        continue;
      }
      labelCorner = corner;
      continue;
    }

    if (qualifier.startsWith('system:')) {
      system = qualifier.slice('system:'.length).trim();
      if (!system) {
        errors.push({ line: lineNum, message: 'group [system:<name>] requires a system name' });
      }
      continue;
    }

    errors.push({ line: lineNum, message: `Unknown group qualifier: [${qualifier}]. Valid: [corner:upper-left], [corner:upper-right], [corner:lower-left], [corner:lower-right], [system:<name>]` });
  }

  return { groupId, label, labelCorner, system };
}

function inferFlowType(relationship: IFFRelationship): string | undefined {
  switch (relationship) {
    case 'replicate':
    case 'publish':
    case 'ingest':
    case 'derive':
    case 'aggregate':
      return 'async';
    case 'enrich':
    case 'serve':
      return 'sync';
  }
}

function parseLinkEndpointPart(
  rest: string,
  lineNum: number,
  errors: ParseError[],
): { from: string; to: string; direction: IFFLink['direction']; afterArrow: string } | null {
  const matches = [...rest.matchAll(/<->|->|<-/g)].map(match => ({
    token: match[0],
    index: match.index ?? -1,
    direction: match[0] === '<->' ? 'bidirectional' as const : 'unidirectional' as const,
  }));

  if (matches.length === 0) {
    errors.push({ line: lineNum, message: 'connection requires one of "->", "<-", or "<->" between from and to' });
    return null;
  }
  if (matches.length > 1) {
    errors.push({ line: lineNum, message: 'connection must contain exactly one direction operator: "->", "<-", or "<->"' });
    return null;
  }

  const match = matches[0];
  const left = rest.slice(0, match.index).trim();
  const afterArrow = rest.slice(match.index + match.token.length).trim();
  const colonIdx = afterArrow.indexOf(':');
  const right = (colonIdx === -1 ? afterArrow : afterArrow.slice(0, colonIdx)).trim();

  if (match.token === '<-') {
    return { from: right, to: left, direction: match.direction, afterArrow };
  }
  return { from: left, to: right, direction: match.direction, afterArrow };
}

export function parseIFF(lines: string[], options?: ParseOptions): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const errors: ParseError[] = [];
  const meta: ModelMeta = { date: todayISO(), diagramType: 'infoflow' };
  const stores: IFFStore[] = [];
  const processes: IFFProcess[] = [];
  const links: IFFLink[] = [];
  const groups: IFFGroup[] = [];
  const textBlocks: TextBlock[] = [];
  const savedPositions: Record<string, Position> = {};
  const locationTypes: LocationType[] = [];
  const systemTypes: SystemType[] = [];
  const flowTypes: FlowType[] = [];
  let currentGroup: IFFGroup | null = null;
  let activeBlock: BlockKind | null = null;

  // Resolve @include directives first, then prepopulate dictionaries so the
  // rest of the file parses against the merged state.
  const included = resolveIncludes(lines, 'infoflow', parseIFF, options, errors);
  locationTypes.push(...included.locationTypes);
  systemTypes.push(...included.systemTypes);
  flowTypes.push(...included.flowTypes);
  const includedLocationNames = new Set(included.locationTypes.map(x => x.name.toLowerCase()));
  const includedSystemNames   = new Set(included.systemTypes.map(x => x.name.toLowerCase()));
  const includedFlowTypeNames = new Set(included.flowTypes.map(x => x.name.toLowerCase()));

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (activeBlock) {
      if (line === '') {
        activeBlock = null;
        continue;
      }

      if (rawLine.startsWith('  ') || rawLine.startsWith('\t')) {
        if (activeBlock === 'location-types') {
          const entry = parseColourBlockLine(line, lineNum, errors);
          if (entry) {
            const lower = entry.name.toLowerCase();
            if (includedLocationNames.has(lower)) {
              errors.push({ line: lineNum, message: `location-type "${entry.name}" is already contributed by an @include` });
            } else if (locationTypes.find(x => x.name.toLowerCase() === lower)) {
              errors.push({ line: lineNum, message: `Duplicate location-type: "${entry.name}"` });
            } else {
              locationTypes.push(entry);
            }
          }
        } else if (activeBlock === 'systems') {
          const entry = parseColourBlockLine(line, lineNum, errors);
          if (entry) {
            const lower = entry.name.toLowerCase();
            if (includedSystemNames.has(lower)) {
              errors.push({ line: lineNum, message: `system "${entry.name}" is already contributed by an @include` });
            } else if (systemTypes.find(x => x.name.toLowerCase() === lower)) {
              errors.push({ line: lineNum, message: `Duplicate system: "${entry.name}"` });
            } else {
              systemTypes.push(entry);
            }
          }
        } else {
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
        }
        continue;
      }

      activeBlock = null;
    }

    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('@')) {
      const { keyword, rest: value } = parseKeywordAndRest(line);
      switch (keyword) {
        case '@type':    break;
        case '@include': {
          if (options?.includeMode) {
            errors.push({ line: lineNum, message: '@include is not allowed inside an included file (one level only)' });
          }
          // Otherwise resolved by resolveIncludes pre-pass; nothing to do here.
          break;
        }
        case '@name':    meta.name = value; break;
        case '@version': meta.version = value; break;
        case '@date':    meta.date = value; break;
        case '@author':  meta.author = value; break;
        case '@location-types': activeBlock = 'location-types'; break;
        case '@systems': activeBlock = 'systems'; break;
        case '@flow-types': activeBlock = 'flow-types'; break;
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
          if (options?.includeMode) {
            errors.push({ line: lineNum, message: '@position is not allowed in an included file' });
            break;
          }
          const parts = value.split(/\s+/);
          if (parts.length !== 3) {
            errors.push({ line: lineNum, message: '@position requires exactly: @position <id> <x> <y>' });
            break;
          }
          const [nodeId, xStr, yStr] = parts;
          const x = Number(xStr);
          const y = Number(yStr);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            errors.push({ line: lineNum, message: '@position x and y must be numbers' });
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
        case '@info': {
          const v = value.toLowerCase();
          if (v !== 'on' && v !== 'off') {
            errors.push({ line: lineNum, message: `@info must be on or off, got: "${value}"` });
          } else {
            meta.info = v === 'on';
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
        default:
          errors.push({ line: lineNum, message: `Unknown directive: ${keyword}` });
      }
      continue;
    }

    const { keyword, rest } = parseKeywordAndRest(line);

    if (options?.includeMode && POSITIONAL_KEYWORDS_IFF.has(keyword)) {
      errors.push({ line: lineNum, message: `"${keyword}" is not allowed in an included file — included files contribute only definitions (palettes, dictionaries, defaults)` });
      continue;
    }

    switch (keyword) {
      case 'store': {
        const bracketStart = rest.indexOf('[');
        const id = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
        if (!id) {
          errors.push({ line: lineNum, message: 'store requires an id' });
          break;
        }

        const knownLocationTypes = new Set(locationTypes.map(entry => entry.name.toLowerCase()));
        let locationType: string | undefined;
        let state: IFFState = 'current';
        let label = id;

        for (const qualifier of parseBracketQualifiers(rest)) {
          const lower = qualifier.toLowerCase();
          if (knownLocationTypes.has(lower)) {
            locationType = locationTypes.find(entry => entry.name.toLowerCase() === lower)!.name;
          } else if (VALID_STATES.includes(lower)) {
            state = normalizeState(lower);
          } else if (qualifier.startsWith('label:')) {
            label = qualifier.slice(6).replace(/^["']|["']$/g, '').trim();
          } else {
            const validTypes = locationTypes.map(entry => entry.name).join(', ') || 'none defined — add @location-types block';
            errors.push({ line: lineNum, message: `Unknown qualifier: [${qualifier}]. Valid location-types: ${validTypes}` });
          }
        }

        if (!locationType) {
          const validTypes = locationTypes.map(entry => entry.name).join('], [') || 'none defined — add @location-types block';
          errors.push({ line: lineNum, message: `store "${id}" requires a location-type: [${validTypes}]` });
          break;
        }

        stores.push({ kind: 'store', id, label, locationType, state, x: 0, y: 0 });
        currentGroup?.members.push(id);
        break;
      }

      case 'process': {
        const bracketStart = rest.indexOf('[');
        const id = (bracketStart === -1 ? rest : rest.slice(0, bracketStart)).trim();
        if (!id) {
          errors.push({ line: lineNum, message: 'process requires an id' });
          break;
        }

        const knownSystems = new Set(systemTypes.map(entry => entry.name.toLowerCase()));
        let system = currentGroup?.system;
        let state: IFFState = 'current';
        let label = id;

        for (const qualifier of parseBracketQualifiers(rest)) {
          const lower = qualifier.toLowerCase();
          if (knownSystems.has(lower)) {
            system = systemTypes.find(entry => entry.name.toLowerCase() === lower)!.name;
          } else if (VALID_STATES.includes(lower)) {
            state = normalizeState(lower);
          } else if (qualifier.startsWith('label:')) {
            label = qualifier.slice(6).replace(/^["']|["']$/g, '').trim();
          } else {
            const validSystems = systemTypes.map(entry => entry.name).join(', ') || 'none defined — add @systems block';
            errors.push({ line: lineNum, message: `Unknown qualifier: [${qualifier}]. Valid systems: ${validSystems}` });
          }
        }

        if (!system) {
          const validSystems = systemTypes.map(entry => entry.name).join('], [') || 'none defined — add @systems block';
          errors.push({ line: lineNum, message: `process "${id}" requires a system: [${validSystems}] or a parent group [system:<name>]` });
          break;
        }

        processes.push({ kind: 'process', id, label, system, state, x: 0, y: 0 });
        currentGroup?.members.push(id);
        break;
      }

      case 'connect':
      case 'link': {
        const endpointPart = parseLinkEndpointPart(rest, lineNum, errors);
        if (!endpointPart) break;

        const { from, to, direction, afterArrow } = endpointPart;
        const colonIdx = afterArrow.indexOf(':');
        if (colonIdx === -1) {
          errors.push({ line: lineNum, message: 'connection requires ":" before relationship' });
          break;
        }

        const afterColon = afterArrow.slice(colonIdx + 1).trim();
        const bracketIdx = afterColon.indexOf('[');
        const relationship = (bracketIdx === -1 ? afterColon : afterColon.slice(0, bracketIdx)).trim().toLowerCase();

        if (!from) { errors.push({ line: lineNum, message: 'connection: missing source id' }); break; }
        if (!to) { errors.push({ line: lineNum, message: 'connection: missing target id' }); break; }
        if (!(VALID_RELATIONSHIPS as readonly string[]).includes(relationship)) {
          const guidance = REMOVED_RELATIONSHIP_GUIDANCE[relationship];
          errors.push({
            line: lineNum,
            message: guidance
              ? `Removed relationship: "${relationship}". ${guidance}. Valid: ${VALID_RELATIONSHIPS.join(', ')}`
              : `Unknown relationship: "${relationship}". Valid: ${VALID_RELATIONSHIPS.join(', ')}`,
          });
          break;
        }

        let flowType = inferFlowType(relationship as IFFRelationship);
        let flowTypeExplicit = false;
        for (const qualifier of parseBracketQualifiers(afterColon)) {
          if (qualifier.startsWith('flow:')) {
            flowType = qualifier.slice(5).trim();
            flowTypeExplicit = true;
          } else {
            // Backward-compatible legacy syntax: [kafka], [batch], etc.
            flowType = qualifier;
          }
        }

        links.push({
          kind: 'link',
          id: nextId('link'),
          from,
          to,
          direction,
          relationship: relationship as IFFRelationship,
          flowType,
          flowTypeExplicit,
        });
        break;
      }

      case 'group': {
        if (currentGroup) {
          errors.push({ line: lineNum, message: `Cannot nest groups — already inside group "${currentGroup.id}"` });
          break;
        }

        const parsed = parseGroupHeader(rest, lineNum, errors);
        if (!parsed) break;

        currentGroup = {
          kind: 'group',
          id: parsed.groupId,
          label: parsed.label,
          members: [],
          labelCorner: parsed.labelCorner,
          system: parsed.system,
        };
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

  if (currentGroup) {
    errors.push({ line: 0, message: `Group "${currentGroup.id}" was never closed with "end"` });
  }

  const nodes: IFFNode[] = [...stores, ...processes];
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({ line: 0, message: `Duplicate node id "${node.id}"` });
      continue;
    }
    nodeIds.add(node.id);
  }

  const knownSystems = new Set(systemTypes.map(entry => entry.name));
  for (const group of groups) {
    if (group.system && !knownSystems.has(group.system)) {
      errors.push({ line: 0, message: `group "${group.id}" references unknown system "${group.system}"` });
    }
  }

  for (const link of links) {
    if (!nodeIds.has(link.from)) {
      errors.push({ line: 0, message: `connection: unknown id "${link.from}"` });
    }
    if (!nodeIds.has(link.to)) {
      errors.push({ line: 0, message: `connection: unknown id "${link.to}"` });
    }
  }

  const flowTypeNames = new Set(flowTypes.map(entry => entry.name));
  const defaultFlowTypes = new Set(['sync', 'async', 'batch']);
  for (const link of links) {
    if (!link.flowType || !link.flowTypeExplicit) continue;
    if (!flowTypeNames.has(link.flowType) && !defaultFlowTypes.has(link.flowType)) {
      errors.push({ line: 0, message: `connection "${link.id}" references unknown flow type "${link.flowType}"` });
    }
  }

  const memberGroupMap = new Map<string, string>();
  for (const group of groups) {
    for (const memberId of group.members) {
      if (memberGroupMap.has(memberId)) {
        errors.push({ line: 0, message: `Node "${memberId}" appears in both group "${memberGroupMap.get(memberId)}" and group "${group.id}"` });
      } else {
        memberGroupMap.set(memberId, group.id);
      }
    }
  }

  if (locationTypes.length > 0) meta.locationTypes = locationTypes;
  if (systemTypes.length > 0) meta.systemTypes = systemTypes;
  if (flowTypes.length > 0) meta.flowTypes = flowTypes;
  applyMetaDefaults(meta, included.metaDefaults);

  const model: IFFModel = {
    meta,
    stores,
    processes,
    nodes,
    links,
    groups,
    textBlocks,
    savedPositions,
    systemTypes: systemTypes.length > 0 ? systemTypes : undefined,
    flowTypes: flowTypes.length > 0 ? flowTypes : undefined,
  };
  return { model, errors };
}
