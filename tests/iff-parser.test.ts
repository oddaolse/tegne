import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { IFFModel } from '../src/types';

const withInfoflowBlocks = (body: string) => `@type infoflow
@location-types
  master blue
  replica cyan
  derived green
  aggregate purple
  golden orange
  reference grey
  consumer grey

@systems
  SystemA blue
  SystemB teal
  SystemC red

@flow-types
  sync solid
  async dashed
  batch thick

${body}`;

describe('iff-parser — positive tests', () => {
  it('dispatches @type infoflow to the IFF parser', () => {
    const { model, errors } = parse(withInfoflowBlocks('store A [master]'));
    expect(errors).toHaveLength(0);
    expect(model).not.toBeNull();
    expect(model!.meta.diagramType).toBe('infoflow');
  });

  it('parses a store with location-type', () => {
    const { model, errors } = parse(withInfoflowBlocks('store crm [master]'));
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.stores).toHaveLength(1);
    expect(iff.nodes).toHaveLength(1);
    expect(iff.stores[0]).toMatchObject({ kind: 'store', id: 'crm', locationType: 'master', state: 'current' });
  });

  it('parses a process with explicit system', () => {
    const { model, errors } = parse(withInfoflowBlocks('process syncer [SystemA] [label:"Sync Service"]'));
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.processes).toHaveLength(1);
    expect(iff.processes[0]).toMatchObject({
      kind: 'process', id: 'syncer', system: 'SystemA', state: 'current', label: 'Sync Service',
    });
  });

  it('normalizes [unchanged] to current state', () => {
    const { model, errors } = parse(withInfoflowBlocks('process syncer [SystemA] [unchanged]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).processes[0].state).toBe('current');
  });

  it('inherits process system from the containing group', () => {
    const dsl = withInfoflowBlocks(`group customer "Customer Domain" [system:SystemB]
  process syncer [label:"Sync Service"]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).processes[0].system).toBe('SystemB');
  });

  it('lets process system override inherited group system', () => {
    const dsl = withInfoflowBlocks(`group customer "Customer Domain" [system:SystemB]
  process syncer [SystemA]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).processes[0].system).toBe('SystemA');
  });

  it('parses @systems and @flow-types blocks into meta', () => {
    const { model, errors } = parse(withInfoflowBlocks('store A [master]'));
    expect(errors).toHaveLength(0);
    expect(model!.meta.systemTypes).toEqual([
      { name: 'SystemA', colour: 'blue' },
      { name: 'SystemB', colour: 'teal' },
      { name: 'SystemC', colour: 'red' },
    ]);
    expect(model!.meta.flowTypes).toEqual([
      { name: 'sync', style: 'solid' },
      { name: 'async', style: 'dashed' },
      { name: 'batch', style: 'thick' },
    ]);
  });

  it('parses query and subscribe relationships', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B : query [flow:sync]
connect B -> A : subscribe [flow:async]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).links.map(link => link.relationship)).toEqual(['query', 'subscribe']);
  });

  it('parses all supported connect direction operators', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B : query
connect A <- B : serve
connect A <-> B : merge`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).links.map(link => ({
      from: link.from,
      to: link.to,
      direction: link.direction,
      relationship: link.relationship,
    }))).toEqual([
      { from: 'A', to: 'B', direction: 'unidirectional', relationship: 'query' },
      { from: 'B', to: 'A', direction: 'unidirectional', relationship: 'serve' },
      { from: 'A', to: 'B', direction: 'bidirectional', relationship: 'merge' },
    ]);
  });

  it('parses explicit flow types on links', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B : replicate [flow:batch]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).links[0].flowType).toBe('batch');
  });

  it('infers default flow types when omitted', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B : query
connect B -> A : publish`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).links.map(link => link.flowType)).toEqual(['sync', 'async']);
  });

  it('accepts legacy bare connect qualifiers for backward compatibility', async () => {
    const dsl = (await import('../fixtures/customer_information.iff?raw')).default;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.links.some(link => link.flowType === 'kafka')).toBe(true);
  });

  it('accepts legacy link keyword for backward compatibility', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
link A -> B : query [flow:sync]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).links[0]).toMatchObject({
      from: 'A',
      to: 'B',
      direction: 'unidirectional',
      relationship: 'query',
      flowType: 'sync',
    });
  });

  it('parses @position directives for stores and processes', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
@position A 100 200
@position B 400 300`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.savedPositions['A']).toEqual({ x: 100, y: 200 });
    expect(model!.savedPositions['B']).toEqual({ x: 400, y: 300 });
  });

  it('parses group labels with quotes and mixed members', () => {
    const dsl = withInfoflowBlocks(`group domain "Customer Domain" [corner:upper-left] [system:SystemA]
  store crm [master]
  process syncer [label:"Sync"]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.groups[0]).toMatchObject({
      id: 'domain',
      label: 'Customer Domain',
      labelCorner: 'upper-left',
      system: 'SystemA',
      members: ['crm', 'syncer'],
    });
  });

  it('parses customer_information.iff fixture without errors', async () => {
    const dsl = (await import('../fixtures/customer_information.iff?raw')).default;
    const { errors } = parse(dsl);
    expect(errors).toHaveLength(0);
  });

  it('customer_information.iff has expected store and group counts', async () => {
    const dsl = (await import('../fixtures/customer_information.iff?raw')).default;
    const { model } = parse(dsl);
    const iff = model as IFFModel;
    expect(iff.stores.length).toBeGreaterThanOrEqual(6);
    expect(iff.processes).toHaveLength(0);
    expect(iff.links.length).toBeGreaterThanOrEqual(6);
    expect(iff.groups.length).toBe(2);
  });

  it('parses mixed process fixture without errors', async () => {
    const dsl = (await import('../fixtures/customer_information_process.iff?raw')).default;
    const common = (await import('../fixtures/common-types.iff?raw')).default;
    const { model, errors } = parse(dsl, { includeFiles: new Map([['common-types.iff', common]]) });
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.stores.length).toBe(5);
    expect(iff.processes.length).toBe(4);
    expect(iff.links.length).toBe(8);
    expect(iff.groups.length).toBe(2);
  });
});

