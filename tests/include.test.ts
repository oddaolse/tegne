import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { saveIFF } from '../src/export';
import type { IDModel, IFFModel, SDModel, TMModel } from '../src/types';

describe('@include across diagram parsers', () => {
  it('applies SD metadata defaults while keeping host elements local', () => {
    const files = new Map([['common.sd', '@type sd\n@theme light\n@size a3\n@show-ids on']]);
    const { model, errors } = parse('@type sd\n@include common.sd\nstock Population', { includeFiles: files });

    expect(errors).toHaveLength(0);
    const sd = model as SDModel;
    expect(sd.meta.theme).toBe('light');
    expect(sd.meta.size).toBe('a3');
    expect(sd.meta.showIds).toBe(true);
    expect(sd.stocks.map(stock => stock.id)).toEqual(['Population']);
  });

  it('keeps local SD metadata over included defaults', () => {
    const files = new Map([['common.sd', '@type sd\n@theme light\n@size a3']]);
    const { model, errors } = parse('@type sd\n@include common.sd\n@theme tokyo', { includeFiles: files });

    expect(errors).toHaveLength(0);
    expect(model!.meta.theme).toBe('tokyo');
    expect(model!.meta.size).toBe('a3');
  });

  it('rejects positional SD content inside an included file', () => {
    const files = new Map([['common.sd', '@type sd\nstock Illegal']]);
    const { errors } = parse('@type sd\n@include common.sd', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed in an included file/i))).toBe(true);
  });

  it('merges ID location-types and metadata defaults from included files', () => {
    const files = new Map([[
      'common.id',
      `@type id
@theme light
@location-types
  cloud blue
`,
    ]]);
    const dsl = `@type id
@include common.id
system Api [cloud]`;

    const { model, errors } = parse(dsl, { includeFiles: files });

    expect(errors).toHaveLength(0);
    const id = model as IDModel;
    expect(id.meta.theme).toBe('light');
    expect(id.meta.locationTypes).toEqual([{ name: 'cloud', colour: 'blue' }]);
    expect(id.elements[0].locationType).toBe('cloud');
  });

  it('rejects local ID location-type collisions with included files', () => {
    const files = new Map([['common.id', '@type id\n@location-types\n  cloud blue']]);
    const dsl = `@type id
@include common.id
@location-types
  cloud green

system Api [cloud]`;

    const { errors } = parse(dsl, { includeFiles: files });

    expect(errors.some(error => error.message.match(/already contributed by an @include/i))).toBe(true);
  });

  it('rejects positional ID content inside an included file', () => {
    const files = new Map([['common.id', '@type id\n@location-types\n  cloud blue\n\nsystem Illegal [cloud]']]);
    const { errors } = parse('@type id\n@include common.id', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed in an included file/i))).toBe(true);
  });

  it('merges TM ref files and metadata defaults from included files', () => {
    const files = new Map([['common.tm', '@type tm\n@theme light\n@ref shared.id']]);
    const { model, errors } = parse('@type tm\n@include common.tm\n@ref local.id', { includeFiles: files });

    expect(errors).toHaveLength(0);
    const tm = model as TMModel;
    expect(tm.meta.theme).toBe('light');
    expect(tm.refFiles).toEqual(['shared.id', 'local.id']);
  });

  it('rejects positional TM content inside an included file', () => {
    const files = new Map([['common.tm', '@type tm\nref external_system']]);
    const { errors } = parse('@type tm\n@include common.tm', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed in an included file/i))).toBe(true);
  });

  it('rejects nested includes consistently outside IFF', () => {
    const files = new Map([
      ['common.sd', '@type sd\n@include nested.sd'],
      ['nested.sd', '@type sd\n@theme light'],
    ]);

    const { errors } = parse('@type sd\n@include common.sd', { includeFiles: files });

    expect(errors.some(error => error.message.match(/not allowed inside an included file/i))).toBe(true);
  });

  it('preserves @include lines when saving an include-based IFF diagram', async () => {
    let saved = '';
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    (globalThis as unknown as { window: unknown }).window = {
      showSaveFilePicker: async () => ({
        createWritable: async () => ({
          write: async (blob: Blob) => {
            saved = await blob.text();
          },
          close: async () => undefined,
        }),
      }),
    };

    const dsl = `@type infoflow
@include common.iff

store cis [master]
process syncer [SystemA]
link cis -> syncer : query [flow:sync]`;
    const common = `@type infoflow
@location-types
  master blue
@systems
  SystemA teal
@flow-types
  sync solid`;

    const { model, errors } = parse(dsl, { includeFiles: new Map([['common.iff', common]]) });

    expect(errors).toHaveLength(0);
    const iff = model as IFFModel;
    iff.nodes.forEach((node, index) => {
      node.x = 100 + index * 50;
      node.y = 200;
    });

    try {
      await saveIFF(dsl, iff);

      expect(saved).toContain('@include common.iff');
      expect(saved).not.toContain('@location-types');
      expect(saved).toContain('@position cis 100 200');
      expect(saved).toContain('@position syncer 150 200');
    } finally {
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
    }
  });
});
