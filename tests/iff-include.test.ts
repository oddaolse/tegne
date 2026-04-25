import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { IFFModel } from '../src/types';

const commonIff = `@type infoflow
@theme light
@size a3

@location-types
  master blue
  replica cyan

@systems
  SystemA blue

@flow-types
  sync solid
  batch thick
`;

describe('iff @include', () => {
  it('merges dictionaries and metadata defaults from an included file', () => {
    const dsl = `@type infoflow
@include common.iff

store cis [master]
process syncer [SystemA]
link cis -> syncer : query [flow:sync]`;

    const { model, errors } = parse(dsl, { includeFiles: new Map([['common.iff', commonIff]]) });

    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    expect(iff.meta.theme).toBe('light');
    expect(iff.meta.size).toBe('a3');
    expect(iff.meta.locationTypes?.map(entry => entry.name)).toEqual(['master', 'replica']);
    expect(iff.meta.systemTypes?.map(entry => entry.name)).toEqual(['SystemA']);
    expect(iff.meta.flowTypes?.map(entry => entry.name)).toEqual(['sync', 'batch']);
    expect(iff.stores[0].locationType).toBe('master');
    expect(iff.processes[0].system).toBe('SystemA');
  });

  it('keeps local metadata when include provides defaults', () => {
    const dsl = `@type infoflow
@include common.iff
@theme tokyo

store cis [master]`;

    const { model, errors } = parse(dsl, { includeFiles: new Map([['common.iff', commonIff]]) });

    expect(errors).toHaveLength(0);
    expect(model!.meta.theme).toBe('tokyo');
    expect(model!.meta.size).toBe('a3');
  });

  it('reports missing included files', () => {
    const { errors } = parse('@type infoflow\n@include missing.iff', { includeFiles: new Map() });

    expect(errors.some(error => error.message.match(/file not found/i))).toBe(true);
  });

  it('reports include usage without a loaded file map', () => {
    const { errors } = parse('@type infoflow\n@include common.iff');

    expect(errors.some(error => error.message.match(/no project loaded/i))).toBe(true);
  });

  it('reports type mismatches before parsing the included file as the host type', () => {
    const files = new Map([['common.sd', '@type sd\n@theme light']]);
    const { errors } = parse('@type infoflow\n@include common.sd', { includeFiles: files });

    expect(errors.some(error => error.message.match(/expected @type "infoflow", got "sd"/i))).toBe(true);
  });

  it('reports nested includes inside included files', () => {
    const files = new Map([
      ['common.iff', '@type infoflow\n@include nested.iff\n@location-types\n  master blue'],
      ['nested.iff', '@type infoflow\n@theme light'],
    ]);

    const { errors } = parse('@type infoflow\n@include common.iff\nstore cis [master]', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed inside an included file/i))).toBe(true);
  });

  it('reports positional content inside included files', () => {
    const files = new Map([['common.iff', `${commonIff}\nstore illegal [master]`]]);

    const { errors } = parse('@type infoflow\n@include common.iff\nstore cis [master]', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed in an included file/i))).toBe(true);
  });

  it('reports local dictionary collisions with included dictionaries', () => {
    const dsl = `@type infoflow
@include common.iff

@location-types
  master green

store cis [master]`;

    const { errors } = parse(dsl, { includeFiles: new Map([['common.iff', commonIff]]) });

    expect(errors.some(error => error.message.match(/already contributed by an @include/i))).toBe(true);
  });

  it('reports dictionary collisions across multiple includes', () => {
    const files = new Map([
      ['a.iff', '@type infoflow\n@location-types\n  master blue'],
      ['b.iff', '@type infoflow\n@location-types\n  master green'],
    ]);

    const { errors } = parse('@type infoflow\n@include a.iff\n@include b.iff\nstore cis [master]', { includeFiles: files });

    expect(errors.some(error => error.message.match(/already contributed by another include/i))).toBe(true);
  });
});
