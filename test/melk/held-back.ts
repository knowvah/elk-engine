// SPDX-License-Identifier: EPL-2.0
import type { RegistryCall } from '../../tools/melk/model-value.js';

/**
 * The registrations decision C1 holds back until mission 5, and nothing else: the three algorithms whose providers
 * are not ported (with their supports), and the `topdown.sizeCategories` dependency on `TopdownSizeApproximator`.
 */
export const HELD_BACK_ALGORITHM_IDS: readonly string[] = [
  'org.eclipse.elk.fixed',
  'org.eclipse.elk.box',
  'org.eclipse.elk.random',
];
export const HELD_BACK_DEPENDENCY_SOURCE = 'org.eclipse.elk.topdown.sizeCategories';
export const HELD_BACK_DEPENDENCY_TARGET = 'org.eclipse.elk.topdown.sizeApproximator';

/** The id of the category the registry creates for algorithms without one (it exists only for held-back ones). */
export const BACKUP_CATEGORY_ID = '';

function isHeldBackCall(call: RegistryCall): boolean {
  switch (call.call) {
    case 'registerAlgorithm':
      return HELD_BACK_ALGORITHM_IDS.includes(call.data.id);
    case 'addOptionSupport':
      return HELD_BACK_ALGORITHM_IDS.includes(call.algorithm);
    case 'addDependency':
      return call.source === HELD_BACK_DEPENDENCY_SOURCE && call.target === HELD_BACK_DEPENDENCY_TARGET;
    default:
      return false;
  }
}

/** Removes the held-back registrations from the calls of (i) of the dump. */
export function withoutHeldBackCalls(calls: readonly RegistryCall[]): RegistryCall[] {
  return calls.filter((call) => !isHeldBackCall(call));
}

/** The shape of the `service` section of the dump (T7 (ii)); the entries are JSON records. */
export interface ServiceDump {
  readonly options: readonly Record<string, unknown>[];
  readonly categories: readonly Record<string, unknown>[];
  readonly algorithms: readonly Record<string, unknown>[];
}

function withoutHeldBackDependency(option: Record<string, unknown>): Record<string, unknown> {
  if (option['id'] !== HELD_BACK_DEPENDENCY_SOURCE) {
    return option;
  }
  const dependencies = option['dependencies'] as readonly { target: string }[];
  return {
    ...option,
    dependencies: dependencies.filter((dependency) => dependency.target !== HELD_BACK_DEPENDENCY_TARGET),
  };
}

/**
 * Removes the held-back registrations and their derived effects from the service dump (ii): the algorithms (and with
 * them their known options), their entries in the category layouter lists, the dependency, and the backup category,
 * which the registry creates only because of the held-back algorithms (they have no category).
 */
export function withoutHeldBackService(service: ServiceDump): ServiceDump {
  return {
    options: service.options.map(withoutHeldBackDependency),
    categories: service.categories
      .filter((category) => category['id'] !== BACKUP_CATEGORY_ID)
      .map((category) => ({
        ...category,
        layouters: (category['layouters'] as readonly string[]).filter((id) => !HELD_BACK_ALGORITHM_IDS.includes(id)),
      })),
    algorithms: service.algorithms.filter((algorithm) => !HELD_BACK_ALGORITHM_IDS.includes(algorithm['id'] as string)),
  };
}
