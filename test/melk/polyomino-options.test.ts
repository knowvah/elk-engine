// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SOURCES_DIRECTORY } from '../../tools/melk/config.js';
import { generate } from '../../tools/melk/generate.js';
import { HighLevelSortingCriterion } from '../../src/alg/common/compaction/options/HighLevelSortingCriterion.js';
import { LowLevelSortingCriterion } from '../../src/alg/common/compaction/options/LowLevelSortingCriterion.js';
import { PolyominoOptions } from '../../src/alg/common/compaction/options/PolyominoOptions.js';
import { TraversalStrategy } from '../../src/alg/common/compaction/options/TraversalStrategy.js';
import type { ILayoutMetaData } from '../../src/core/data/ILayoutMetaData.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';

const OUTPUT_PATH = 'src/alg/common/compaction/options/PolyominoOptions.ts';
const ID_PREFIX = 'org.eclipse.elk.polyomino.';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');

/** Option name, `.melk` default expression and target keyword, read from `Polyomino.melk` (not from the generator). */
interface MelkOption {
  readonly name: string;
  readonly type: string;
  readonly defaultExpression: string;
  readonly targets: string;
}

function readMelkOptions(): MelkOption[] {
  const text = readFileSync(join(SOURCES_DIRECTORY, 'Polyomino.melk'), 'utf8');
  const pattern = /option (\w+): (\w+) \{[\s\S]*?default = ([\w.]+)\s[\s\S]*?targets (\w+)\s*\}/g;
  return [...text.matchAll(pattern)].map((m) => ({
    name: m[1] ?? '',
    type: m[2] ?? '',
    defaultExpression: m[3] ?? '',
    targets: m[4] ?? '',
  }));
}

function registeredOptions(): LayoutOptionData[] {
  const options: LayoutOptionData[] = [];
  const registry: ILayoutMetaDataProvider.Registry = {
    register(data: ILayoutMetaData): void {
      if (data instanceof LayoutOptionData) {
        options.push(data);
      }
    },
  } as ILayoutMetaDataProvider.Registry;
  new PolyominoOptions().apply(registry);
  return options;
}

describe('PolyominoOptions', () => {
  it('matches what the generator emits for Polyomino (freshness)', async () => {
    const output = await generate({ bundles: ['Polyomino'], write: false });
    expect([...output.keys()]).toEqual([OUTPUT_PATH]);
    expect(output.get(OUTPUT_PATH)).toBe(readFileSync(join(REPOSITORY_ROOT, OUTPUT_PATH), 'utf8'));
  });

  it('reads four options from the .melk source', () => {
    expect(readMelkOptions().map((o) => o.name)).toEqual([
      'traversalStrategy',
      'lowLevelSort',
      'highLevelSort',
      'fill',
    ]);
  });

  it('registers every option with the id, default and target of the .melk source', () => {
    const expectedDefaults: Record<string, unknown> = {
      'TraversalStrategy.QUADRANTS_LINE_BY_LINE': TraversalStrategy.QUADRANTS_LINE_BY_LINE,
      'LowLevelSortingCriterion.BY_SIZE_AND_SHAPE': LowLevelSortingCriterion.BY_SIZE_AND_SHAPE,
      'HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST':
        HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST,
      true: true,
    };
    const melk = readMelkOptions();
    const registered = registeredOptions();
    expect(registered.map((o) => o.getId())).toEqual(melk.map((o) => `${ID_PREFIX}${o.name}`));
    melk.forEach((option, index) => {
      const data = registered[index];
      expect(data?.getDefault()).toBe(expectedDefaults[option.defaultExpression]);
      expect(option.targets).toBe('parents');
      expect([...(data?.getTargets() ?? [])].map((t) => t.toString())).toEqual(['PARENTS']);
    });
  });

  it('exposes the properties with the .melk ids and defaults', () => {
    expect(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY.getId()).toBe(`${ID_PREFIX}traversalStrategy`);
    expect(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY.getDefault()).toBe(TraversalStrategy.QUADRANTS_LINE_BY_LINE);
    expect(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT.getId()).toBe(`${ID_PREFIX}lowLevelSort`);
    expect(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT.getDefault()).toBe(LowLevelSortingCriterion.BY_SIZE_AND_SHAPE);
    expect(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT.getId()).toBe(`${ID_PREFIX}highLevelSort`);
    expect(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT.getDefault()).toBe(
      HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST,
    );
    expect(PolyominoOptions.POLYOMINO_FILL.getId()).toBe(`${ID_PREFIX}fill`);
    expect(PolyominoOptions.POLYOMINO_FILL.getDefault()).toBe(true);
  });

  it('loads without a TDZ error when imported before CoreOptions', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/common/compaction/options/PolyominoOptions.js');
    expect(module.PolyominoOptions.POLYOMINO_FILL.getId()).toBe(`${ID_PREFIX}fill`);
    const core = await import('../../src/core/options/CoreOptions.js');
    expect(core.CoreOptions).toBeDefined();
  });
});
