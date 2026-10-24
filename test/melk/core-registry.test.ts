// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import type { RegistryCall } from '../../tools/melk/model-value.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { dumpCalls, firstDifference, METADATA_PATH } from './helpers.js';
import {
  BACKUP_CATEGORY_ID,
  HELD_BACK_ALGORITHM_IDS,
  withoutHeldBackCalls,
  withoutHeldBackService,
  type ServiceDump,
} from './held-back.js';
import { RecordingRegistry } from './recorder.js';

const CORE_OPTIONS_CLASS = 'org.eclipse.elk.core.options.CoreOptions';
const CORE_OPTIONS_FILE = 'src/core/options/CoreOptions.ts';
const FIXED_OPTIONS_FILE = 'src/core/options/FixedLayouterOptions.ts';
const BOX_OPTIONS_FILE = 'src/core/options/BoxLayouterOptions.ts';
const RANDOM_OPTIONS_FILE = 'src/core/options/RandomLayouterOptions.ts';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ALL_CALLS: readonly RegistryCall['call'][] = [
  'registerOption',
  'registerCategory',
  'addDependency',
  'registerAlgorithm',
  'addOptionSupport',
];

function loadDumpService(): ServiceDump {
  const parsed: unknown = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
  const service = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>)['service'] : null;
  if (typeof service !== 'object' || service === null) {
    throw new TypeError('metadata.json has no service section');
  }
  return service as ServiceDump;
}

/** The service state in the shape of the dump's `service` section (T7 (ii)), values encoded by the recorder. */
function dumpService(service: LayoutMetaDataService): ServiceDump {
  const recorder = new RecordingRegistry();
  const options = service.getOptionData();
  const optionRecords = options.map((option) => {
    recorder.register(option);
    return lastData(recorder);
  });
  const dependencies = options.map((option) =>
    option.getDependencies().map((pair) => {
      recorder.addDependency(option.getId(), pair.getFirst()?.getId() ?? '', pair.getSecond());
      const call = recorder.calls[recorder.calls.length - 1];
      return { target: pair.getFirst()?.getId(), value: call?.call === 'addDependency' ? call.value : undefined };
    }),
  );
  const categories = service.getCategoryData().map((category) => {
    recorder.register(category);
    return { ...lastData(recorder), layouters: category.getLayouters().map((layouter) => layouter.getId()) };
  });
  const algorithms = service.getAlgorithmData().map((algorithm) => {
    recorder.register(algorithm);
    const known = [...algorithm.getKnownOptionIds()].map((id) => {
      recorder.addOptionSupport(algorithm.getId(), id, algorithm.getDefaultValue(id));
      const call = recorder.calls[recorder.calls.length - 1];
      return { id, default: call?.call === 'addOptionSupport' ? call.default : undefined };
    });
    return { ...lastDataBefore(recorder, known.length), knownOptions: known };
  });
  return {
    options: optionRecords.map((record, i) => ({ ...record, dependencies: dependencies[i] })),
    categories,
    algorithms,
  };
}

function lastData(recorder: RecordingRegistry): Record<string, unknown> {
  const call = recorder.calls[recorder.calls.length - 1];
  return call !== undefined && 'data' in call ? { ...call.data } : {};
}

