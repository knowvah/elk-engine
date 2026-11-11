// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { AbsoluteXPlacer } from './AbsoluteXPlacer.js';

/**
 * Strategies for absolute node placement.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p3absolute/AbsoluteXPlacerStrategy.java
 */
export class AbsoluteXPlacerStrategy implements ILayoutPhaseFactory<VertiFlexLayoutPhases, ElkNode> {
  /**
   * Compute absolute x-coordinates based on relative coordinates
   */
  static readonly ABSOLUTE_XPLACING: AbsoluteXPlacerStrategy = new AbsoluteXPlacerStrategy('ABSOLUTE_XPLACING', 0);

  static readonly #VALUES: readonly AbsoluteXPlacerStrategy[] = [AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly AbsoluteXPlacerStrategy[] {
    return AbsoluteXPlacerStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): AbsoluteXPlacerStrategy {
    const found = AbsoluteXPlacerStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.vertiflex.p3absolute.AbsoluteXPlacerStrategy.${name}`,
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

  compareTo(other: AbsoluteXPlacerStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
    switch (this) {
      case AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING:
        return new AbsoluteXPlacer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}
