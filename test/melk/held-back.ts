// SPDX-License-Identifier: EPL-2.0
import type { RegistryCall } from '../../tools/melk/model-value.js';

/**
 * The registrations decision C1 still holds back: none (`fixed` was un-held in T8, `random` in T10, `box` in T12, the
 * `topdown.sizeCategories` dependency on `TopdownSizeApproximator` in T14). The filters below stay as identities over
 * this empty list so the registry comparisons keep their shape.
 */
export const HELD_BACK_ALGORITHM_IDS: readonly string[] = [];

/** The id of the category the registry creates for algorithms without one (`fixed` and `random` are in it; so are held-back ones). */
export const BACKUP_CATEGORY_ID = '';

function isHeldBackCall(call: RegistryCall): boolean {
  switch (call.call) {
    case 'registerAlgorithm':
      return HELD_BACK_ALGORITHM_IDS.includes(call.data.id);
    case 'addOptionSupport':
      return HELD_BACK_ALGORITHM_IDS.includes(call.algorithm);
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

/**
 * Removes the held-back registrations and their derived effects from the service dump (ii): the algorithms (and with
 * them their known options), their entries in the category layouter lists (the backup category stays: `fixed`, `random` and `box` have no
 * category either).
 */
export function withoutHeldBackService(service: ServiceDump): ServiceDump {
  return {
    options: service.options,
    categories: service.categories.map((category) => ({
      ...category,
      layouters: (category['layouters'] as readonly string[]).filter((id) => !HELD_BACK_ALGORITHM_IDS.includes(id)),
    })),
    algorithms: service.algorithms.filter((algorithm) => !HELD_BACK_ALGORITHM_IDS.includes(algorithm['id'] as string)),
  };
}
