import type { ModelMeta, Position } from '../types';

export type { Position } from '../types';  // re-export for convenience within id/

export type IDState     = 'current' | 'new' | 'changing' | 'decommissioned';
export type Direction   = 'unidirectional' | 'bidirectional';
export type PlacementPos = 'inside' | 'below';
export type LabelCorner  = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

export interface IDElement extends Position {
  kind:         'system' | 'database' | 'queue';
  id:           string;
  label:        string;
  locationType: string;
  state:        IDState;
  placement:    PlacementPos;
}

export interface IDConnection {
  kind:      'connection';
  id:        string;
  from:      string;
  to:        string;
  direction: Direction;
  protocol:  string;
}

export interface IDGroup {
  kind:        'group';
  id:          string;
  label:       string;
  members:     string[];
  labelCorner: LabelCorner;
}

export interface IDModel {
  meta:           ModelMeta;
  elements:       IDElement[];
  connections:    IDConnection[];
  groups:         IDGroup[];
  savedPositions: Record<string, Position>;
}
