import type { DiagramType } from '../types';

export interface ProjectManifest {
  name?:   string;
  entries: ProjectEntry[];
}

export interface ProjectEntry {
  filename: string;
}

export interface RegistryEntry {
  id:          string;
  diagramType: DiagramType | 'tm';
  filename:    string;
  elementKind: string;
  label:       string;
}

export interface IDRegistry {
  entries: Map<string, RegistryEntry>;    // key: `${filename}:${id}`
  byId:    Map<string, RegistryEntry[]>;  // key: bare id, value: all matches across files
  errors:  Array<{ filename: string; message: string }>;
}
