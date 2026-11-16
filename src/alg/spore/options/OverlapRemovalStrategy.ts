// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { Graph } from '../graph/Graph.js';
import { GrowTreePhase } from '../p3execution/GrowTreePhase.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * Definition of the strategy for the third phase of overlap removal by growing a tree.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/OverlapRemovalStrategy.java
 */
export class OverlapRemovalStrategy implements ILayoutPhaseFactory<SPOrEPhases, Graph> {
  /** Overlap removal by growing a tree. */
  static readonly GROW_TREE: OverlapRemovalStrategy = new OverlapRemovalStrategy('GROW_TREE', 0);

  static readonly #VALUES: readonly OverlapRemovalStrategy[] = [OverlapRemovalStrategy.GROW_TREE];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OverlapRemovalStrategy[] {
    return OverlapRemovalStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OverlapRemovalStrategy {
    const found = OverlapRemovalStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.spore.options.OverlapRemovalStrategy.${name}`,
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

  compareTo(other: OverlapRemovalStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase this strategy stands for. */
  create(): ILayoutPhase<SPOrEPhases, Graph> {
    return new GrowTreePhase();
  }
}
