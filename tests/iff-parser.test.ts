import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { IFFModel } from '../src/types';

// Helper to create DSL with @location-types block
const withLocationTypes = (body: string) => `@type infoflow
@location-types
  master blue
  replica cyan
  derived green
  aggregate purple
  golden orange
  reference grey
  consumer grey

${body}`;

// ─────────────────────────────────────────────────────────────────────────────
// Positive tests
// ─────────────────────────────────────────────────────────────────────────────

describe('iff-parser — positive tests', () => {

  it('dispatches @type infoflow to the IFF parser', () => {
    const { model, errors } = parse(withLocationTypes('store A [master]'));
    expect(errors).toHaveLength(0);
    expect(model).not.toBeNull();
    expect(model!.meta.diagramType).toBe('infoflow');
  });

  it('parses a store with location-type', () => {
    const { model, errors } = parse(withLocationTypes('store crm [master]'));
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.stores).toHaveLength(1);
    expect(iff.stores[0]).toMatchObject({ kind: 'store', id: 'crm', locationType: 'master', state: 'current' });
  });

  it('parses all 7 location-types', () => {
    const dsl = withLocationTypes(`store a [master]
store b [replica]
store c [derived]
store d [aggregate]
store e [golden]
store f [reference]
store g [consumer]`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.stores.map(s => s.locationType)).toEqual([
      'master', 'replica', 'derived', 'aggregate', 'golden', 'reference', 'consumer',
    ]);
  });

  it('parses optional state [new]', () => {
    const { model, errors } = parse(withLocationTypes('store A [master] [new]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].state).toBe('new');
  });

  it('parses optional state [changing]', () => {
    const { model, errors } = parse(withLocationTypes('store A [golden] [changing]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].state).toBe('changing');
  });

  it('parses optional state [decommissioned]', () => {
    const { model, errors } = parse(withLocationTypes('store A [replica] [decommissioned]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].state).toBe('decommissioned');
  });

  it('defaults state to current when omitted', () => {
    const { model, errors } = parse(withLocationTypes('store A [master]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].state).toBe('current');
  });

  it('parses optional label override', () => {
    const { model, errors } = parse(withLocationTypes('store crm [master] [label:"CRM System"]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].label).toBe('CRM System');
  });

  it('defaults label to id when no label override', () => {
    const { model, errors } = parse(withLocationTypes('store crm [master]'));
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).stores[0].label).toBe('crm');
  });

  it('parses link with all relationship types', () => {
    const relationships = ['replicate', 'publish', 'ingest', 'derive', 'aggregate', 'enrich', 'merge', 'serve'];
    for (const rel of relationships) {
      const dsl = withLocationTypes(`store A [master]\nstore B [replica]\nlink A -> B : ${rel}`);
      const { model, errors } = parse(dsl);
      expect(errors).toHaveLength(0);
      expect((model as IFFModel).links[0].relationship).toBe(rel);
    }
  });

  it('parses @position directives for stores', () => {
    const dsl = withLocationTypes(`store A [master]\n@position A 100 200`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.savedPositions['A']).toEqual({ x: 100, y: 200 });
  });

  it('parses @position __meta__', () => {
    const dsl = withLocationTypes(`store A [master]\n@position __meta__ 50 800`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.savedPositions['__meta__']).toEqual({ x: 50, y: 800 });
  });

  it('parses group...end blocks', () => {
    const dsl = withLocationTypes(`group domain Customer Domain [corner:upper-left]
store crm [master]
store cdp [golden]
end`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.groups).toHaveLength(1);
    expect(iff.groups[0].id).toBe('domain');
    expect(iff.groups[0].label).toBe('Customer Domain');
    expect(iff.groups[0].labelCorner).toBe('upper-left');
    expect(iff.groups[0].members).toEqual(['crm', 'cdp']);
  });

  it('defaults group label corner to upper-right', () => {
    const dsl = withLocationTypes(`group g Test\nstore A [master]\nend`);
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as IFFModel).groups[0].labelCorner).toBe('upper-right');
  });

  it('parses metadata directives', () => {
    const dsl = `@type infoflow
@name My IFF
@author Jane
@version 2.0
@date 2026-01-01`;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.meta.name).toBe('My IFF');
    expect(model!.meta.author).toBe('Jane');
    expect(model!.meta.version).toBe('2.0');
    expect(model!.meta.date).toBe('2026-01-01');
  });

  it('parses @location-types block', () => {
    const dsl = `@type infoflow
@location-types
  source blue
  target green

store A [source]
store B [target]`;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.meta.locationTypes).toHaveLength(2);
    expect(iff.meta.locationTypes![0]).toEqual({ name: 'source', colour: 'blue' });
    expect(iff.stores[0].locationType).toBe('source');
    expect(iff.stores[1].locationType).toBe('target');
  });

  it('parses customer_information.iff fixture without errors', async () => {
    const dsl = (await import('../fixtures/customer_information.iff?raw')).default;
    const { errors } = parse(dsl);
    expect(errors).toHaveLength(0);
  });

  it('customer_information.iff has all expected element counts', async () => {
    const dsl = (await import('../fixtures/customer_information.iff?raw')).default;
    const { model } = parse(dsl);
    const iff = model as IFFModel;
    expect(iff.stores.length).toBeGreaterThanOrEqual(6);
    expect(iff.links.length).toBeGreaterThanOrEqual(6);
    expect(iff.groups.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Negative tests
// ─────────────────────────────────────────────────────────────────────────────

describe('iff-parser — negative tests', () => {

  it('reports store missing location-type', () => {
    const { errors } = parse(withLocationTypes('store A'));
    expect(errors.some(e => e.message.match(/requires a location-type/i))).toBe(true);
  });

  it('reports store with unknown location-type', () => {
    const { errors } = parse(withLocationTypes('store A [transient]'));
    expect(errors.some(e => e.message.match(/unknown qualifier/i))).toBe(true);
  });

  it('reports store missing id', () => {
    const { errors } = parse(withLocationTypes('store'));
    expect(errors.some(e => e.message.match(/requires an id/i))).toBe(true);
  });

  it('reports link with unknown relationship', () => {
    const dsl = withLocationTypes(`store A [master]\nstore B [replica]\nlink A -> B : teleport`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown relationship/i))).toBe(true);
  });

  it('reports link with unknown from-id', () => {
    const dsl = withLocationTypes(`store B [replica]\nlink Ghost -> B : publish`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*Ghost/i))).toBe(true);
  });

  it('reports link with unknown to-id', () => {
    const dsl = withLocationTypes(`store A [master]\nlink A -> Ghost : publish`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*Ghost/i))).toBe(true);
  });

  it('reports link missing arrow', () => {
    const dsl = withLocationTypes(`store A [master]\nstore B [replica]\nlink A B : publish`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/->/i))).toBe(true);
  });

  it('reports link missing colon', () => {
    const dsl = withLocationTypes(`store A [master]\nstore B [replica]\nlink A -> B`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/:/i))).toBe(true);
  });

  it('reports nested group', () => {
    const dsl = withLocationTypes(`group outer Outer
store A [master]
group inner Inner
store B [replica]
end
end`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/nest/i))).toBe(true);
  });

  it('reports unclosed group', () => {
    const dsl = withLocationTypes(`group g Test\nstore A [master]`);
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/never closed/i))).toBe(true);
  });

  it('reports end without group', () => {
    const { errors } = parse(withLocationTypes('end'));
    expect(errors.some(e => e.message.match(/"end" without/i))).toBe(true);
  });

  it('reports unknown directive', () => {
    const { errors } = parse('@type infoflow\n@foobar something');
    expect(errors.some(e => e.message.match(/unknown directive/i))).toBe(true);
  });

  it('reports unknown keyword', () => {
    const { errors } = parse(withLocationTypes('foobar baz'));
    expect(errors.some(e => e.message.match(/unknown keyword/i))).toBe(true);
  });

  it('reports invalid palette colour in @location-types', () => {
    const dsl = `@type infoflow
@location-types
  invalid neon-magenta

store A [invalid]`;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown palette colour/i))).toBe(true);
  });
});
