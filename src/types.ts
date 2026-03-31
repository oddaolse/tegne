export type Polarity     = '+' | '-';
export type CloudRole    = 'source' | 'sink';
export type FlowStrength = 'weak' | 'medium' | 'strong';

export interface ModelMeta {
  name?:       string;
  version?:    string;
  date:        string;   // ISO date; auto-filled if @date absent
  author?:     string;
  theme?:       string;                // theme name (dark | light | tokyo); default: dark
  orientation?: 'landscape'|'portrait'; // A4 page guide orientation; default: landscape
}

export interface Position { x: number; y: number; }

export interface Stock     extends Position { kind: 'stock'; id: string; label: string; }
export interface Cloud     extends Position { kind: 'cloud'; id: string; label: string; role: CloudRole; }
export interface Auxiliary extends Position { kind: 'aux';   id: string; label: string; }

export interface Flow {
  kind:     'flow';
  id:       string;
  from:     string;      // node id (stock or cloud)
  to:       string;      // node id (stock or cloud)
  label:    string;
  polarity: Polarity;
  strength: FlowStrength;
}

export interface Connector {
  kind:     'connector';
  id:       string;
  from:     string;      // stock | cloud | aux id, or flow label
  to:       string;      // stock | cloud | aux id, or flow label
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

export interface ParseError {
  line:    number;   // 0 = post-parse validation (no specific line)
  message: string;
}

export interface ParseResult {
  model:  SDModel | null;
  errors: ParseError[];
}
