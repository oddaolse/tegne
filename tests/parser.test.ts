import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { SDModel } from '../src/sd/types';

// ─────────────────────────────────────────────────────────────────────────────
// Positive tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parser — positive tests', () => {

  it('parses an empty string', () => {
    const { model, errors } = parse('');
    expect(errors).toHaveLength(0);
    expect(model).not.toBeNull();
    expect((model as SDModel).stocks).toHaveLength(0);
    expect((model as SDModel).flows).toHaveLength(0);
  });

  it('ignores blank lines and # comments', () => {
    const dsl = `
# This is a comment

stock Population
# another comment
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).stocks).toHaveLength(1);
    expect((model as SDModel).stocks[0].id).toBe('Population');
  });

  it('parses a stock', () => {
    const { model, errors } = parse('stock GDP');
    expect(errors).toHaveLength(0);
    expect((model as SDModel).stocks[0]).toMatchObject({ kind: 'stock', id: 'GDP', label: 'GDP' });
  });

  it('parses a cloud with [source]', () => {
    const { model, errors } = parse('cloud Births [source]');
    expect(errors).toHaveLength(0);
    expect((model as SDModel).clouds[0]).toMatchObject({ kind: 'cloud', id: 'Births', role: 'source' });
  });

  it('parses a cloud with [sink]', () => {
    const { model, errors } = parse('cloud Deaths [sink]');
    expect(errors).toHaveLength(0);
    expect((model as SDModel).clouds[0].role).toBe('sink');
  });

  it('defaults cloud role to source when omitted', () => {
    const { model, errors } = parse('cloud Births');
    expect(errors).toHaveLength(0);
    expect((model as SDModel).clouds[0].role).toBe('source');
  });

  it('parses a flow with default strength (medium)', () => {
    const dsl = `
stock Population
cloud Births [source]
flow Births -> Population : birth_rate (+)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).flows[0]).toMatchObject({
      kind: 'flow', from: 'Births', to: 'Population',
      label: 'birth_rate', polarity: '+', strength: 'medium',
    });
  });

  it('parses flow with explicit strength: strong', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A : rate (+) strong
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).flows[0].strength).toBe('strong');
  });

  it('parses flow with explicit strength: weak', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A : rate (+) weak
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).flows[0].strength).toBe('weak');
  });

  it('parses flow with negative polarity', () => {
    const dsl = `
stock A
cloud B [sink]
flow A -> B : loss (-) medium
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).flows[0].polarity).toBe('-');
  });

  it('parses a standalone aux', () => {
    const dsl = `
stock A
aux pressure
connector pressure <- A (+)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).auxiliaries).toHaveLength(1);
    expect((model as SDModel).auxiliaries[0].id).toBe('pressure');
  });

  it('parses aux with inline connector', () => {
    const dsl = `
stock Population
aux carrying_capacity <- Population (-)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).auxiliaries).toHaveLength(1);
    expect((model as SDModel).connectors).toHaveLength(1);
    expect((model as SDModel).connectors[0]).toMatchObject({ from: 'Population', to: 'carrying_capacity', polarity: '-' });
  });

  it('parses aux with multi-source inline connectors', () => {
    const dsl = `
stock OilSupply
stock GasSupply
aux energy_pressure <- OilSupply (-), GasSupply (-)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).connectors).toHaveLength(2);
    expect((model as SDModel).connectors[0]).toMatchObject({ from: 'OilSupply', to: 'energy_pressure', polarity: '-' });
    expect((model as SDModel).connectors[1]).toMatchObject({ from: 'GasSupply', to: 'energy_pressure', polarity: '-' });
  });

  it('parses a connector', () => {
    const dsl = `
stock Population
stock GDP
connector GDP <- Population (+)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).connectors[0]).toMatchObject({ from: 'Population', to: 'GDP', polarity: '+' });
  });

  it('parses multi-source connector into N connector objects', () => {
    const dsl = `
stock A
stock B
stock C
connector C <- A (+), B (-)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).connectors).toHaveLength(2);
  });

  it('parses connector targeting a flow label (valve)', () => {
    const dsl = `
stock Population
cloud Births [source]
flow Births -> Population : birth_rate (+)
connector birth_rate <- Population (+)
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).connectors[0]).toMatchObject({ from: 'Population', to: 'birth_rate' });
  });

  it('parses @name metadata', () => {
    const { model, errors } = parse('@name My Great Model');
    expect(errors).toHaveLength(0);
    expect(model!.meta.name).toBe('My Great Model');
  });

  it('parses @version metadata', () => {
    const { model, errors } = parse('@version 2.1');
    expect(errors).toHaveLength(0);
    expect(model!.meta.version).toBe('2.1');
  });

  it('parses @author metadata', () => {
    const { model, errors } = parse('@author Jane Smith');
    expect(errors).toHaveLength(0);
    expect(model!.meta.author).toBe('Jane Smith');
  });

  it('parses @date metadata', () => {
    const { model, errors } = parse('@date 2025-06-01');
    expect(errors).toHaveLength(0);
    expect(model!.meta.date).toBe('2025-06-01');
  });

  it('defaults @date to today when absent', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { model, errors } = parse('stock X');
    expect(errors).toHaveLength(0);
    expect(model!.meta.date).toBe(today);
  });

  it('parses @position directives into savedPositions', () => {
    const dsl = `
stock Population
@position Population 340 450
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(model!.savedPositions['Population']).toEqual({ x: 340, y: 450 });
  });

  it('handles multiple @position directives', () => {
    const dsl = `
stock A
stock B
@position A 100 200
@position B 400 200
    `;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect(Object.keys(model!.savedPositions)).toHaveLength(2);
  });

  it('parses both fixture models without errors', async () => {
    const pop = (await import('../fixtures/population.sd?raw')).default;
    const fac = (await import('../fixtures/factory_dynamics.sd?raw')).default;

    for (const [name, dsl] of [['population', pop], ['factory_dynamics', fac]] as [string, string][]) {
      const { errors } = parse(dsl);
      expect(errors, `${name} should parse without errors`).toHaveLength(0);
    }
  });

  it('population fixture has all five element types', async () => {
    const dsl = (await import('../fixtures/population.sd?raw')).default;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).stocks).not.toHaveLength(0);
    expect((model as SDModel).clouds).not.toHaveLength(0);
    expect((model as SDModel).flows).not.toHaveLength(0);
    expect((model as SDModel).auxiliaries).not.toHaveLength(0);
    expect((model as SDModel).connectors).not.toHaveLength(0);
  });

  it('factory_dynamics fixture has all five element types', async () => {
    const dsl = (await import('../fixtures/factory_dynamics.sd?raw')).default;
    const { model, errors } = parse(dsl);
    expect(errors).toHaveLength(0);
    expect((model as SDModel).stocks).not.toHaveLength(0);
    expect((model as SDModel).clouds).not.toHaveLength(0);
    expect((model as SDModel).flows).not.toHaveLength(0);
    expect((model as SDModel).auxiliaries).not.toHaveLength(0);
    expect((model as SDModel).connectors).not.toHaveLength(0);
  });

  it('parses @info on', () => {
    const { model, errors } = parse('@info on');
    expect(errors).toHaveLength(0);
    expect(model!.meta.info).toBe(true);
  });

  it('parses @info off', () => {
    const { model, errors } = parse('@info off');
    expect(errors).toHaveLength(0);
    expect(model!.meta.info).toBe(false);
  });

  it('leaves meta.info undefined when @info is absent', () => {
    const { model, errors } = parse('stock Population');
    expect(errors).toHaveLength(0);
    expect(model!.meta.info).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Negative tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parser — negative tests', () => {

  it('reports an unknown keyword', () => {
    const { errors } = parse('foobar something');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unknown keyword/i);
    expect(errors[0].line).toBe(1);
  });

  it('reports an unknown @ directive', () => {
    const { errors } = parse('@unknown value');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unknown directive/i);
  });

  it('reports stock with no name', () => {
    const { errors } = parse('stock');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/requires a name/i);
  });

  it('reports cloud with invalid role', () => {
    const { errors } = parse('cloud Foo [river]');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/source.*sink/i);
  });

  it('reports flow missing ->', () => {
    const { errors } = parse('flow A B : rate (+)');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/->/);
  });

  it('reports flow missing :', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A rate (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.includes(':'))).toBe(true);
  });

  it('reports flow with invalid polarity', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A : rate (?)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/polarity/i))).toBe(true);
  });

  it('reports flow with invalid strength keyword', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A : rate (+) turbo
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/strength/i))).toBe(true);
  });

  it('reports flow with empty label', () => {
    const dsl = `
stock A
cloud B [source]
flow B -> A :  (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/label/i))).toBe(true);
  });

  it('reports aux with no name', () => {
    const { errors } = parse('aux');
    expect(errors.some(e => e.message.match(/requires a name/i))).toBe(true);
  });

  it('reports connector missing <-', () => {
    const { errors } = parse('connector A B');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/<-/);
  });

  it('reports aux/flow name collision', () => {
    const dsl = `
stock Population
cloud Births [source]
flow Births -> Population : birth_rate (+)
aux birth_rate <- Population (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/already used as a flow label/i))).toBe(true);
  });

  it('reports connector referencing unknown from-id', () => {
    const dsl = `
stock Population
connector Population <- ghost (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*ghost/i))).toBe(true);
  });

  it('reports connector referencing unknown to-id', () => {
    const dsl = `
stock Population
connector ghost <- Population (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown id.*ghost/i))).toBe(true);
  });

  it('reports flow with unknown from-node', () => {
    const dsl = `
stock Population
flow Ghost -> Population : rate (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown from node/i))).toBe(true);
  });

  it('reports flow with unknown to-node', () => {
    const dsl = `
stock Population
cloud Births [source]
flow Births -> Ghost : rate (+)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/unknown to node/i))).toBe(true);
  });

  it('reports @position with wrong number of arguments', () => {
    const { errors } = parse('@position NodeA 100');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/@position requires/i);
  });

  it('reports invalid @orientation value', () => {
    const { errors } = parse('@orientation sideways');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/landscape or portrait/i);
  });

  it('reports @position with non-numeric coordinates', () => {
    const { errors } = parse('@position NodeA abc def');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/numbers/i);
  });

  it('reports invalid polarity in connector source list', () => {
    const dsl = `
stock A
stock B
connector B <- A (?)
    `;
    const { errors } = parse(dsl);
    expect(errors.some(e => e.message.match(/polarity/i))).toBe(true);
  });

  it('accumulates multiple errors without crashing', () => {
    const dsl = `
unknown_kw foo
stock
flow bad
    `;
    const { model, errors } = parse(dsl);
    expect(errors.length).toBeGreaterThan(1);
    expect(model).not.toBeNull(); // partial model still returned
  });

  it('reports invalid @info value', () => {
    const { errors } = parse('@info maybe');
    expect(errors.some(e => e.message.includes('@info must be on or off'))).toBe(true);
  });
});
