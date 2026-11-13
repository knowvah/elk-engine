// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { TopdownpackingMetaDataProvider } from '../../src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
import { TopdownpackingOptions } from '../../src/alg/topdownpacking/options/TopdownpackingOptions.js';
import { NodeArrangementStrategy } from '../../src/alg/topdownpacking/NodeArrangementStrategy.js';
import { TopdownpackingLayoutProvider } from '../../src/alg/topdownpacking/TopdownpackingLayoutProvider.js';
import { WhitespaceEliminationStrategy } from '../../src/alg/topdownpacking/WhitespaceEliminationStrategy.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_PATH = 'src/alg/topdownpacking/options/TopdownpackingOptions.ts';
const PROVIDER_PATH = 'src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider';
const OPTIONS_CLASS = 'org.eclipse.elk.alg.topdownpacking.options.TopdownpackingOptions';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const DUMPED_OPTION_IDS = [
  'org.eclipse.elk.topdownpacking.nodeArrangement.strategy',
  'org.eclipse.elk.topdownpacking.whitespaceElimination.strategy',
];

describe('TopdownpackingOptions and TopdownpackingMetaDataProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for Topdownpacking (freshness)', async () => {
    const output = await generate({ bundles: ['Topdownpacking'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    expect(optionIds(expected)).toEqual(DUMPED_OPTION_IDS);
    const optionCalls = recordProvider(new TopdownpackingMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of TopdownpackingMetaDataProvider as (i) of metadata.json, option supports included', () => {
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    const calls = recordProvider(new TopdownpackingMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of TopdownpackingOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const expected = dumpCalls(OPTIONS_CLASS, ALL_CALLS);
    const calls = recordProvider(new TopdownpackingOptions(), new TopdownpackingMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      TopdownpackingOptions.ALGORITHM_ID,
    ]);
    expect(TopdownpackingOptions.ALGORITHM_ID).toBe('org.eclipse.elk.topdownpacking');
  });

  it('registers a factory that constructs the staged TopdownpackingLayoutProvider', () => {
    expect(new TopdownpackingOptions.TopdownpackingFactory().create()).toBeInstanceOf(TopdownpackingLayoutProvider);
  });

  it('exposes the option constants with the dump defaults', () => {
    expect(TopdownpackingMetaDataProvider.NODE_ARRANGEMENT_STRATEGY.getDefault()).toBe(
      NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER,
    );
    expect(TopdownpackingMetaDataProvider.WHITESPACE_ELIMINATION_STRATEGY.getDefault()).toBe(
      WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR,
    );
  });
});
