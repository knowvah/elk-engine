// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RegistryCall } from '../../tools/melk/model-value.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { diffCalls, dumpCalls, dumpService, firstDifference, OPTION_MODEL_CALLS } from './helpers.js';
import type { ServiceDump } from './held-back.js';
import { RecordingRegistry } from './recorder.js';

const LAYERED_OPTIONS_CLASS = 'org.eclipse.elk.alg.layered.options.LayeredOptions';
const PROVIDER_CLASS = 'org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider';
const LAYERED_ALGORITHM_ID = 'org.eclipse.elk.layered';
const ENFORCED_GROUP_ORDERS = 'org.eclipse.elk.layered.considerModelOrder.groupModelOrder.cmEnforcedGroupOrders';
const FRAMEWORK_PATH = join(import.meta.dirname, '../golden/refs/java/layered-framework.json');
const SERVICE_ROW_ID = 'metadata/service';
const ALL_CALLS: readonly RegistryCall['call'][] = [...OPTION_MODEL_CALLS, 'registerAlgorithm', 'addOptionSupport'];

type MetaData = Parameters<RecordingRegistry['register']>[0];

/**
 * Forwards registrations to a recorder. Priming (the default) teaches it each option's shape and drops the rest;
 * with `forward` it also forwards dependencies and option supports.
 */
class ShapePrimer implements ILayoutMetaDataProvider.Registry {
  constructor(
    private readonly recorder: RecordingRegistry,
    private readonly forward = false,
  ) {}

  register(data: MetaData): void {
    this.recorder.register(data);
  }

  addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void {
    if (this.forward) {
      this.recorder.addDependency(sourceOption, targetOption, requiredValue);
    }
  }

  addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void {
    if (this.forward) {
      this.recorder.addOptionSupport(algorithm, option, defaultValue);
    }
  }
}

function isEnforcedGroupOrders(call: RegistryCall): boolean {
  return call.call === 'registerOption' && call.data.id === ENFORCED_GROUP_ORDERS;
}

function isEnforcedGroupOrdersSupport(call: RegistryCall): boolean {
  return call.call === 'addOptionSupport' && call.option === ENFORCED_GROUP_ORDERS;
}

/** Records `apply` of a provider on top of a recorder primed with the core options, returning the layered calls. */
function recordApply(provider: ILayoutMetaDataProvider): RegistryCall[] {
  const recorder = new RecordingRegistry();
  new CoreOptions().apply(recorder);
  const primer = new ShapePrimer(recorder);
  new LayeredMetaDataProvider().apply(primer);
  const primed = recorder.calls.length;
  provider.apply(new ShapePrimer(recorder, true));
  return recorder.calls.slice(primed);
}

function loadFrameworkService(): ServiceDump {
  const parsed: unknown = JSON.parse(readFileSync(FRAMEWORK_PATH, 'utf8'));
  const rows = (parsed as { rows: { id: string; expected: unknown }[] }).rows;
  const row = rows.find((candidate) => candidate.id === SERVICE_ROW_ID);
  if (row === undefined) {
    throw new TypeError(`layered-framework.json has no ${SERVICE_ROW_ID} row`);
  }
  return row.expected as ServiceDump;
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.initElkReflect();
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('Layered registry against the JVM dump', () => {
  it('records the calls of LayeredMetaDataProvider as (i) of metadata.json', () => {
    const calls = recordApply(new LayeredMetaDataProvider());
    const expected = dumpCalls(PROVIDER_CLASS, ALL_CALLS);
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of LayeredOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const calls = recordApply(new LayeredOptions());
    const expected = dumpCalls(LAYERED_OPTIONS_CLASS, ALL_CALLS);
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      LAYERED_ALGORITHM_ID,
    ]);
  });

  it('registers the List<Integer> default with the dump items', () => {
    const dumped = dumpCalls(PROVIDER_CLASS, ['registerOption']).find(isEnforcedGroupOrders);
    const items = (dumped?.call === 'registerOption' ? dumped.data.default : null) as unknown as {
      items: { v: number }[];
    };
    const expectedDefault = items.items.map((item) => item.v);
    expect(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS.getDefault()).toEqual(
      expectedDefault,
    );
    const support = dumpCalls(LAYERED_OPTIONS_CLASS, ['addOptionSupport']).find(isEnforcedGroupOrdersSupport);
    const supported = (support?.call === 'addOptionSupport' ? support.default : null) as unknown as {
      items: { v: number }[];
    };
    expect(supported.items.map((item) => item.v)).toEqual(expectedDefault);
  });

  it('registers core, labels and layered in a fresh service exactly as the dump (ii) of layered-framework.json', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider());
    const expected = loadFrameworkService();
    const actual = dumpService(service);
    expect(firstDifference(actual, expected, 'service')).toBeNull();
    expect(service.getOptionData()).toHaveLength(expected.options.length);
    expect(service.getAlgorithmData(LAYERED_ALGORITHM_ID)?.getId()).toBe(LAYERED_ALGORITHM_ID);
  });

  it('getInstance() registers core and labels only; layered registers explicitly (C8, L5)', () => {
    const service = LayoutMetaDataService.getInstance();
    expect(
      service
        .getAlgorithmData()
        .map((algorithm) => algorithm.getId())
        .sort(),
    ).toEqual(['org.eclipse.elk.box', 'org.eclipse.elk.fixed', 'org.eclipse.elk.random']);
    expect(service.getOptionData(LayeredOptions.CYCLE_BREAKING_STRATEGY.getId())).toBeNull();
    expect(service.getAlgorithmData(LAYERED_ALGORITHM_ID)).toBeNull();
  });
});
