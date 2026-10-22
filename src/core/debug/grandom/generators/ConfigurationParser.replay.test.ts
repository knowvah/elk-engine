// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { Random } from '../../../../java/util/Random.js';
import { parse } from '../parser/GRandomParser.js';
import { ConfigurationParser } from './ConfigurationParser.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';

interface RecordedRandVal {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly stddv: number;
  readonly exact: number;
  readonly kind: 'exact' | 'minMax' | 'gaussian';
}
type RecordedValue = string | number | boolean | null | RecordedRandVal;
interface RecordedOption {
  readonly key: string;
  readonly value: RecordedValue;
}
interface SeededRow {
  readonly id: string;
  readonly input: string;
  readonly kind: 'seeded';
  readonly configs: readonly { readonly options: readonly RecordedOption[] }[];
}

const VECTORS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../test/golden/refs/java/grandom-generate.json',
);
/** Properties whose Java type is `Float`: the recorded `Float.toString` text round-trips through `fround`. */
const FLOAT_KEYS: ReadonlySet<string> = new Set(['HIERARCHY_CHANCE', 'HIERARCHY_NODES_FACTOR', 'HYPERNODE_CHANCE']);
const rows = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { rows: { kind: string }[] }).rows.filter(
  (row): row is SeededRow => row.kind === 'seeded',
);

/** Every public static `IProperty` field of `GeneratorOptions` in declaration order (Java reflection). */
function propertyFields(): [string, IProperty<unknown>][] {
  return Object.entries(GeneratorOptions).filter(
    (entry): entry is [string, IProperty<unknown>] => typeof (entry[1] as { getId?: unknown }).getId === 'function',
  );
}

function encodeRandVal(rv: RandVal): RecordedRandVal {
  const field = (name: string): number => Reflect.get(rv, name) as number;
  const kind = field('useExact') ? 'exact' : field('useMinMax') ? 'minMax' : 'gaussian';
  return {
    min: field('min_'),
    max: field('max_'),
    mean: field('mean'),
    stddv: field('stddv'),
    exact: field('exact_'),
    kind,
  };
}

function encode(key: string, value: unknown): RecordedValue {
  if (value === null) return null;
  if (value instanceof RandVal) return encodeRandVal(value);
  if (typeof value === 'object') return (value as { name(): string }).name();
  if (typeof value === 'number' && FLOAT_KEYS.has(key)) return Math.fround(value);
  return value as string | number | boolean;
}

function expectedValue(key: string, value: RecordedValue): RecordedValue {
  return typeof value === 'number' && FLOAT_KEYS.has(key) ? Math.fround(value) : value;
}

describe('ConfigurationParser replay of the JVM vectors', () => {
  it('replays 58 seeded rows holding 59 configurations', () => {
    expect(rows).toHaveLength(58);
    expect(rows.reduce((n, row) => n + row.configs.length, 0)).toBe(59);
  });

  it('samples-3 parses once and equals its single recorded options entry', () => {
    const row = rows.find((r) => r.id === 'samples-3')!;
    expect(row.configs).toHaveLength(1);
    const config = parse(row.input).model!.getConfigs()[0]!;
    expect(config.getSamples()).toBe(3);
  });

  for (const row of rows) {
    it(`${row.id}: options dump equals the recorded options`, () => {
      const model = parse(row.input).model;
      const configurations = model?.getConfigs() ?? [];
      expect(configurations).toHaveLength(row.configs.length);
      configurations.forEach((config, index) => {
        const seed = config.getSeed();
        expect(seed).not.toBeNull();
        const options = ConfigurationParser.parse(config, new Random(seed!));
        const actual = propertyFields().map(([key, property]) => ({
          key,
          value: encode(key, options.getProperty(property)),
        }));
        const expected = row.configs[index]!.options.map(({ key, value }) => ({
          key,
          value: expectedValue(key, value),
        }));
        expect(actual).toEqual(expected);
      });
    });
  }
});
