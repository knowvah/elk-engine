// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { Graph } from '../graph/Graph.js';
import { MaxSTPhase } from '../p2processingorder/MaxSTPhase.js';
import { MinSTPhase } from '../p2processingorder/MinSTPhase.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * Definition of the spanning tree construction strategy for the processing order phase.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/TreeConstructionStrategy.java
 */
export class TreeConstructionStrategy implements ILayoutPhaseFactory<SPOrEPhases, Graph> {
  /** Minimum spanning tree construction. */
  static readonly MINIMUM_SPANNING_TREE: TreeConstructionStrategy = new TreeConstructionStrategy(
    'MINIMUM_SPANNING_TREE',
    0,
  );
  /** Maximum spanning tree construction. */
  static readonly MAXIMUM_SPANNING_TREE: TreeConstructionStrategy = new TreeConstructionStrategy(
    'MAXIMUM_SPANNING_TREE',
    1,
  );

  static readonly #VALUES: readonly TreeConstructionStrategy[] = [
    TreeConstructionStrategy.MINIMUM_SPANNING_TREE,
    TreeConstructionStrategy.MAXIMUM_SPANNING_TREE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TreeConstructionStrategy[] {
    return TreeConstructionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TreeConstructionStrategy {
    const found = TreeConstructionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.spore.options.TreeConstructionStrategy.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: TreeConstructionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase this strategy stands for. */
  create(): ILayoutPhase<SPOrEPhases, Graph> {
    switch (this) {
      case TreeConstructionStrategy.MINIMUM_SPANNING_TREE:
        return new MinSTPhase();
      case TreeConstructionStrategy.MAXIMUM_SPANNING_TREE:
        return new MaxSTPhase();
      default:
        throw new IllegalArgumentException(`No implementation available for ${this.toString()}`);
    }
  }
}
