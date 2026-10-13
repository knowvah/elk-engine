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
  it('records the calls of (i) minus the held-back registrations', () => {
    const recorder = new RecordingRegistry();
    new CoreOptions().apply(recorder);
    const expected = withoutHeldBackCalls(dumpCalls(CORE_OPTIONS_CLASS, ALL_CALLS));
    expect(firstDifference(recorder.calls, expected, 'calls')).toBeNull();
    expect(recorder.calls).toHaveLength(expected.length);
    expect(recorder.calls.some((call) => call.call === 'registerAlgorithm')).toBe(false);
    expect(dumpCalls(CORE_OPTIONS_CLASS, ALL_CALLS).length - expected.length).toBeGreaterThan(
      HELD_BACK_ALGORITHM_IDS.length,
    );
  });

  it('registers Core and Labels in the service exactly as the dump (ii) minus held-back effects and the backup category', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(new LabelManagementOptions());
    const expected = withoutHeldBackService(loadDumpService());
    expect(firstDifference(dumpService(service), expected, 'service')).toBeNull();
    expect(service.getOptionData()).toHaveLength(expected.options.length);
    expect(service.getCategoryData().some((category) => category.getId() === BACKUP_CATEGORY_ID)).toBe(false);
  });

  it('is what the generator emits, byte for byte (C6 freshness)', async () => {
    const output = await generate({ bundles: ['Core'], write: false });
    expect([...output.keys()]).toEqual([CORE_OPTIONS_FILE]);
    expect(output.get(CORE_OPTIONS_FILE)).toBe(readFileSync(join(REPOSITORY_ROOT, CORE_OPTIONS_FILE), 'utf8'));
  });

  it('evaluates as a module of its own: the import cycle is not used at load time', async () => {
    vi.resetModules();
    // CoreOptions is the first module of the graph: it loads IndividualSpacings, which loads the service, which
    // loads CoreOptions again while it is still being evaluated.
    const module: Record<string, unknown> = await import('../../src/core/options/CoreOptions.js');
    expect(typeof module['CoreOptions']).toBe('function');
  });
});
