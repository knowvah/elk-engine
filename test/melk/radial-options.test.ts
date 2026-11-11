// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { AnnulusWedgeCriteria } from '../../src/alg/radial/options/AnnulusWedgeCriteria.js';
import { CompactionStrategy } from '../../src/alg/radial/options/CompactionStrategy.js';
import { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
import { RadialOptions } from '../../src/alg/radial/options/RadialOptions.js';
import { RadialTranslationStrategy } from '../../src/alg/radial/options/RadialTranslationStrategy.js';
import { SortingStrategy } from '../../src/alg/radial/options/SortingStrategy.js';
import { RadialLayoutProvider } from '../../src/alg/radial/RadialLayoutProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_PATH = 'src/alg/radial/options/RadialOptions.ts';
const PROVIDER_PATH = 'src/alg/radial/options/RadialMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.radial.options.RadialMetaDataProvider';
const OPTIONS_CLASS = 'org.eclipse.elk.alg.radial.options.RadialOptions';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ID_PREFIX = 'org.eclipse.elk.radial.';
const DUMPED_OPTIONS = [
  'centerOnRoot',
  'orderId',
  'radius',
  'rotate',
  'compactor',
  'compactionStepSize',
  'sorter',
  'wedgeCriteria',
  'optimizationCriteria',
  'rotation.targetAngle',
  'rotation.computeAdditionalWedgeSpace',
  'rotation.outgoingEdgeAngles',
];

describe('RadialOptions and RadialMetaDataProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for Radial (freshness)', async () => {
    const output = await generate({ bundles: ['Radial'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    expect(optionIds(expected)).toEqual(DUMPED_OPTIONS.map((name) => `${ID_PREFIX}${name}`));
    expect(expected.filter((call) => call.call === 'addDependency')).toHaveLength(3);
    const optionCalls = recordProvider(new RadialMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of RadialMetaDataProvider as (i) of metadata.json, algorithm and option supports included', () => {
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    const calls = recordProvider(new RadialMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of RadialOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const expected = dumpCalls(OPTIONS_CLASS, ALL_CALLS);
    const calls = recordProvider(new RadialOptions(), new RadialMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      RadialOptions.ALGORITHM_ID,
    ]);
    expect(RadialOptions.ALGORITHM_ID).toBe('org.eclipse.elk.radial');
  });

  it('registers a factory that constructs the RadialLayoutProvider', () => {
    const provider = new RadialOptions.RadialFactory().create();
    expect(provider).toBeInstanceOf(RadialLayoutProvider);
  });

  it('exposes the option constants with the dump ids and enum defaults', () => {
    expect(RadialOptions.COMPACTOR.getId()).toBe(`${ID_PREFIX}compactor`);
    expect(RadialOptions.COMPACTOR.getDefault()).toBe(CompactionStrategy.NONE);
    expect(RadialOptions.SORTER.getDefault()).toBe(SortingStrategy.NONE);
    expect(RadialOptions.WEDGE_CRITERIA.getDefault()).toBe(AnnulusWedgeCriteria.NODE_SIZE);
    expect(RadialOptions.OPTIMIZATION_CRITERIA.getDefault()).toBe(RadialTranslationStrategy.NONE);
    expect(RadialOptions.COMPACTION_STEP_SIZE.getDefault()).toBe(1);
    expect(RadialOptions.ROTATE.getDefault()).toBe(false);
    expect(RadialOptions.RADIUS.getDefault()).toBe(0);
  });

  it('loads without a TDZ error when imported before CoreOptions', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/radial/options/RadialOptions.js');
    expect(module.RadialOptions.SORTER.getId()).toBe(`${ID_PREFIX}sorter`);
    const core = await import('../../src/core/options/CoreOptions.js');
    expect(core.CoreOptions).toBeDefined();
  });
});
