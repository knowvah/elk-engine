// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { OptimizationGoal } from '../../src/alg/rectpacking/options/OptimizationGoal.js';
import { RectPackingMetaDataProvider } from '../../src/alg/rectpacking/options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from '../../src/alg/rectpacking/options/RectPackingOptions.js';
import { WidthApproximationStrategy } from '../../src/alg/rectpacking/p1widthapproximation/WidthApproximationStrategy.js';
import { PackingStrategy } from '../../src/alg/rectpacking/p2packing/PackingStrategy.js';
import { WhiteSpaceEliminationStrategy } from '../../src/alg/rectpacking/p3whitespaceelimination/WhiteSpaceEliminationStrategy.js';
import { RectPackingLayoutProvider } from '../../src/alg/rectpacking/RectPackingLayoutProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_PATH = 'src/alg/rectpacking/options/RectPackingOptions.ts';
const PROVIDER_PATH = 'src/alg/rectpacking/options/RectPackingMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider';
const OPTIONS_CLASS = 'org.eclipse.elk.alg.rectpacking.options.RectPackingOptions';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ID_PREFIX = 'org.eclipse.elk.rectpacking.';
const DUMPED_OPTIONS = [
  'trybox',
  'currentPosition',
  'desiredPosition',
  'inNewRow',
  'orderBySize',
  'widthApproximation.strategy',
  'widthApproximation.targetWidth',
  'widthApproximation.optimizationGoal',
  'widthApproximation.lastPlaceShift',
  'packing.strategy',
  'packing.compaction.rowHeightReevaluation',
  'packing.compaction.iterations',
  'whiteSpaceElimination.strategy',
];

describe('RectPackingOptions and RectPackingMetaDataProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for RectPacking (freshness)', async () => {
    const output = await generate({ bundles: ['RectPacking'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    expect(optionIds(expected)).toEqual(DUMPED_OPTIONS.map((name) => `${ID_PREFIX}${name}`));
    const optionCalls = recordProvider(new RectPackingMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of RectPackingMetaDataProvider as (i) of metadata.json, option supports included', () => {
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    const calls = recordProvider(new RectPackingMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of RectPackingOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const expected = dumpCalls(OPTIONS_CLASS, ALL_CALLS);
    const calls = recordProvider(new RectPackingOptions(), new RectPackingMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      RectPackingOptions.ALGORITHM_ID,
    ]);
    expect(RectPackingOptions.ALGORITHM_ID).toBe('org.eclipse.elk.rectpacking');
  });

  it('registers a factory that constructs the staged RectPackingLayoutProvider', () => {
    expect(new RectPackingOptions.RectpackingFactory().create()).toBeInstanceOf(RectPackingLayoutProvider);
  });

  it('exposes the option constants with the dump ids and defaults', () => {
    expect(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY.getId()).toBe(`${ID_PREFIX}widthApproximation.strategy`);
    expect(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY.getDefault()).toBe(WidthApproximationStrategy.GREEDY);
    expect(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL.getDefault()).toBe(
      OptimizationGoal.MAX_SCALE_DRIVEN,
    );
    expect(RectPackingOptions.PACKING_STRATEGY.getDefault()).toBe(PackingStrategy.COMPACTION);
    expect(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY.getDefault()).toBe(WhiteSpaceEliminationStrategy.NONE);
    expect(RectPackingOptions.TRYBOX.getDefault()).toBe(false);
    expect(RectPackingOptions.CURRENT_POSITION.getDefault()).toBe(-1);
  });
});

describe('RectPacking option enums', () => {
  it('keep the Java constants, order and names', () => {
    expect(OptimizationGoal.values().map((c) => c.name())).toEqual([
      'ASPECT_RATIO_DRIVEN',
      'MAX_SCALE_DRIVEN',
      'AREA_DRIVEN',
    ]);
    expect(WidthApproximationStrategy.values().map((c) => c.name())).toEqual(['GREEDY', 'TARGET_WIDTH']);
    expect(PackingStrategy.values().map((c) => c.name())).toEqual(['COMPACTION', 'SIMPLE', 'NONE']);
    expect(WhiteSpaceEliminationStrategy.values().map((c) => c.name())).toEqual([
      'EQUAL_BETWEEN_STRUCTURES',
      'TO_ASPECT_RATIO',
      'NONE',
    ]);
  });
});
