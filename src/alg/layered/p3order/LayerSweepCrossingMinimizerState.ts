// SPDX-License-Identifier: EPL-2.0
import type { Random } from '../../../java/util/Random.js';
import type { GraphInfoHolder } from './GraphInfoHolder.js';

/**
 * The instance fields of Java's `LayerSweepCrossingMinimizer` that its section modules read or change (the section
 * files hold the Java methods as functions over this record and never import the facade, so the record lives in a
 * file of its own). `crossMinType` stays on the facade: only `initialize` reads it.
 *
 * `graphInfoHolders` is Java's `ArrayList`, indexed by `LGraph.id`. `graphsWhoseNodeOrderChanged` is the
 * identity-hashed `HashSet` of `Sets.newHashSet()` as an insertion-ordered `Set` (AD-10): it is only walked to give
 * each graph an independent copy of its own order, so the walk order has no observable effect.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerSweepCrossingMinimizer.java:92
 */
export interface LayerSweepCrossingMinimizerState {
  /** Collected information about each graph. */
  graphInfoHolders: GraphInfoHolder[];
  /** We only need to save the orders of graphs if their node order actually changed. */
  graphsWhoseNodeOrderChanged: Set<GraphInfoHolder>;
  random: Random;
  randomSeed: bigint;
}
