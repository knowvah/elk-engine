// SPDX-License-Identifier: EPL-2.0
// Drives every `converter` row of test/golden/refs/java/graph-json.json (ELK on the oracle JVM, isolated
// CoreOptions-only LayoutMetaDataService): the compact `JsonElement.toString()` text, or the exception.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { ILayoutMetaData } from '../../core/data/ILayoutMetaData.js';
import { LayoutAlgorithmData } from '../../core/data/LayoutAlgorithmData.js';
import { LayoutCategoryData } from '../../core/data/LayoutCategoryData.js';
import { LayoutOptionData } from '../../core/data/LayoutOptionData.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { GraphFeature } from '../../graph/properties/GraphFeature.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { JsonMetaDataConverter } from './JsonMetaDataConverter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/graph-json.json', import.meta.url);
const KIND_OPTION = 'option';
const KIND_CATEGORY = 'category';
const KIND_ALGORITHM = 'algorithm';
const KIND_UNHANDLED = 'unhandled';
const KIND_NULL = 'null';

interface ConverterRow {
  readonly kind: string;
  readonly id: string | null;
  readonly text?: string;
  readonly throws?: { readonly class: string; readonly message: string };
}

/**
 * Deferred to mission 5: the providers of these are held back (CoreOptions.ts:2961-2963; docs/conformance.md:334-340),
 * so the TS service lacks them. The id-set test asserts their absence and fails once mission 5 registers them,
 * prompting removal of this filter.
 */
const MISSION5_PROVIDERS = {
  [KIND_ALGORITHM]: ['org.eclipse.elk.fixed', 'org.eclipse.elk.box', 'org.eclipse.elk.random'],
  [KIND_CATEGORY]: [''],
} as const;

function isDeferred(row: ConverterRow): boolean {
  const deferred: readonly (string | null)[] = MISSION5_PROVIDERS[row.kind as keyof typeof MISSION5_PROVIDERS] ?? [];
  return deferred.includes(row.id);
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { converter: ConverterRow[] }).converter;

/** The recording's anonymous ILayoutMetaData: none of the three handled types, `toString` is "CustomMetaData". */
const customMetaData: ILayoutMetaData & { toString(): string } = {
  getId: () => 'custom.metadata',
  getName: () => 'Custom',
  getDescription: () => 'none of the three',
  toString: () => 'CustomMetaData',
};

