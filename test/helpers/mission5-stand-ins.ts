// SPDX-License-Identifier: EPL-2.0
// Stand-ins for the algorithms the TS registry lacks until mission 5 (G3: `fixed`, `box`, `random` are in the
// oracle's core registry). They carry the option support `Core.melk` declares and no layout code, so validation
// (`checkAlgorithmSupport`, the algorithm id check) behaves as with the real algorithms. Mission 5 deletes this
// file together with its callers' deferral filters.
import type { AbstractLayoutProvider } from '../../src/core/AbstractLayoutProvider.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from '../../src/core/data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { IFactory } from '../../src/core/util/IFactory.js';

const ELK_PREFIX = 'org.eclipse.elk.';

/** The option ids (suffixes) each deferred algorithm supports, from `Core.melk` (ids absent from the registry are dropped). */
export const SUPPORTED_BY_ALGORITHM: ReadonlyMap<string, readonly string[]> = new Map([
  [
    'fixed',
    ['padding', 'position', 'bendPoints', 'nodeSize.constraints', 'nodeSize.minimum', 'nodeSize.fixedGraphSize'],
  ],
  [
    'box',
    [
      'padding',
      'spacing.nodeNode',
      'priority',
      'expandNodes',
      'nodeSize.constraints',
      'nodeSize.options',
      'aspectRatio',
      'interactive',
      'nodeSize.minimum',
      'box.packingMode',
      'contentAlignment',
    ],
  ],
  ['random', ['padding', 'spacing.nodeNode', 'randomSeed', 'aspectRatio']],
]);

/** The suffixes of the stand-in algorithms (`MISSION5_ALGORITHMS`). */
export const MISSION5_ALGORITHMS: readonly string[] = [...SUPPORTED_BY_ALGORITHM.keys()];

const STUB_FACTORY: IFactory<AbstractLayoutProvider> = {
  create: () => ({}) as AbstractLayoutProvider,
  destroy: () => undefined,
};

/** Registers stand-ins for the mission 5 algorithms with the option support `Core.melk` declares. */
export function registerMission5StandIns(): void {
  const service = LayoutMetaDataService.getInstance();
  const provider: ILayoutMetaDataProvider = {
    apply: (registry) => {
      for (const [suffix, supported] of SUPPORTED_BY_ALGORITHM) {
        const id = `${ELK_PREFIX}${suffix}`;
        registry.register(new LayoutAlgorithmData.Builder().id(id).name(suffix).providerFactory(STUB_FACTORY).create());
        for (const option of supported) {
          const data = service.getOptionData(`${ELK_PREFIX}${option}`);
          if (data !== null) {
            registry.addOptionSupport(id, data.getId(), null);
          }
        }
      }
    },
  };
  service.registerLayoutMetaDataProviders(provider);
}

/** Runs `fn` with the stand-ins registered, then reloads the plain registry (a registration cannot be undone). */
export function withMission5StandIns<T>(fn: () => T): T {
  registerMission5StandIns();
  try {
    return fn();
  } finally {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  }
}
