import type {
  Polarity, CloudRole, FlowStrength, SDLabelCorner,
  Stock, Cloud, Auxiliary, Flow, Connector, SDGroup, SDModel,
} from './types';
import type { ModelMeta, Position, TextBlock, ParseResult, ParseError, ParseOptions } from '../types';
import { applyMetaDefaults, resolveIncludes } from '../include';
import { THEMES } from '../themes';

const POSITIONAL_KEYWORDS_SD = new Set(['stock', 'cloud', 'flow', 'aux', 'connector', 'group', 'end', 'text']);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseSourceList(
  sourcePart: string,
  lineNum: number,
  errors: ParseError[],
): Array<{ from: string; polarity: Polarity }> {
  const results: Array<{ from: string; polarity: Polarity }> = [];
  // Split on commas that are followed by a space and a word (not inside parens)
  const items = sourcePart.split(/,(?=\s*\S+\s*\([+-]\))/).map(s => s.trim());

  for (const item of items) {
    const parenOpen  = item.lastIndexOf('(');
    const parenClose = item.lastIndexOf(')');
    if (parenOpen === -1 || parenClose === -1 || parenClose < parenOpen) {
      errors.push({ line: lineNum, message: `expected polarity in parentheses, got: "${item}"` });
      continue;
    }
    const from       = item.slice(0, parenOpen).trim();
    const polarityStr = item.slice(parenOpen + 1, parenClose).trim();
    if (polarityStr !== '+' && polarityStr !== '-') {
      errors.push({ line: lineNum, message: `polarity must be (+) or (-), got: (${polarityStr})` });
      continue;
    }
    if (!from) {
      errors.push({ line: lineNum, message: `source name missing before polarity` });
      continue;
    }
    results.push({ from, polarity: polarityStr as Polarity });
  }
  return results;
}

