import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../src/project/registry';

describe('project registry', () => {
  it('skips threat-model files instead of treating them as stock-flow diagrams', () => {
    const files = new Map([
      ['platform.id', `@type id
@location-types
  cloud blue

system api [cloud]`],
      ['threats.tm', `@type tm
@ref platform.id
ref api
threat T1 [stride:S] api : "Spoofing"`],
    ]);

    const registry = buildRegistry(files);

    expect(registry.errors).toHaveLength(0);
    expect(registry.byId.get('api')?.map(entry => entry.filename)).toEqual(['platform.id']);
  });

  it('builds registry entries from include-based infoflow files', () => {
    const files = new Map([
      ['common.iff', `@type infoflow
@location-types
  master blue
@systems
  SystemA teal
@flow-types
  sync solid`],
      ['landscape.iff', `@type infoflow
@include common.iff

store cis [master]
process syncer [SystemA]
connect cis -> syncer : query [flow:sync]`],
    ]);

    const registry = buildRegistry(files);

    expect(registry.errors).toHaveLength(0);
    expect(registry.byId.get('cis')?.[0]).toMatchObject({ filename: 'landscape.iff', elementKind: 'store' });
    expect(registry.byId.get('syncer')?.[0]).toMatchObject({ filename: 'landscape.iff', elementKind: 'process' });
  });
});