function lastDataBefore(recorder: RecordingRegistry, trailing: number): Record<string, unknown> {
  const call = recorder.calls[recorder.calls.length - 1 - trailing];
  return call !== undefined && 'data' in call ? { ...call.data } : {};
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  // The dump harness does the same before applying a provider to a recorder (cloning defaults needs it).
  LayoutMetaDataService.initElkReflect();
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('CoreOptions against the JVM dump', () => {
  it('records the calls of (i), nothing held back', () => {
    const recorder = new RecordingRegistry();
    new CoreOptions().apply(recorder);
    const expected = withoutHeldBackCalls(dumpCalls(CORE_OPTIONS_CLASS, ALL_CALLS));
    expect(firstDifference(recorder.calls, expected, 'calls')).toBeNull();
    expect(recorder.calls).toHaveLength(expected.length);
    const registered = recorder.calls.flatMap((call) => (call.call === 'registerAlgorithm' ? [call.data.id] : []));
    expect(registered).toEqual(['org.eclipse.elk.fixed', 'org.eclipse.elk.box', 'org.eclipse.elk.random']);
    // nothing is held back since T14: the live registry is the whole dump
    expect(expected).toHaveLength(dumpCalls(CORE_OPTIONS_CLASS, ALL_CALLS).length);
    expect(HELD_BACK_ALGORITHM_IDS).toEqual([]);
  });

  it('registers Core and Labels in the service exactly as the dump (ii) minus held-back effects and the backup category', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(new LabelManagementOptions());
    const expected = withoutHeldBackService(loadDumpService());
    expect(firstDifference(dumpService(service), expected, 'service')).toBeNull();
    expect(service.getOptionData()).toHaveLength(expected.options.length);
    // `fixed`, `box` and `random` have no category, so the registry creates the backup category for them.
    expect(service.getCategoryData().some((category) => category.getId() === BACKUP_CATEGORY_ID)).toBe(true);
  });

  it('is what the generator emits, byte for byte (C6 freshness)', async () => {
    const output = await generate({ bundles: ['Core'], write: false });
    expect([...output.keys()]).toEqual([CORE_OPTIONS_FILE, FIXED_OPTIONS_FILE, BOX_OPTIONS_FILE, RANDOM_OPTIONS_FILE]);
    for (const file of [CORE_OPTIONS_FILE, FIXED_OPTIONS_FILE, BOX_OPTIONS_FILE, RANDOM_OPTIONS_FILE]) {
      expect(output.get(file)).toBe(readFileSync(join(REPOSITORY_ROOT, file), 'utf8'));
    }
  });

  it('evaluates as a module of its own: the import cycle is not used at load time', async () => {
    vi.resetModules();
    // CoreOptions is the first module of the graph: it loads IndividualSpacings, which loads the service, which
    // loads CoreOptions again while it is still being evaluated.
    const module: Record<string, unknown> = await import('../../src/core/options/CoreOptions.js');
    expect(typeof module['CoreOptions']).toBe('function');
  });

  it.each([
    ['CoreOptions', '../../src/core/options/CoreOptions.js'],
    ['FixedLayouterOptions', '../../src/core/options/FixedLayouterOptions.js'],
  ])('M12: loads with %s as the entry module and creates each option constant once', async (_name, path) => {
    vi.resetModules();
    await import(/* @vite-ignore */ path);
    const { FixedLayouterOptions } = await import('../../src/core/options/FixedLayouterOptions.js');
    const { CoreOptions: Core } = await import('../../src/core/options/CoreOptions.js');
    expect(FixedLayouterOptions.POSITION).toBe(Core.POSITION);
    expect(FixedLayouterOptions.PADDING).toBe(FixedLayouterOptions.PADDING);
    expect(FixedLayouterOptions.PADDING.getId()).toBe('org.eclipse.elk.padding');
    expect(FixedLayouterOptions.PADDING).not.toBe(Core.PADDING);
  });

  it('M16: loads with TopdownSizeApproximator as the entry module and registers the sizeCategories dependency', async () => {
    vi.resetModules();
    // The enum imports CoreOptions, which names FIXED_INTEGER_RATIO_BOXES in a dependency constant: that constant is
    // lazy, so the enum, still evaluating, is not read in its temporal dead zone while CoreOptions loads.
    const { TopdownSizeApproximator } = await import('../../src/core/options/TopdownSizeApproximator.js');
    // The service of the fresh module graph registers CoreOptions (a recorder would see foreign classes here).
    const { LayoutMetaDataService: Service } = await import('../../src/core/data/LayoutMetaDataService.js');
    const option = Service.getInstance().getOptionData('org.eclipse.elk.topdown.sizeCategories');
    const [dependency] = option?.getDependencies() ?? [];
    expect(dependency?.getFirst()?.getId()).toBe('org.eclipse.elk.topdown.sizeApproximator');
    expect(dependency?.getSecond()).toBe(TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES);
    expect(TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES.name()).toBe('FIXED_INTEGER_RATIO_BOXES');
  });
});
