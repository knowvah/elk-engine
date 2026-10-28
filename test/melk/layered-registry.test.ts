// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RegistryCall } from '../../tools/melk/model-value.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
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
 * with `forward` it also forwards dependencies and option supports. It collects the options whose default the landed
 * recorder cannot encode (`List<Integer>`: no INT/DOUBLE option type tells an int from a double).
 */
class ShapePrimer implements ILayoutMetaDataProvider.Registry {
  readonly unencodable: LayoutOptionData[] = [];
  readonly unencodableSupports: string[] = [];

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

  addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void {
    if (!this.forward) {
      return;
    }
    try {
      this.recorder.addOptionSupport(algorithm, option, defaultValue);
    } catch {
      // the support's default is the same unencodable List<Integer>; it is compared with the dump separately
      this.unencodableSupports.push(option);
    }
  }
}

function isEnforcedGroupOrders(call: RegistryCall): boolean {
  return call.call === 'registerOption' && call.data.id === ENFORCED_GROUP_ORDERS;
}

function isEnforcedGroupOrdersSupport(call: RegistryCall): boolean {
  return call.call === 'addOptionSupport' && call.option === ENFORCED_GROUP_ORDERS;
}

/** The dump's calls without the option and the support the landed recorder cannot encode. */
function encodable(calls: readonly RegistryCall[]): RegistryCall[] {
  return calls.filter((call) => !isEnforcedGroupOrders(call) && !isEnforcedGroupOrdersSupport(call));
}

/** Records `apply` of a provider on top of a recorder primed with the core options, returning the layered calls. */
function recordApply(provider: ILayoutMetaDataProvider): {
  calls: RegistryCall[];
  unencodable: string[];
  unencodableSupports: string[];
} {
  const recorder = new RecordingRegistry();
  new CoreOptions().apply(recorder);
  const primer = new ShapePrimer(recorder);
  new LayeredMetaDataProvider().apply(primer);
  const primed = recorder.calls.length;
  const forwarding = new ShapePrimer(recorder, true);
  provider.apply(forwarding);
  return {
    calls: recorder.calls.slice(primed),
    unencodable: forwarding.unencodable.map((data) => data.getId()),
    unencodableSupports: forwarding.unencodableSupports,
  };
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

/**
 * The service seen through a view without the option (and the algorithm's support of it) that the recorder cannot
 * encode: `dumpService` registers every option and known option with the recorder.
 */
function withoutEnforcedGroupOrders(service: LayoutMetaDataService): LayoutMetaDataService {
  const algorithms = service.getAlgorithmData().map((algorithm) =>
    Object.create(algorithm, {
      getKnownOptionIds: {
        value: (): string[] => [...algorithm.getKnownOptionIds()].filter((id) => id !== ENFORCED_GROUP_ORDERS),
      },
    }),
  );
  return Object.create(service, {
    getOptionData: {
      value: (): LayoutOptionData[] =>
        service.getOptionData().filter((option) => option.getId() !== ENFORCED_GROUP_ORDERS),
    },
    getAlgorithmData: { value: (): unknown[] => algorithms },
  }) as LayoutMetaDataService;
}

function withoutKnownOption(dump: ServiceDump): ServiceDump {
  return {
    ...dump,
    options: dump.options.filter((option) => option['id'] !== ENFORCED_GROUP_ORDERS),
    algorithms: dump.algorithms.map((algorithm) => ({
      ...algorithm,
      knownOptions: (algorithm['knownOptions'] as { id: string }[]).filter(
        (known) => known.id !== ENFORCED_GROUP_ORDERS,
      ),
    })),
  };
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
    const { calls, unencodable, unencodableSupports } = recordApply(new LayeredMetaDataProvider());
    const expected = encodable(dumpCalls(PROVIDER_CLASS, ALL_CALLS));
    expect(unencodable).toEqual([ENFORCED_GROUP_ORDERS]);
    expect(unencodableSupports).toEqual([ENFORCED_GROUP_ORDERS]);
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
  });

  it('records the calls of LayeredOptions as (i) of metadata.json: the algorithm and its option supports', () => {
    const { calls, unencodableSupports } = recordApply(new LayeredOptions());
    const expected = encodable(dumpCalls(LAYERED_OPTIONS_CLASS, ALL_CALLS));
    expect(unencodableSupports).toEqual([ENFORCED_GROUP_ORDERS]);
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      LAYERED_ALGORITHM_ID,
    ]);
  });

  it('registers the List<Integer> default the recorder cannot encode with the dump items', () => {
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
    const actual = dumpService(withoutEnforcedGroupOrders(service));
    expect(firstDifference(actual, withoutKnownOption(expected), 'service')).toBeNull();
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
