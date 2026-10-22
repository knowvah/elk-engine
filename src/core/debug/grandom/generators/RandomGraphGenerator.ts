// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import type { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import type { GeneratorOptions } from './GeneratorOptions.js';

/**
 * Java would throw a `NullPointerException` on dereferencing `null` (translation rules, D10: a
 * `TypeError` here). Narrows the value for the checked sites where the Java relies on that.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function nonNull<T>(value: T | null): T {
  if (value === null) {
    throw new TypeError('Unexpected null (a NullPointerException in the Java original)');
  }
  return value;
}

/**
 * The random graph generator for ELK graphs.
 *
 * The Java class is split by section into helper files (mission decision D4): the element
 * creation, connection and rewiring methods are exported functions taking the generator as their
 * first parameter (`RandomGraphGeneratorElements.ts`, `...Connect.ts`, `...Rewire.ts`). The state
 * fields are `private` in Java and non-private here so those helpers can reach them.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export class RandomGraphGenerator {
  /**
   * minimal separation of ports (a Java `float`).
   *
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static readonly PORT_SEPARATION: number = Math.fround(7.0);

  /**
   * the maximal number of iterations for distributing edges (`private` in Java).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static readonly MAX_ITER: number = 12;

  /**
   * the generator options holder; `null` until `generate` assigns it, as in Java.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  options: GeneratorOptions | null = null;

  /**
   * the random number generator used to generate the graph.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  random: Random;

  /**
   * the counter used to generate node labels.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  nodeLabelCounter: number = 0;

  /**
   * the counter used to generate port labels.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  portLabelCounter: number = 0;

  /**
   * the maximal hierarchy level.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  maxHierarchyLevel: number = 0;

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Constructor

  /**
   * Create a random graph generator with given random number generator.
   *
   * @param random a random number generator
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  constructor(random: Random) {
    this.random = random;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Random Graph Generation API

  // T12 adds `generate(GeneratorOptions)`, `generate(Configuration)` and `randomGeneratorFromConfig` here.

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Implementation

  // T12 adds `addHierarchicalNodes`, `connectAtomicNodesOnDifferentLevels`, `sample`, `makeGraph` and
  // `generateCustomGraph` here; the other implementation methods live in the helper files (D4).

  /**
   * Returns a random integer number in the given range (including the boundaries). The Java
   * `assert from <= to` is disabled in the JVM by default and omitted (no dev-assert helper exists).
   *
   * @param from the minimal number
   * @param to the maximal number
   * @returns a random integer number
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  randomInt(from: number, to: number): number {
    return from + this.random.nextInt(to - from + 1);
  }

  /**
   * Determine whether the given node is a hypernode.
   *
   * @param node a node
   * @returns true if the node is a hypernode
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static isHypernode(node: ElkNode): boolean {
    return node.getProperty(CoreOptions.HYPERNODE);
  }

  /**
   * The value of an option; a `null` options holder is a `NullPointerException` in Java (`TypeError`).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  get<T>(property: IProperty<T>): T {
    return nonNull(this.options).getProperty(property);
  }

  /**
   * Sets an option; a `null` options holder is a `NullPointerException` in Java (`TypeError`).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  set<T>(property: IProperty<T>, val: T): void {
    nonNull(this.options).setProperty(property, val);
  }
}
