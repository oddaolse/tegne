import type {
  SDModel, ParseResult, ParseError,
  Polarity, CloudRole, FlowStrength,
  Position, Stock, Cloud, Auxiliary, Flow, Connector, ModelMeta,
} from './types';
import { THEMES } from './themes';
import { parseID } from './id-parser';

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

export function parse(dsl: string): ParseResult {
  const lines = dsl.split('\n');

  // Pre-scan for @type — dispatch to the appropriate parser
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@type')) {
      const value = trimmed.slice('@type'.length).trim();
      if (value === 'id') return parseID(lines);
      if (value === 'sd') break;  // fall through to SD parser
      // Unknown type — let the SD parser emit the error
      break;
    }
  }

  return parseSD(lines);
}

function parseSD(lines: string[]): ParseResult {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
  const errors: ParseError[] = [];

  const meta: ModelMeta = { date: todayISO() };
  const stocks:      Stock[]      = [];
  const clouds:      Cloud[]      = [];
  const auxiliaries: Auxiliary[]  = [];
  const flows:       Flow[]       = [];
  const connectors:  Connector[]  = [];
  const savedPositions: Record<string, Position> = {};

  const flowLabels = new Set<string>();
  const auxNames   = new Set<string>();

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

      // stock <name>
      case 'stock': {
        if (!rest) { errors.push({ line: lineNum, message: 'stock requires a name' }); break; }
        const name = rest.split(/\s+/)[0];
        stocks.push({ kind: 'stock', id: name, label: name, x: 0, y: 0 });
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

      default:
        errors.push({ line: lineNum, message: `Unknown keyword: "${keyword}"` });
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────

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

  const model: SDModel = {
    meta, stocks, clouds, auxiliaries, flows, connectors, savedPositions,
  };

  return { model, errors };
}
