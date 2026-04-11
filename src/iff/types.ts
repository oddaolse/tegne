import type { ModelMeta, Position } from '../types';

export type { Position } from '../types';  // re-export for convenience within iff/

export type IFFRole         = 'master' | 'replica' | 'derived' | 'aggregate' | 'golden' | 'reference' | 'consumer';
export type IFFRelationship = 'replicate' | 'publish' | 'ingest' | 'derive' | 'aggregate' | 'enrich' | 'merge' | 'serve';
export type IFFState        = 'current' | 'new' | 'changing' | 'decommissioned';
export type IFFLabelCorner  = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

export interface IFFStore extends Position {
  kind:  'store';
  id:    string;
  label: string;
  role:  IFFRole;
  state: IFFState;
}

export interface IFFLink {
  kind:         'link';
  id:           string;
  from:         string;
  to:           string;
  relationship: IFFRelationship;
  transport?:   string;
}

export interface IFFGroup {
  kind:        'group';
  id:          string;
  label:       string;
  members:     string[];
  labelCorner: IFFLabelCorner;
}

export interface IFFModel {
  meta:           ModelMeta;
  stores:         IFFStore[];
  links:          IFFLink[];
  groups:         IFFGroup[];
  savedPositions: Record<string, Position>;
}
