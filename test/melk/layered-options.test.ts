// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { RecordingRegistry } from './recorder.js';

const OPTIONS_PATH = 'src/alg/layered/options/LayeredOptions.ts';
const PROVIDER_PATH = 'src/alg/layered/options/LayeredMetaDataProvider.ts';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider';
const PENDING_PROVIDER = 'LayeredLayoutProvider';
const ENFORCED_GROUP_ORDERS = 'org.eclipse.elk.layered.considerModelOrder.groupModelOrder.cmEnforcedGroupOrders';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');

type MetaData = Parameters<RecordingRegistry['register']>[0];

/**
 * Forwards registrations to a recorder. Priming (the default) teaches it each option's shape and drops dependencies;
 * with `forward` it also forwards dependencies, and either way it collects the options whose default the landed
 * recorder cannot encode (a `List<Integer>`: it cannot tell an int from a double without an INT/DOUBLE option type).
 */
class ShapePrimer implements ILayoutMetaDataProvider.Registry {
  readonly unencodable: LayoutOptionData[] = [];

  constructor(
    private readonly recorder: RecordingRegistry,
    private readonly forward = false,
  ) {}

  register(data: MetaData): void {
    try {
      this.recorder.register(data);
    } catch (error) {
      if (!(data instanceof LayoutOptionData)) {
        throw error;
      }
      this.unencodable.push(data);
    }
  }

  addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void {
    if (this.forward) {
      this.recorder.addDependency(sourceOption, targetOption, requiredValue);
    }
  }

  addOptionSupport(): void {}
}

/**
 * Mission 7a (L7, X3): `LayeredLayoutProvider` is pending until T7, so `LayeredOptions` keeps its constants but
 * registers nothing; the bundle class registers every layered option, category and dependency as the oracle did.
 */
describe('LayeredOptions and LayeredMetaDataProvider', () => {
  // the service registers the ElkReflect clone functions that cloneable option defaults need
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for Layered (freshness)', async () => {
    const output = await generate({ bundles: ['Layered'], write: false });
    expect([...output.keys()].sort()).toEqual([OPTIONS_PATH, PROVIDER_PATH].sort());
    for (const path of [OPTIONS_PATH, PROVIDER_PATH]) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, category and dependency', () => {
    // Dependency values are encoded with their target option's shape, so the recorder must have seen every target
    // first: core options, and layered options registered after a dependency on them (`layerUnzipping.layerSplit`).
    const recorder = new RecordingRegistry();
    new CoreOptions().apply(recorder);
    const primer = new ShapePrimer(recorder);
    new LayeredMetaDataProvider().apply(primer);
    const coreCalls = recorder.calls.length;
    const skipping = new ShapePrimer(recorder, true);
    new LayeredMetaDataProvider().apply(skipping);
    // the dump's algorithm registrations (via LayeredOptions) are held back until T7
    const expected = dumpCalls(PROVIDER_CLASS, OPTION_MODEL_CALLS);
    expect(skipping.unencodable.map((data) => data.getId())).toEqual([ENFORCED_GROUP_ORDERS]);
    const encodable = expected.filter(
      (call) => !(call.call === 'registerOption' && call.data.id === ENFORCED_GROUP_ORDERS),
    );
    expect(diffCalls(recorder.calls.slice(coreCalls), encodable)).toBeNull();
  });

  it('registers the List<Integer> default the recorder cannot encode with the dump items', () => {
    const dumped = dumpCalls(PROVIDER_CLASS, ['registerOption']).find(
      (call) => call.call === 'registerOption' && call.data.id === ENFORCED_GROUP_ORDERS,
    );
    const items = (dumped?.call === 'registerOption' ? dumped.data.default : null) as unknown as {
      items: { v: number }[];
    };
    expect(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS.getDefault()).toEqual(
      items.items.map((item) => item.v),
    );
  });

  it('holds back the algorithm registrations, so none references the pending provider', () => {
    const recorder = new RecordingRegistry();
    new LayeredOptions().apply(recorder);
    expect(recorder.calls).toEqual([]);
    expect(dumpCalls(PROVIDER_CLASS, ['registerAlgorithm']).length).toBe(1);
    const generated = readFileSync(join(REPOSITORY_ROOT, OPTIONS_PATH), 'utf8');
    expect(generated).toContain(
      `// Held back (algorithm org.eclipse.elk.layered): the layout provider is pending type org.eclipse.elk.alg.layered.${PENDING_PROVIDER}.`,
    );
    expect(generated).not.toContain(`import { ${PENDING_PROVIDER} }`);
    expect(generated).not.toContain('class LayeredFactory');
  });

  it('exposes the algorithm id and option constants with the dump ids', () => {
    expect(LayeredOptions.ALGORITHM_ID).toBe('org.eclipse.elk.layered');
    const ids = dumpCalls(PROVIDER_CLASS, ['registerOption']).map((call) =>
      call.call === 'registerOption' ? call.data.id : '',
    );
    expect(ids).toContain(LayeredOptions.CYCLE_BREAKING_STRATEGY.getId());
    expect(ids).toContain(LayeredOptions.LAYERING_LAYER_CONSTRAINT.getId());
    expect(ids).toContain(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT.getId());
  });

  it('loads without a TDZ error when imported before CoreOptions', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/layered/options/LayeredOptions.js');
    expect(module.LayeredOptions.CYCLE_BREAKING_STRATEGY.getId()).toBe(
      'org.eclipse.elk.layered.cycleBreaking.strategy',
    );
    const core = await import('../../src/core/options/CoreOptions.js');
    expect(core.CoreOptions).toBeDefined();
  });

  it('loads without a TDZ error when entered through the non-leaf NodeFlexibility (NON_LEAF_DEFAULT_TYPES)', async () => {
    vi.resetModules();
    const module = await import('../../src/alg/layered/options/NodeFlexibility.js');
    const options = await import('../../src/alg/layered/options/LayeredOptions.js');
    expect(options.LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT.getDefault()).toBe(
      module.NodeFlexibility.NONE,
    );
    const generated = readFileSync(join(REPOSITORY_ROOT, PROVIDER_PATH), 'utf8').replace(/\s+/g, ' ');
    expect(generated).toContain(
      'private static get NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT_DEFAULT(): NodeFlexibility {',
    );
    expect(generated).toContain(
      'static get NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT(): IProperty<NodeFlexibility> {',
    );
  });
});
