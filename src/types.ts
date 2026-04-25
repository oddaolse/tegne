// ── Shared types ──────────────────────────────────────────────────────────────

export type DiagramType = 'sd' | 'id' | 'infoflow' | 'tm';

export interface LocationType {
  name:   string;   // e.g. "legacy", "cloud", "SaaS"
  colour: string;   // base colour name: "green", "blue", "red", etc.
}

export interface SystemType {
  name:   string;
  colour: string;
}

export interface FlowType {
  name:  string;
  style: string;
}

export interface ModelMeta {
  diagramType?:    DiagramType;
  name?:           string;
  version?:        string;
  date:            string;
  author?:         string;
  theme?:          string;
  orientation?:    'landscape' | 'portrait';
  size?:           'a4' | 'a3' | 'a2' | 'a1' | 'a0';
  legend?:         boolean;         // show legend box (default: true)
  showIds?:        boolean;         // overlay element id badges (default: false)
  locationTypes?:  LocationType[];  // user-defined location-type → colour mappings
  systemTypes?:    SystemType[];    // user-defined process system → colour mappings
  flowTypes?:      FlowType[];      // user-defined flow-type → style mappings
}

export interface Position { x: number; y: number; }

export interface ParseError {
  line:    number;
  message: string;
}

// ParseResult references all diagram model types — import type is safe for circular refs
import type { SDModel }   from './sd/types';
import type { IDModel }   from './id/types';
import type { IFFModel }  from './iff/types';
import type { TMModel }   from './tm/types';

export interface ParseResult {
  model:  SDModel | IDModel | IFFModel | TMModel | null;
  errors: ParseError[];
}

// ── Re-exports for consumers that import from the root types module ───────────

export type {
  Polarity, CloudRole, FlowStrength, SDLabelCorner,
  Stock, Cloud, Auxiliary, Flow, Connector, SDGroup, Node,
  SDModel,
} from './sd/types';

export type {
  IDState, Direction, PlacementPos, LabelCorner,
  IDElement, IDConnection, IDGroup,
  IDModel,
} from './id/types';

export type {
  IFFRelationship, IFFState, IFFLabelCorner,
  IFFNodeBase, IFFStore, IFFProcess, IFFNode, IFFLink, IFFGroup,
  IFFModel,
} from './iff/types';

export type {
  TMRef, TMBoundary, TMFlow, TMThreat, TMMitigation,
  TMModel,
} from './tm/types';
