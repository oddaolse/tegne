import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { IDModel } from '../src/types';

// Helper to create DSL with @location-types block
const withLocationTypes = (body: string) => `@type id
@location-types
  aws orange
  azure blue
  gcp green
  oracle red
  on-prem grey

${body}`;

// ─────────────────────────────────────────────────────────────────────────────
// Positive tests
// ─────────────────────────────────────────────────────────────────────────────

describe('id-parser — positive tests', () => {

  it('dispatches @type id to the ID parser', () => {
    const { model, errors } = parse(withLocationTypes('system Foo [aws]'));
    expect(errors).toHaveLength(0);
    expect(model).not.toBeNull();
    expect(model!.meta.diagramType).toBe('id');
  });

  it('parses a system element', () => {
    const { model, errors } = parse(withLocationTypes('system OrderSvc [aws]'));
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements).toHaveLength(1);
    expect(id.elements[0]).toMatchObject({ kind: 'system', id: 'OrderSvc', locationType: 'aws', state: 'current' });
  });

  it('parses a database element', () => {
    const { model, errors } = parse(withLocationTypes('database CustomerDB [on-prem]'));
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0]).toMatchObject({ kind: 'database', locationType: 'on-prem' });
  });

  it('parses a queue element', () => {
    const { model, errors } = parse(withLocationTypes('queue OrderQueue [aws]'));
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0]).toMatchObject({ kind: 'queue', locationType: 'aws' });
  });

  it('parses all five location-types', () => {
    const dsl = withLocationTypes(`system A [aws]
system B [azure]
system C [on-prem]
system D [gcp]
system E [oracle]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements.map(e => e.locationType)).toEqual(['aws', 'azure', 'on-prem', 'gcp', 'oracle']);
  });

  it('parses element states', () => {
    const dsl = withLocationTypes(`system A [aws] [new]
system B [azure] [changing]
system C [gcp] [decommissioned]
system D [oracle]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0].state).toBe('new');
    expect(id.elements[1].state).toBe('changing');
    expect(id.elements[2].state).toBe('decommissioned');
    expect(id.elements[3].state).toBe('current');
  });

  it('defaults label placement: system=inside, database=below, queue=below', () => {
    const dsl = withLocationTypes(`system A [aws]
database B [aws]
queue C [aws]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0].placement).toBe('inside');
    expect(id.elements[1].placement).toBe('below');
    expect(id.elements[2].placement).toBe('below');
  });

  it('respects [placement:inside] and [placement:below] overrides', () => {
    const dsl = withLocationTypes(`database A [aws] [placement:inside]
system B [azure] [placement:below]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0].placement).toBe('inside');
    expect(id.elements[1].placement).toBe('below');
  });

  it('supports [label:"text"] for display name separate from id', () => {
    const dsl = withLocationTypes('system MobileApp [azure] [label:"Mobile Application"]');
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.elements[0].id).toBe('MobileApp');
    expect(id.elements[0].label).toBe('Mobile Application');
  });

  it('parses a unidirectional connect', () => {
    const dsl = withLocationTypes(`system A [aws]
system B [azure]
connect A -> B : REST`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.connections[0]).toMatchObject({ from: 'A', to: 'B', direction: 'unidirectional', protocol: 'REST' });
  });

  it('parses a bidirectional connect', () => {
    const dsl = withLocationTypes(`system A [aws]
system B [azure]
connect A <-> B : gRPC`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.connections[0].direction).toBe('bidirectional');
  });

  it('parses @position directives', () => {
    const dsl = withLocationTypes(`system A [aws]
@position A 200 300`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.savedPositions['A']).toEqual({ x: 200, y: 300 });
  });

  it('parses group with members', () => {
    const dsl = withLocationTypes(`group g1 My Group [corner:upper-left]
  system A [aws]
  system B [azure]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.groups).toHaveLength(1);
    expect(id.groups[0].id).toBe('g1');
    expect(id.groups[0].label).toBe('My Group');
    expect(id.groups[0].labelCorner).toBe('upper-left');
    expect(id.groups[0].members).toEqual(['A', 'B']);
  });

  it('defaults group label corner to upper-right', () => {
    const dsl = withLocationTypes(`group g1 Test
  system A [aws]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.groups[0].labelCorner).toBe('upper-right');
  });

  it('parses metadata directives', () => {
    const dsl = `@type id
@name My Diagram
@author Jane
@version 2.0
@date 2026-01-01`;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.meta.name).toBe('My Diagram');
    expect(model!.meta.author).toBe('Jane');
    expect(model!.meta.version).toBe('2.0');
    expect(model!.meta.date).toBe('2026-01-01');
  });

  it('parses @location-types block', () => {
    const dsl = `@type id
@location-types
  legacy green
  cloud blue
  partner orange

system A [legacy]
system B [cloud]`;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.meta.locationTypes).toHaveLength(3);
    expect(id.meta.locationTypes![0]).toEqual({ name: 'legacy', colour: 'green' });
    expect(id.elements[0].locationType).toBe('legacy');
    expect(id.elements[1].locationType).toBe('cloud');
  });

  it('parses integration_example.id fixture without errors', async () => {
    const dsl = (await import('../fixtures/integration_example.id?raw')).default;
    const { errors } = parse(dsl);
    expect(errors).toHaveLength(0);
  });

  it('integration_example.id has expected element types', async () => {
    const dsl = (await import('../fixtures/integration_example.id?raw')).default;
    const { model } = parse(dsl);
    const id = model as IDModel;
    const kinds = id.elements.map(e => e.kind);
    expect(kinds).toContain('system');
    expect(kinds).toContain('database');
    expect(kinds).toContain('queue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Negative tests
// ─────────────────────────────────────────────────────────────────────────────

describe('id-parser — negative tests', () => {

  it('reports system with no id', () => {
    const { errors } = parse(withLocationTypes('system'));
    expect(errors.some(e => e.message.match(/requires an id/i))).toBe(true);
  });

  it('reports element with unknown location-type', () => {
    const { errors } = parse(withLocationTypes('system Foo [mainframe]'));
    expect(errors.some(e => e.message.match(/unknown qualifier/i))).toBe(true);
  });

  it('reports element with missing location-type', () => {
    const { errors } = parse(withLocationTypes('system Foo'));
    expect(errors.some(e => e.message.match(/requires a location-type/i))).toBe(true);
  });

  it('reports connect with unknown from-id', () => {
    const dsl = withLocationTypes(`system B [aws]
connect Ghost -> B : REST`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*Ghost/i))).toBe(true);
  });

  it('reports connect with unknown to-id', () => {
    const dsl = withLocationTypes(`system A [aws]
connect A -> Ghost : REST`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*Ghost/i))).toBe(true);
  });

  it('reports connect missing arrow', () => {
    const dsl = withLocationTypes(`system A [aws]
system B [azure]
connect A B : REST`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/->|<->/i))).toBe(true);
  });

  it('reports connect missing protocol', () => {
    const dsl = withLocationTypes(`system A [aws]
system B [azure]
connect A -> B`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/protocol/i))).toBe(true);
  });

  it('reports nested group', () => {
    const dsl = withLocationTypes(`group outer Outer
  group inner Inner
    system A [aws]
  end
end`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/nest/i))).toBe(true);
  });

  it('reports end without group', () => {
    const { errors } = parse(withLocationTypes('end'));
    expect(errors.some(e => e.message.match(/"end" without/i))).toBe(true);
  });

  it('reports unclosed group', () => {
    const dsl = withLocationTypes(`group g1 Test
  system A [aws]`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/never closed/i))).toBe(true);
  });

  it('reports element in multiple groups', () => {
    const dsl = withLocationTypes(`group g1 First
  system A [aws]
end
group g2 Second
  system A [aws]
end`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/appears in both group/i))).toBe(true);
  });

  it('reports unknown @orientation value', () => {
    const { errors } = parse('@type id\n@orientation diagonal');
    expect(errors.some(e => e.message.match(/landscape or portrait/i))).toBe(true);
  });

  it('reports invalid palette colour in @location-types', () => {
    const dsl = `@type id
@location-types
  invalid neon-magenta

system A [invalid]`;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown palette colour/i))).toBe(true);
  });
});
