// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { BottomRowEqualWhitespaceEliminator } from './BottomRowEqualWhitespaceEliminator.js';
import type { GridElkNode } from './GridElkNode.js';
import type { TopdownPackingPhases } from './TopdownPackingPhases.js';

/**
 * During the white space elimination phase nodes are expanded beyond their initial size
 * to completely fill the space provided by their parent.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/WhitespaceEliminationStrategy.java
 */
export class WhitespaceEliminationStrategy implements ILayoutPhaseFactory<TopdownPackingPhases, GridElkNode> {
  /** Equally expands nodes on the bottom row to fill up remaining space. */
  static readonly BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR: WhitespaceEliminationStrategy =
    new WhitespaceEliminationStrategy('BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR', 0);

  static readonly #VALUES: readonly WhitespaceEliminationStrategy[] = [
    WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly WhitespaceEliminationStrategy[] {
    return WhitespaceEliminationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): WhitespaceEliminationStrategy {
    const found = WhitespaceEliminationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.topdownpacking.WhitespaceEliminationStrategy.${name}`,
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

  compareTo(other: WhitespaceEliminationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<TopdownPackingPhases, GridElkNode> {
    switch (this) {
      case WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR:
        return new BottomRowEqualWhitespaceEliminator();
      default:
        throw new IllegalArgumentException(
          `No implementation is available for the whitespace eliminator${this.toString()}`,
        );
    }
  }
}
