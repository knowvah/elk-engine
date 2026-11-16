// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { RelativeXPlacer } from './RelativeXPlacer.js';

/**
 * Enumeration of and factory for the horizontal node placement strategies.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacerStrategy.java
 */
export class RelativeXPlacerStrategy implements ILayoutPhaseFactory<VertiFlexLayoutPhases, ElkNode> {
  /**
   * Simple strategy for setting the horizontal positions of nodes. These positions are relative to their parents
   * and chosen such that overlaps are avoided.
   */
  static readonly SIMPLE_X_PLACING: RelativeXPlacerStrategy = new RelativeXPlacerStrategy('SIMPLE_X_PLACING', 0);

  static readonly #VALUES: readonly RelativeXPlacerStrategy[] = [RelativeXPlacerStrategy.SIMPLE_X_PLACING];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RelativeXPlacerStrategy[] {
    return RelativeXPlacerStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RelativeXPlacerStrategy {
    const found = RelativeXPlacerStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.vertiflex.p2relative.RelativeXPlacerStrategy.${name}`,
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

  compareTo(other: RelativeXPlacerStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
    switch (this) {
      case RelativeXPlacerStrategy.SIMPLE_X_PLACING:
        return new RelativeXPlacer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}