function dataFor(row: ConverterRow): ILayoutMetaData | null {
  const service = LayoutMetaDataService.getInstance();
  const id = row.id as string;
  switch (row.kind) {
    case KIND_OPTION:
      return service.getOptionData(id);
    case KIND_CATEGORY:
      return service.getCategoryData(id);
    case KIND_ALGORITHM:
      return service.getAlgorithmData(id);
    case KIND_UNHANDLED:
      return customMetaData;
    default:
      return null;
  }
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('JsonMetaDataConverter', () => {
  it('has the recorded rows for every kind', () => {
    const kinds = new Set(rows.map((r) => r.kind));
    expect(kinds).toEqual(new Set([KIND_OPTION, KIND_CATEGORY, KIND_ALGORITHM, KIND_UNHANDLED, KIND_NULL]));
    expect(rows.filter((r) => r.kind === KIND_OPTION)).toHaveLength(94);
  });

  it('registers the recorded ids except the mission 5 providers, which are absent', () => {
    const service = LayoutMetaDataService.getInstance();
    const recorded = (kind: string): string[] =>
      rows.filter((r) => r.kind === kind && !isDeferred(r)).map((r) => r.id as string);
    const options = service.getOptionData().map((o) => o.getId());
    const categories = service.getCategoryData().map((c) => c.getId());
    const algorithms = service.getAlgorithmData().map((a) => a.getId());
    expect(options).toEqual(recorded(KIND_OPTION));
    expect(categories).toEqual(recorded(KIND_CATEGORY));
    expect(algorithms).toEqual(recorded(KIND_ALGORITHM));
    expect(rows.filter(isDeferred)).toHaveLength(4);
    expect(categories).not.toContain('');
    for (const id of MISSION5_PROVIDERS[KIND_ALGORITHM]) expect(algorithms).not.toContain(id);
  });

  describe.each(rows.filter((r) => !isDeferred(r)).map((r) => [`${r.kind} ${r.id}`, r] as const))(
    '%s',
    (_label, row) => {
      it('matches the recorded outcome', () => {
        const data = dataFor(row);
        if (row.throws !== undefined) {
          expect(row.throws.class).toBe('java.lang.IllegalArgumentException');
          let caught: unknown;
          try {
            JsonMetaDataConverter.toJson(data as ILayoutMetaData);
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(IllegalArgumentException);
          expect((caught as Error).message).toBe(row.throws.message);
        } else {
          expect(data).not.toBeNull();
          expect(JsonMetaDataConverter.toJson(data as ILayoutMetaData).toString()).toBe(row.text);
        }
      });
    },
  );
});

describe('branches no CoreOptions-only row reaches (expected text from JsonMetaDataConverter.xtend)', () => {
  it('writes the category, known options and supported features of an algorithm and the layouters of a category', () => {
    const service = LayoutMetaDataService.getInstance();
    const features = EnumSet.noneOf(GraphFeature);
    features.add(GraphFeature.PORTS);
    features.add(GraphFeature.COMPOUND);
    const algorithm = new LayoutAlgorithmData.Builder()
      .id('t.alg')
      .name('Alg')
      .category('t.cat')
      .supportedFeatures(features)
      .providerFactory({ create: () => ({}) as never, destroy: () => undefined })
      .create();
    algorithm.addKnownOption(CoreOptions.PADDING, null);
    const category = new LayoutCategoryData.Builder().id('t.cat').name('Cat').create();
    service.registerLayoutMetaDataProviders({
      apply: (registry) => {
        registry.register(category);
        registry.register(algorithm);
      },
    });
    expect(JsonMetaDataConverter.toJson(algorithm).toString()).toBe(
      '{"id":"t.alg","name":"Alg","category":"t.cat","knownOptions":["org.eclipse.elk.padding"],' +
        '"supportedFeatures":["PORTS","COMPOUND"]}',
    );
    expect(JsonMetaDataConverter.toJson(category).toString()).toBe(
      '{"id":"t.cat","name":"Cat","knownLayouters":["t.alg"]}',
    );
  });
});

describe('absent optional parts', () => {
  const stubFactory = { create: () => ({}) as never, destroy: () => undefined };

  it('omits name, description, category, options, features, layouters, group, type and targets when absent', () => {
    const algorithm = new LayoutAlgorithmData.Builder().id('t.bare').providerFactory(stubFactory).create();
    expect(JsonMetaDataConverter.toJson(algorithm).toString()).toBe('{"id":"t.bare"}');
    expect(JsonMetaDataConverter.toJson(new LayoutCategoryData.Builder().id('t.c').create()).toString()).toBe(
      '{"id":"t.c"}',
    );
    const option = new LayoutOptionData.Builder().id('t.o').create();
    expect(JsonMetaDataConverter.toJson(option).toString()).toBe('{"id":"t.o"}');
  });
});

describe('null results of the accessors (Xtend: `!== null` and `nullOrEmpty` guards skip the member)', () => {
  const stubFactory = { create: () => ({}) as never, destroy: () => undefined };
  const NULL = null as unknown;

  it('omits the id when it is null', () => {
    const category = new LayoutCategoryData.Builder().id('t.c').name('N').create();
    vi.spyOn(category, 'getId').mockReturnValue(NULL as string);
    expect(JsonMetaDataConverter.toJson(category).toString()).toBe('{"name":"N"}'); // createCommon: id guard
  });

  it('treats null known options and null supported features as empty', () => {
    const algorithm = new LayoutAlgorithmData.Builder().id('t.a').providerFactory(stubFactory).create();
    vi.spyOn(algorithm, 'getKnownOptionIds').mockReturnValue(NULL as Set<string>);
    vi.spyOn(algorithm, 'getSupportedFeatures').mockReturnValue(NULL as EnumSet<GraphFeature>);
    expect(JsonMetaDataConverter.toJson(algorithm).toString()).toBe('{"id":"t.a"}');
  });

  it('treats null layouters as empty and skips a layouter without id', () => {
    const category = new LayoutCategoryData.Builder().id('t.c').create();
    vi.spyOn(category, 'getLayouters').mockReturnValue(NULL as LayoutAlgorithmData[]);
    expect(JsonMetaDataConverter.toJson(category).toString()).toBe('{"id":"t.c"}');
    const nameless = new LayoutAlgorithmData.Builder().id('t.l').providerFactory(stubFactory).create();
    vi.spyOn(nameless, 'getId').mockReturnValue(NULL as string);
    vi.spyOn(category, 'getLayouters').mockReturnValue([nameless]);
    // knownLayouters is added before the loop, so it stays an empty array
    expect(JsonMetaDataConverter.toJson(category).toString()).toBe('{"id":"t.c","knownLayouters":[]}');
  });

  it('treats null targets as empty', () => {
    const option = new LayoutOptionData.Builder().id('t.o').create();
    vi.spyOn(option, 'getTargets').mockReturnValue(NULL as ReturnType<LayoutOptionData['getTargets']>);
    expect(JsonMetaDataConverter.toJson(option).toString()).toBe('{"id":"t.o"}');
  });
});
