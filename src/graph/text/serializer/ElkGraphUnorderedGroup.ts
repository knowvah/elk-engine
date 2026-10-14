// SPDX-License-Identifier: EPL-2.0

import type { EObject } from '../../../emf/ecore/EObject.js';
import { ElkGraphTransientValueService, ValueTransient, type ElkFeature } from './ElkGraphTransientValueService.js';

/**
 * One member of an unordered group `(a? & b? & c? ...)` as the generic sequencer's NFA sees it: a state chain
 * (`incoming : ref`, `start : x , y`, ...) entered through its first state.
 */
export interface GroupMember<K> {
  readonly key: K;
  /** The first state can consume a value: its feature is not `ValueTransient.YES`. */
  readonly available: boolean;
  /** The first state's feature is `PREFERABLY` transient (unset, serialisable default). */
  readonly entryOptional: boolean;
  /** Some feature of the chain holds a value that must be written (`ValueTransient.NO`). */
  readonly required: boolean;
}

/**
 * The order in which Xtext's `BacktrackingSemanticSequencer` writes the members of an unordered group, as a
 * grammar-specific rule (G1). An unordered group is a constraint loop `(m1 | m2 | ...)*` in which every member
 * can follow every member, so the backtracking search reduces to:
 *
 * 1. it stops as soon as no member holds a required value (the unassigned stop state sorts first,
 *    `FollowerSorter.compare` lines 106-113, and `isConsumed` ignores unset optional values);
 * 2. otherwise it enters the first follower of the sorted list that can still consume a value, and the
 *    comparator puts non-optional entry states before optional ones (`:114-119`) and ties in declaration
 *    order (`:128-130`). Features with no value (count 0) cannot be entered (`cloneAndConsume` returns null).
 *
 * Hence a member whose values are all unset is written when, and only when, it sorts ahead of a member that
 * still has a required value (both entry states optional: declaration order). The 16-row matrices of the writer
 * vectors (`shape-matrix`, `section-single-matrix`) and the `section-single-subsets` rows pin the rule.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/BacktrackingSemanticSequencer.java:56-131
 * @returns the keys of the members to write, in writing order
 */
export function orderUnorderedGroup<K>(members: readonly GroupMember<K>[]): K[] {
  const remaining = members.filter((m) => m.available);
  const order: K[] = [];
  while (remaining.some((m) => m.required)) {
    const nonOptional = remaining.findIndex((m) => !m.entryOptional);
    const [next] = remaining.splice(nonOptional === -1 ? 0 : nonOptional, 1);
    order.push(next!.key);
  }
  return order;
}

/**
 * The member of an unordered group that writes `features` (a chain such as `x , y`) of `owner`, entered through
 * `features[0]`: available unless that value is transient, optional when it is `PREFERABLY` transient, required
 * when any value of the chain is set.
 */
export function groupMember<K>(
  transientValues: ElkGraphTransientValueService,
  owner: EObject,
  key: K,
  features: readonly ElkFeature[],
): GroupMember<K> {
  const states = features.map((f) => transientValues.isValueTransient(owner, f));
  return {
    key,
    available: states[0] !== ValueTransient.YES,
    entryOptional: states[0] === ValueTransient.PREFERABLY,
    required: states.includes(ValueTransient.NO),
  };
}
