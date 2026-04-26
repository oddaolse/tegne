import type { ModelMeta, Position, TextBlock } from '../types';

export type { Position } from '../types';  // re-export for convenience within sd/

export type Polarity     = '+' | '-';
export type CloudRole    = 'source' | 'sink';
export type FlowStrength = 'weak' | 'medium' | 'strong';
export type SDLabelCorner = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

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

export interface SDGroup {
  kind:        'group';
  id:          string;
  label:       string;
  members:     string[];       // stock and aux IDs
  labelCorner: SDLabelCorner;
}

export type Node = Stock | Cloud | Auxiliary;

export type { TextBlock } from '../types';   // re-export for sd/ consumers

export interface SDModel {
  meta:           ModelMeta;
  stocks:         Stock[];
  clouds:         Cloud[];
  auxiliaries:    Auxiliary[];
  flows:          Flow[];
  connectors:     Connector[];
  groups:         SDGroup[];
  textBlocks:     TextBlock[];
  savedPositions: Record<string, Position>;
}
