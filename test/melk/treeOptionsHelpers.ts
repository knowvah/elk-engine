// SPDX-License-Identifier: EPL-2.0
import type { RegistryCall } from '../../tools/melk/model-value.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { OPTION_MODEL_CALLS } from './helpers.js';
import { RecordingRegistry } from './recorder.js';

type MetaData = Parameters<RecordingRegistry['register']>[0];

/** Teaches the recorder each option's shape and drops dependencies (a dependency may name a later option). */
class ShapePrimer implements ILayoutMetaDataProvider.Registry {
  constructor(private readonly recorder: RecordingRegistry) {}

  register(data: MetaData): void {
    this.recorder.register(data);
  }

  addDependency(): void {}

  addOptionSupport(): void {}
}

/**
 * The calls `provider.apply` makes (options, dependencies, algorithm, option supports), recorded after a shape-priming
 * pass over `shapes` (default: the provider itself) on top of the core options, as for Layered.
 */
export function recordProvider(
  provider: ILayoutMetaDataProvider,
  shapes: ILayoutMetaDataProvider = provider,
): RegistryCall[] {
  const recorder = new RecordingRegistry();
  new CoreOptions().apply(recorder);
  shapes.apply(new ShapePrimer(recorder));
  const primed = recorder.calls.length;
  provider.apply(recorder);
  return recorder.calls.slice(primed);
}

/** The ids of the `registerOption` calls. */
export function optionIds(calls: readonly RegistryCall[]): string[] {
  return calls.flatMap((call) => (call.call === 'registerOption' ? [call.data.id] : []));
}

/** Every call kind the dump records. */
export const ALL_CALLS: readonly RegistryCall['call'][] = [
  ...OPTION_MODEL_CALLS,
  'registerAlgorithm',
  'addOptionSupport',
];
