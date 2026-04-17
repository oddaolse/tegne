import type { SDModel } from '../types';

const CENTER_Y         = 450;
const MARGIN_X         = 100;
const CLOUD_OFFSET_X   = 160;
const AUX_OFFSET_Y     = -130;
const AUX_OFFSET_X     = 90;
const GROUP_STOCK_GAP  = 40;

function stockSpacing(label: string): number {
  return Math.max(220, label.length * 9 + 40);
}

export function layout(model: SDModel): void {
  const hasSaved = Object.keys(model.savedPositions).length > 0;

  // Apply saved positions where available
  const allNodes = [...model.stocks, ...model.clouds, ...model.auxiliaries];
  if (hasSaved) {
    for (const node of allNodes) {
      const pos = model.savedPositions[node.id];
      if (pos) { node.x = pos.x; node.y = pos.y; }
    }
    // Any node not in savedPositions still needs a position — fall through to auto below
    const missing = allNodes.filter(n => !model.savedPositions[n.id]);
    if (missing.length === 0) return;
  }

  // Build set of grouped element IDs
  const groupedIds = new Set<string>();
  for (const group of model.groups) {
    for (const id of group.members) {
      groupedIds.add(id);
    }
  }

  // ── Auto-layout stocks ────────────────────────────────────────────
  let x = MARGIN_X;

  // First: layout grouped stocks (contiguous per group)
  for (const group of model.groups) {
    const groupStocks = group.members
      .map(id => model.stocks.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);

    if (groupStocks.length > 0) {
      for (const stock of groupStocks) {
        if (hasSaved && model.savedPositions[stock.id]) continue;
        stock.x = x + stockSpacing(stock.label) / 2;
        stock.y = CENTER_Y;
        x += stockSpacing(stock.label);
      }
      x += GROUP_STOCK_GAP;  // gap between groups
    }
  }

  // Then: layout ungrouped stocks
  for (const stock of model.stocks) {
    if (groupedIds.has(stock.id)) continue;  // already placed
    if (hasSaved && model.savedPositions[stock.id]) continue;
    stock.x = x + stockSpacing(stock.label) / 2;
    stock.y = CENTER_Y;
    x += stockSpacing(stock.label);
  }

  // ── Auto-layout clouds ────────────────────────────────────────────
  for (const cloud of model.clouds) {
    if (hasSaved && model.savedPositions[cloud.id]) continue;
    // Find a flow that connects to/from this cloud
    const flow = model.flows.find(f => f.from === cloud.id || f.to === cloud.id);
    if (flow) {
      const stockId  = flow.from === cloud.id ? flow.to : flow.from;
      const stock    = model.stocks.find(s => s.id === stockId);
      if (stock) {
        cloud.y = stock.y;
        cloud.x = cloud.role === 'source'
          ? stock.x - CLOUD_OFFSET_X
          : stock.x + CLOUD_OFFSET_X;
      } else {
        cloud.x = MARGIN_X / 2;
        cloud.y = CENTER_Y;
      }
    } else {
      cloud.x = MARGIN_X / 2;
      cloud.y = CENTER_Y;
    }
  }

  // ── Auto-layout auxiliaries ───────────────────────────────────────
  // For grouped auxiliaries: position above the group's stock region
  for (const group of model.groups) {
    const groupStocks = group.members
      .map(id => model.stocks.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);

    const groupAux = group.members
      .map(id => model.auxiliaries.find(a => a.id === id))
      .filter((a): a is NonNullable<typeof a> => !!a);

    if (groupAux.length === 0) continue;

    // Find the center X of the group's stocks (or use MARGIN_X if no stocks)
    let centerX = MARGIN_X;
    if (groupStocks.length > 0) {
      const minX = Math.min(...groupStocks.map(s => s.x));
      const maxX = Math.max(...groupStocks.map(s => s.x));
      centerX = (minX + maxX) / 2;
    }

    // Spread auxiliaries horizontally above the group
    const count = groupAux.length;
    groupAux.forEach((aux, idx) => {
      if (hasSaved && model.savedPositions[aux.id]) return;
      aux.y = CENTER_Y + AUX_OFFSET_Y;
      aux.x = count === 1
        ? centerX
        : centerX + (idx - (count - 1) / 2) * AUX_OFFSET_X;
    });
  }

  // Map each ungrouped aux to the stock it most directly influences
  const auxToStock = new Map<string, string>();

  for (const aux of model.auxiliaries) {
    if (groupedIds.has(aux.id)) continue;  // already handled
    if (hasSaved && model.savedPositions[aux.id]) continue;

    // Prefer a connector going from this aux to a stock
    const outConn = model.connectors.find(c => c.from === aux.id);
    if (outConn) {
      const target = outConn.to;
      if (model.stocks.find(s => s.id === target)) {
        auxToStock.set(aux.id, target);
        continue;
      }
      // Target might be a flow label — find the to-stock of that flow
      const targetFlow = model.flows.find(f => f.label === target);
      if (targetFlow && model.stocks.find(s => s.id === targetFlow.to)) {
        auxToStock.set(aux.id, targetFlow.to);
        continue;
      }
    }

    // Fall back: connector going into this aux from a stock
    const inConn = model.connectors.find(c => c.to === aux.id);
    if (inConn && model.stocks.find(s => s.id === inConn.from)) {
      auxToStock.set(aux.id, inConn.from);
      continue;
    }

    // Last resort: first stock
    if (model.stocks.length > 0) {
      auxToStock.set(aux.id, model.stocks[0].id);
    }
  }

  // Count auxiliaries per stock for horizontal spreading
  const stockAuxList = new Map<string, string[]>();
  for (const [auxId, stockId] of auxToStock) {
    const list = stockAuxList.get(stockId) ?? [];
    list.push(auxId);
    stockAuxList.set(stockId, list);
  }

  for (const [stockId, auxIds] of stockAuxList) {
    const stock = model.stocks.find(s => s.id === stockId);
    if (!stock) continue;
    const count = auxIds.length;
    auxIds.forEach((auxId, idx) => {
      const aux = model.auxiliaries.find(a => a.id === auxId);
      if (!aux) return;
      if (hasSaved && model.savedPositions[auxId]) return;
      aux.y = stock.y + AUX_OFFSET_Y;
      aux.x = count === 1
        ? stock.x
        : stock.x + (idx - (count - 1) / 2) * AUX_OFFSET_X;
    });
  }

  // Auxiliaries with no stock mapping
  for (const aux of model.auxiliaries) {
    if (groupedIds.has(aux.id)) continue;  // already handled
    if (hasSaved && model.savedPositions[aux.id]) continue;
    if (!auxToStock.has(aux.id)) {
      aux.x = MARGIN_X;
      aux.y = CENTER_Y + AUX_OFFSET_Y;
    }
  }
}