describe('iff-parser — negative tests', () => {
  it('reports store missing location-type', () => {
    const { errors } = parse(withInfoflowBlocks('store A'));
    expect(errors.some(error => error.message.match(/requires a location-type/i))).toBe(true);
  });

  it('reports process missing system when no group system exists', () => {
    const { errors } = parse(withInfoflowBlocks('process A'));
    expect(errors.some(error => error.message.match(/requires a system/i))).toBe(true);
  });

  it('reports unknown process system', () => {
    const { errors } = parse(withInfoflowBlocks('process A [UnknownSystem]'));
    expect(errors.some(error => error.message.match(/unknown qualifier/i))).toBe(true);
  });

  it('reports unknown group system', () => {
    const dsl = withInfoflowBlocks(`group g Test [system:Ghost]
  process A [SystemA]
end`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/unknown system/i))).toBe(true);
  });

  it('reports unknown flow type', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B : replicate [flow:realtime]`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/unknown flow type/i))).toBe(true);
  });

  it('reports connection to unknown node id', () => {
    const dsl = withInfoflowBlocks(`store A [master]
connect A -> Ghost : publish`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/unknown id.*Ghost/i))).toBe(true);
  });

  it('reports missing or ambiguous connection direction operators', () => {
    const missing = parse(withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A B : query`));
    expect(missing.errors.some(error => error.message.match(/"->", "<-", or "<->"/))).toBe(true);

    const ambiguous = parse(withInfoflowBlocks(`store A [master]
process B [SystemA]
connect A -> B <- A : query`));
    expect(ambiguous.errors.some(error => error.message.match(/exactly one direction operator/i))).toBe(true);
  });

  it('reports duplicate ids across store and process declarations', () => {
    const dsl = withInfoflowBlocks(`store A [master]
process A [SystemA]`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/duplicate node id/i))).toBe(true);
  });

  it('reports invalid process qualifier', () => {
    const { errors } = parse(withInfoflowBlocks('process A [master]'));
    expect(errors.some(error => error.message.match(/valid systems/i))).toBe(true);
  });

  it('reports invalid group qualifier', () => {
    const dsl = withInfoflowBlocks(`group g Test [foo:bar]
  store A [master]
end`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/unknown group qualifier/i))).toBe(true);
  });

  it('reports nested group', () => {
    const dsl = withInfoflowBlocks(`group outer Outer
  store A [master]
  group inner Inner
    process B [SystemA]
  end
end`);
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/nest/i))).toBe(true);
  });

  it('reports invalid palette colour in @systems', () => {
    const dsl = `@type infoflow
@systems
  Broken coral

process A [Broken]`;
    const { errors } = parse(dsl);
    expect(errors.some(error => error.message.match(/unknown palette colour/i))).toBe(true);
  });
});
