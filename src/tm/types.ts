import type { ModelMeta, Position, TextBlock } from '../types';
import type { StrideCategory } from '../themes';

export type { StrideCategory } from '../themes';

export interface TMRef extends Position {
  kind: 'ref';
  id:   string;   // references an element id declared in another diagram
}

export interface TMBoundary {
  kind:    'boundary';
  id:      string;
  label:   string;
  members: string[];   // TMRef ids
}

export interface TMFlow {
  kind:   'flow';
  id:     string;
  from:   string;   // ref id
  to:     string;   // ref id
  label?: string;
}

export interface TMThreat {
  kind:        'threat';
  id:          string;
  stride:      StrideCategory;
  targetId:    string;   // flow id or ref id
  description: string;
}

export interface TMMitigation {
  kind:        'mitigation';
  id:          string;
  threatId:    string;
  description: string;
}

export type { TextBlock } from '../types';   // re-export for tm/ consumers

export interface TMModel {
  meta:           ModelMeta;
  refFiles:       string[];
  refs:           TMRef[];
  boundaries:     TMBoundary[];
  flows:          TMFlow[];
  threats:        TMThreat[];
  mitigations:    TMMitigation[];
  textBlocks:     TextBlock[];
  savedPositions: Record<string, Position>;
}
