// SPDX-License-Identifier: EPL-2.0
import type { BinaryIndexedTree } from './BinaryIndexedTree.js';

/**
 * The instance fields of Java's `CrossingsCounter`. The section files (`CrossingsCounterConvenience`,
 * `CrossingsCounterNorthSouth`) hold the Java methods as functions over this record and never import the facade, so
 * the fields live in a file of their own.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/CrossingsCounter.java:138
 */
export class CrossingsCounterState {
  /** Port position array passed to prevent frequent large array construction (Java `int[]`). */
  readonly portPositions: Int32Array;

  /** Java field, null until the first `new BinaryIndexedTree(...)`; a use before that fails as the Java NPE does. */
  indexTree!: BinaryIndexedTree;

  /** Java `Deque<Integer>` used through `push`/`pop` only: a stack, the top is the array's end. */
  readonly ends: number[] = [];

  /** Java `int[]`, null until `initPositions` is called with `getCardinalities`. */
  nodeCardinalities!: Int32Array;

  constructor(portPositions: Int32Array) {
    this.portPositions = portPositions;
  }
}
