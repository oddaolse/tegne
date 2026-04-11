import type { ModelMeta, Position } from '../types';

export type { Position } from '../types';  // re-export for convenience within sd/

export type Polarity     = '+' | '-';
export type CloudRole    = 'source' | 'sink';
export type FlowStrength = 'weak' | 'medium' | 'strong';

export interface Stock     extends Position { kind: 'stock'; id: string; label: string; }
export interface Cloud     extends Position { kind: 'cloud'; id: string; label: string; role: CloudRole; }
export interface Auxiliary extends Position { kind: 'aux';   id: string; label: string; }

export interface Flow {
  kind:     'flow';
  id:       string;
  from:     string;
  to:       string;
  label:    string;
  polarity: Polarity;
  strength: FlowStrength;
}

export interface Connector {
  kind:     'connector';
  id:       string;
  from:     string;
  to:       string;
  polarity: Polarity;
}

export type Node = Stock | Cloud | Auxiliary;

export interface SDModel {
  meta:           ModelMeta;
  stocks:         Stock[];
  clouds:         Cloud[];
  auxiliaries:    Auxiliary[];
  flows:          Flow[];
  connectors:     Connector[];
  savedPositions: Record<string, Position>;
}
