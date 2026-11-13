// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { Graph } from '../graph/Graph.js';
import { ShrinkTreeCompactionPhase } from '../p3execution/ShrinkTreeCompactionPhase.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * Definition of the compaction strategy for compaction by shrinking a tree.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/CompactionStrategy.java
 */
export class CompactionStrategy implements ILayoutPhaseFactory<SPOrEPhases, Graph> {
  /** Simple compaction strategy. */
  static readonly DEPTH_FIRST: CompactionStrategy = new CompactionStrategy('DEPTH_FIRST', 0);

  static readonly #VALUES: readonly CompactionStrategy[] = [CompactionStrategy.DEPTH_FIRST];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CompactionStrategy[] {
    return CompactionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CompactionStrategy {
    const found = CompactionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.spore.options.CompactionStrategy.${name}`,
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

  compareTo(other: CompactionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase this strategy stands for. */
  create(): ILayoutPhase<SPOrEPhases, Graph> {
    switch (this) {
      case CompactionStrategy.DEPTH_FIRST:
        return new ShrinkTreeCompactionPhase();
      default:
        throw new IllegalArgumentException(`No implementation available for ${this.toString()}`);
    }
  }
}
