// ── Shared types ──────────────────────────────────────────────────────────────

export type DiagramType = 'sd' | 'id' | 'infoflow' | 'tm';

export interface ModelMeta {
  diagramType?:  DiagramType;
  name?:         string;
  version?:      string;
  date:          string;
  author?:       string;
  theme?:        string;
  orientation?:  'landscape' | 'portrait';
  size?:         'a4' | 'a3' | 'a2' | 'a1' | 'a0';
  legend?:       boolean;   // show legend box (default: true)
  showIds?:      boolean;   // overlay element id badges (default: false)
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
  Platform, IDState, Direction, PlacementPos, LabelCorner,
  IDElement, IDConnection, IDGroup,
  IDModel,
} from './id/types';

export type {
  IFFRole, IFFRelationship, IFFState, IFFLabelCorner,
  IFFStore, IFFLink, IFFGroup,
  IFFModel,
} from './iff/types';

export type {
  TMRef, TMBoundary, TMFlow, TMThreat, TMMitigation,
  TMModel,
} from './tm/types';