export function parseSD(lines: string[], options?: ParseOptions): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
  const errors: ParseError[] = [];

  const meta: ModelMeta = { date: todayISO() };
  const stocks:      Stock[]      = [];
  const clouds:      Cloud[]      = [];
  const auxiliaries: Auxiliary[]  = [];
  const flows:       Flow[]       = [];
  const connectors:  Connector[]  = [];
  const groups:      SDGroup[]    = [];
  const textBlocks:  TextBlock[]  = [];
  const savedPositions: Record<string, Position> = {};

  const flowLabels = new Set<string>();
  const auxNames   = new Set<string>();
  const stockNames = new Set<string>();
  let currentGroup: SDGroup | null = null;

  const included = resolveIncludes(lines, 'sd', parseSD, options, errors);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line    = lines[i].trim();

    if (line === '' || line.startsWith('#')) continue;

    // ── @ directives ────────────────────────────────────────────────
    if (line.startsWith('@')) {
      const spaceIdx = line.indexOf(' ');
      const keyword  = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
      const value    = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1).trim();

      switch (keyword) {
        case '@include': {
          if (options?.includeMode) {
            errors.push({ line: lineNum, message: '@include is not allowed inside an included file (one level only)' });
          }
          break;
        }
        case '@name':       meta.name       = value; break;
        case '@version':    meta.version    = value; break;
        case '@date':       meta.date       = value; break;
        case '@author':     meta.author     = value; break;
        case '@theme': {
          if (!THEMES[value]) {
            errors.push({ line: lineNum, message: `Unknown theme: "${value}". Available: ${Object.keys(THEMES).join(', ')}` });
          } else {
            meta.theme = value;
          }
          break;
        }
        case '@type': {
          if (value !== 'sd' && value !== 'id') {
            errors.push({ line: lineNum, message: `@type must be "sd" or "id", got: "${value}"` });
          }
          // Value already consumed by pre-scan dispatch; no further action needed
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

    // ── Element keywords ─────────────────────────────────────────────
    const firstSpace = line.indexOf(' ');
    const keyword    = firstSpace === -1 ? line : line.slice(0, firstSpace);
    const rest       = firstSpace === -1 ? '' : line.slice(firstSpace + 1).trim();

    if (options?.includeMode && POSITIONAL_KEYWORDS_SD.has(keyword)) {
      errors.push({ line: lineNum, message: `"${keyword}" is not allowed in an included file - included files contribute only definitions and defaults` });
      continue;
    }

    switch (keyword) {

      // stock <name>
      case 'stock': {
        if (!rest) { errors.push({ line: lineNum, message: 'stock requires a name' }); break; }
        const name = rest.split(/\s+/)[0];
        stockNames.add(name);
        stocks.push({ kind: 'stock', id: name, label: name, x: 0, y: 0 });
        if (currentGroup) currentGroup.members.push(name);
        break;
      }

      // cloud <name> [source|sink]
      case 'cloud': {
        const parts = rest.split(/\s+/);
        if (!parts[0]) { errors.push({ line: lineNum, message: 'cloud requires a name' }); break; }
        const name    = parts[0];
        const roleStr = parts[1] ? parts[1].replace(/[\[\]]/g, '').toLowerCase() : 'source';
        if (roleStr !== 'source' && roleStr !== 'sink') {
          errors.push({ line: lineNum, message: `cloud role must be [source] or [sink], got: "${parts[1]}"` });
          break;
        }
        clouds.push({ kind: 'cloud', id: name, label: name, role: roleStr as CloudRole, x: 0, y: 0 });
        break;
      }

      // flow <from> -> <to> : <label> (<polarity>) [weak|medium|strong]
      case 'flow': {
        const arrowIdx = rest.indexOf('->');
        if (arrowIdx === -1) {
          errors.push({ line: lineNum, message: 'flow requires "->" between from and to' }); break;
        }
        const from       = rest.slice(0, arrowIdx).trim();
        const afterArrow = rest.slice(arrowIdx + 2).trim();
        const colonIdx   = afterArrow.indexOf(':');
        if (colonIdx === -1) {
          errors.push({ line: lineNum, message: 'flow requires ":" before label' }); break;
        }
        const to         = afterArrow.slice(0, colonIdx).trim();
        const afterColon = afterArrow.slice(colonIdx + 1).trim();

        const parenOpen  = afterColon.lastIndexOf('(');
        const parenClose = afterColon.lastIndexOf(')');
        if (parenOpen === -1 || parenClose === -1) {
          errors.push({ line: lineNum, message: 'flow requires polarity in parentheses, e.g. (+) or (-)' }); break;
        }
        const label       = afterColon.slice(0, parenOpen).trim();
        const polarityStr = afterColon.slice(parenOpen + 1, parenClose).trim();
        const afterParen  = afterColon.slice(parenClose + 1).trim();

        if (!label) {
          errors.push({ line: lineNum, message: 'flow label cannot be empty' }); break;
        }
        if (polarityStr !== '+' && polarityStr !== '-') {
          errors.push({ line: lineNum, message: `flow polarity must be (+) or (-), got: (${polarityStr})` }); break;
        }

        let strength: FlowStrength = 'medium';
        if (afterParen !== '') {
          if (afterParen === 'weak' || afterParen === 'medium' || afterParen === 'strong') {
            strength = afterParen;
          } else {
            errors.push({ line: lineNum, message: `flow strength must be weak, medium, or strong, got: "${afterParen}"` });
            break;
          }
        }

        flowLabels.add(label);
        flows.push({
          kind: 'flow',
          id:   nextId('flow'),
          from, to, label,
          polarity: polarityStr as Polarity,
          strength,
        });
        break;
      }

      // aux <name> [<- <from1> (<pol>)[, <from2> (<pol>)] ...]
      case 'aux': {
        const arrowIdx = rest.indexOf('<-');
        let auxName: string;
        let sourcePart: string | null = null;

        if (arrowIdx === -1) {
          auxName = rest.trim();
        } else {
          auxName    = rest.slice(0, arrowIdx).trim();
          sourcePart = rest.slice(arrowIdx + 2).trim();
        }

        if (!auxName) { errors.push({ line: lineNum, message: 'aux requires a name' }); break; }

        auxNames.add(auxName);
        auxiliaries.push({ kind: 'aux', id: auxName, label: auxName, x: 0, y: 0 });
        if (currentGroup) currentGroup.members.push(auxName);

        if (sourcePart) {
          const parsed = parseSourceList(sourcePart, lineNum, errors);
          for (const { from, polarity } of parsed) {
            connectors.push({ kind: 'connector', id: nextId('conn'), from, to: auxName, polarity });
          }
        }
        break;
      }

      // connector <to> <- <from1> (<pol>)[, <from2> (<pol>)]
      case 'connector': {
        const arrowIdx = rest.indexOf('<-');
        if (arrowIdx === -1) {
          errors.push({ line: lineNum, message: 'connector requires "<-" between to and from' }); break;
        }
        const to         = rest.slice(0, arrowIdx).trim();
        const sourcePart = rest.slice(arrowIdx + 2).trim();

        if (!to) { errors.push({ line: lineNum, message: 'connector requires a target name' }); break; }

        const parsed = parseSourceList(sourcePart, lineNum, errors);
        for (const { from, polarity } of parsed) {
          connectors.push({ kind: 'connector', id: nextId('conn'), from, to, polarity });
        }
        break;
      }

      // group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]
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

        let labelCorner: SDLabelCorner = 'upper-right';
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
      // "<content line 1>
      // content line 2"
      case 'text': {
        const tbId = rest.trim() || nextId('text');
        // Scan forward for the quoted content block
        let j = i + 1;
        while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
        if (j >= lines.length || !lines[j].trim().startsWith('"')) {
          errors.push({ line: lineNum, message: 'text block: expected quoted content on the following line(s), starting with "' });
          break;
        }
        const firstContentLine = lines[j].trim().slice(1);  // strip leading "
        if (firstContentLine.endsWith('"')) {
          // Single line: "content"
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

  // Unclosed group
  if (currentGroup) {
    errors.push({ line: 0, message: `Group "${currentGroup.id}" was never closed with "end"` });
  }

  // Element in multiple groups
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

  // Name collision: aux name == flow label
  for (const auxName of auxNames) {
    if (flowLabels.has(auxName)) {
      errors.push({ line: 0, message: `aux "${auxName}" — name already used as a flow label` });
    }
  }

  // Build the full namespace for connector endpoint resolution
  const allIds = new Set<string>([
    ...stocks.map(s => s.id),
    ...clouds.map(c => c.id),
    ...auxiliaries.map(a => a.id),
    ...flows.map(f => f.label),
  ]);

  for (const conn of connectors) {
    if (!allIds.has(conn.from)) {
      errors.push({ line: 0, message: `connector references unknown id: "${conn.from}"` });
    }
    if (!allIds.has(conn.to)) {
      errors.push({ line: 0, message: `connector references unknown id: "${conn.to}"` });
    }
  }

  // Flow endpoints must be stocks or clouds
  const flowNodeIds = new Set<string>([
    ...stocks.map(s => s.id),
    ...clouds.map(c => c.id),
  ]);
  for (const flow of flows) {
    if (!flowNodeIds.has(flow.from)) {
      errors.push({ line: 0, message: `flow "${flow.label}": unknown from node "${flow.from}"` });
    }
    if (!flowNodeIds.has(flow.to)) {
      errors.push({ line: 0, message: `flow "${flow.label}": unknown to node "${flow.to}"` });
    }
  }

  applyMetaDefaults(meta, included.metaDefaults);

  const model: SDModel = {
    meta, stocks, clouds, auxiliaries, flows, connectors, groups, textBlocks, savedPositions,
  };

  return { model, errors };
}
