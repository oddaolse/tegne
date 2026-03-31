export type Polarity     = '+' | '-';
export type CloudRole    = 'source' | 'sink';
export type FlowStrength = 'weak' | 'medium' | 'strong';
export type DiagramType  = 'sd' | 'id';

export interface ModelMeta {
  diagramType?: DiagramType;            // 'sd' | 'id'; defaults to 'sd'
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
  model:  SDModel | IDModel | null;
  errors: ParseError[];
}

// ── Integration Diagram types ─────────────────────────────────────────────────

export type Platform  = 'aws' | 'azure' | 'on-prem' | 'gcp' | 'oracle';
export type IDState   = 'current' | 'new' | 'changing' | 'decommissioned';
export type Direction = 'unidirectional' | 'bidirectional';
export type LabelPos  = 'inside' | 'below';

export interface IDElement extends Position {
  kind:     'system' | 'database' | 'queue';
  id:       string;
  label:    string;
  platform: Platform;
  state:    IDState;
  labelPos: LabelPos;
}

export interface IDConnection {
  kind:      'connection';
  id:        string;
  from:      string;
  to:        string;
  direction: Direction;
  protocol:  string;
}

export interface IDModel {
  meta:           ModelMeta;   // meta.diagramType === 'id'
  elements:       IDElement[];
  connections:    IDConnection[];
  savedPositions: Record<string, Position>;
}
