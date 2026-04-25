import type { FlowType, ModelMeta, Position, SystemType } from '../types';

export type { Position } from '../types';  // re-export for convenience within iff/

export type IFFRelationship = 'replicate' | 'publish' | 'subscribe' | 'ingest' | 'derive' | 'aggregate' | 'enrich' | 'merge' | 'serve' | 'query';
export type IFFState        = 'current' | 'new' | 'changing' | 'decommissioned';
export type IFFLabelCorner  = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

export interface IFFNodeBase extends Position {
  id:    string;
  label: string;
  state: IFFState;
}

export interface IFFStore extends IFFNodeBase {
  kind:         'store';
  locationType: string;
}

export interface IFFProcess extends IFFNodeBase {
  kind:   'process';
  system: string;
}

export interface IFFLink {
  kind:         'link';
  id:           string;
  from:         string;
  to:           string;
  relationship: IFFRelationship;
  flowType?:    string;
  flowTypeExplicit?: boolean;
}

export interface IFFGroup {
  kind:         'group';
  id:           string;
  label:        string;
  members:      string[];
  labelCorner:  IFFLabelCorner;
  system?:      string;
}

export type IFFNode = IFFStore | IFFProcess;

export interface IFFNodeRegistry {
  stores:    IFFStore[];
  processes: IFFProcess[];
  nodes:     IFFNode[];
}

export interface IFFModel extends IFFNodeRegistry {
  meta:           ModelMeta;
  links:          IFFLink[];
  groups:         IFFGroup[];
  savedPositions: Record<string, Position>;
  systemTypes?:   SystemType[];
  flowTypes?:     FlowType[];
}
