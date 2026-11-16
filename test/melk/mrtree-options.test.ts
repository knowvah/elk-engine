// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { EdgeRoutingMode } from '../../src/alg/mrtree/options/EdgeRoutingMode.js';
import { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { OrderWeighting } from '../../src/alg/mrtree/options/OrderWeighting.js';
import { TreeifyingOrder } from '../../src/alg/mrtree/options/TreeifyingOrder.js';
import { TreeLayoutProvider } from '../../src/alg/mrtree/TreeLayoutProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_PATH = 'src/alg/mrtree/options/MrTreeOptions.ts';
const PROVIDER_PATH = 'src/alg/mrtree/options/MrTreeMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider';
const OPTIONS_CLASS = 'org.eclipse.elk.alg.mrtree.options.MrTreeOptions';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ID_PREFIX = 'org.eclipse.elk.mrtree.';

describe('MrTreeOptions and MrTreeMetaDataProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for Tree (freshness)', async () => {
    const output = await generate({ bundles: ['Tree'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    const optionCalls = recordProvider(new MrTreeMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of MrTreeMetaDataProvider as (i) of metadata.json, algorithm and option supports included', () => {
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    const calls = recordProvider(new MrTreeMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of MrTreeOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const expected = dumpCalls(OPTIONS_CLASS, ALL_CALLS);
    const calls = recordProvider(new MrTreeOptions(), new MrTreeMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      MrTreeOptions.ALGORITHM_ID,
    ]);
    expect(MrTreeOptions.ALGORITHM_ID).toBe('org.eclipse.elk.mrtree');
  });

  it('registers a factory that constructs a TreeLayoutProvider', () => {
    const provider = new MrTreeOptions.MrtreeFactory().create();
    expect(provider).toBeInstanceOf(TreeLayoutProvider);
  });

  it('exposes the option constants with the dump ids and enum defaults', () => {
    const ids = optionIds(dumpCalls(PROVIDER_CLASS, ['registerOption']));
    expect(ids).toEqual(
      [
        'compaction',
        'edgeEndTextureLength',
        'treeLevel',
        'positionConstraint',
        'weighting',
        'edgeRoutingMode',
        'searchOrder',
      ].map((name) => `${ID_PREFIX}${name}`),
    );
    expect(MrTreeOptions.WEIGHTING.getId()).toBe(`${ID_PREFIX}weighting`);
    expect(MrTreeOptions.WEIGHTING.getDefault()).toBe(OrderWeighting.MODEL_ORDER);
    expect(MrTreeOptions.EDGE_ROUTING_MODE.getDefault()).toBe(EdgeRoutingMode.AVOID_OVERLAP);
    expect(MrTreeOptions.SEARCH_ORDER.getDefault()).toBe(TreeifyingOrder.DFS);
    expect(MrTreeOptions.COMPACTION.getDefault()).toBe(false);
    expect(MrTreeOptions.EDGE_END_TEXTURE_LENGTH.getDefault()).toBe(7);
    expect(MrTreeOptions.TREE_LEVEL.getDefault()).toBe(0);
    expect(MrTreeOptions.POSITION_CONSTRAINT.getDefault()).toBe(-1);
  });

  it('loads without a TDZ error when imported before CoreOptions', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/mrtree/options/MrTreeOptions.js');
    expect(module.MrTreeOptions.SEARCH_ORDER.getId()).toBe(`${ID_PREFIX}searchOrder`);
    const core = await import('../../src/core/options/CoreOptions.js');
    expect(core.CoreOptions).toBeDefined();
  });
});
