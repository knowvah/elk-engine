// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { EdgeRoutingStrategy } from '../../src/alg/vertiflex/EdgeRoutingStrategy.js';
import { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
import { VertiFlexLayoutProvider } from '../../src/alg/vertiflex/VertiFlexLayoutProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_PATH = 'src/alg/vertiflex/options/VertiFlexOptions.ts';
const PROVIDER_PATH = 'src/alg/vertiflex/options/VertiFlexMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider';
const OPTIONS_CLASS = 'org.eclipse.elk.alg.vertiflex.options.VertiFlexOptions';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ID_PREFIX = 'org.eclipse.elk.vertiflex.';

describe('VertiFlexOptions and VertiFlexMetaDataProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for VertiFlex (freshness)', async () => {
    const output = await generate({ bundles: ['VertiFlex'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    expect(optionIds(expected)).toEqual(
      ['verticalConstraint', 'layoutStrategy', 'layerDistance', 'considerNodeModelOrder'].map(
        (name) => `${ID_PREFIX}${name}`,
      ),
    );
    const optionCalls = recordProvider(new VertiFlexMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of VertiFlexMetaDataProvider as (i) of metadata.json, algorithm and option supports included', () => {
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    const calls = recordProvider(new VertiFlexMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of VertiFlexOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const expected = dumpCalls(OPTIONS_CLASS, ALL_CALLS);
    const calls = recordProvider(new VertiFlexOptions(), new VertiFlexMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      VertiFlexOptions.ALGORITHM_ID,
    ]);
    expect(VertiFlexOptions.ALGORITHM_ID).toBe('org.eclipse.elk.vertiflex');
  });

  it('registers a factory whose create() returns a VertiFlexLayoutProvider', () => {
    const provider = new VertiFlexOptions.VertiflexFactory().create();
    expect(provider).toBeInstanceOf(VertiFlexLayoutProvider);
  });

  it('exposes the option constants with the dump ids and defaults', () => {
    expect(VertiFlexOptions.LAYOUT_STRATEGY.getId()).toBe(`${ID_PREFIX}layoutStrategy`);
    expect(VertiFlexOptions.LAYOUT_STRATEGY.getDefault()).toBe(EdgeRoutingStrategy.STRAIGHT);
    expect(VertiFlexOptions.LAYER_DISTANCE.getDefault()).toBe(50);
    expect(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER.getDefault()).toBe(true);
    expect(VertiFlexOptions.VERTICAL_CONSTRAINT.getId()).toBe(`${ID_PREFIX}verticalConstraint`);
  });

  it('loads without a TDZ error when imported before CoreOptions', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/vertiflex/options/VertiFlexOptions.js');
    expect(module.VertiFlexOptions.LAYER_DISTANCE.getId()).toBe(`${ID_PREFIX}layerDistance`);
    const core = await import('../../src/core/options/CoreOptions.js');
    expect(core.CoreOptions).toBeDefined();
  });
});
