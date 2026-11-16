// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { EqualWhitespaceEliminator } from './EqualWhitespaceEliminator.js';
import { ToAspectratioNodeExpander } from './ToAspectratioNodeExpander.js';

/**
 * Strategy factory for whitespace elimination.
 *
 * @see org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/WhiteSpaceEliminationStrategy.java
 */
export class WhiteSpaceEliminationStrategy implements ILayoutPhaseFactory<RectPackingLayoutPhases, ElkNode> {
  /** The packing that is divided into rows, stacks, blocks, and subrows equally divides available space between this
   * structures by moving the structures and the rectangles before expanding the rectangles such that all gaps are
   * filled.
   * The size of the parent remains unchanged. */
  static readonly EQUAL_BETWEEN_STRUCTURES: WhiteSpaceEliminationStrategy = new WhiteSpaceEliminationStrategy(
    'EQUAL_BETWEEN_STRUCTURES',
    0,
  );
  /** Same as the equal between structures but the strategy expands to the desired aspect ratio.
   * Hence, this increases the size of the parent. */
  static readonly TO_ASPECT_RATIO: WhiteSpaceEliminationStrategy = new WhiteSpaceEliminationStrategy(
    'TO_ASPECT_RATIO',
    1,
  );
  /** Explicitly set that no whitespace elimination is done.
   * This can be done explicitly, since some language do not support the use of null. */
  static readonly NONE: WhiteSpaceEliminationStrategy = new WhiteSpaceEliminationStrategy('NONE', 2);

  static readonly #VALUES: readonly WhiteSpaceEliminationStrategy[] = [
    WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES,
    WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO,
    WhiteSpaceEliminationStrategy.NONE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly WhiteSpaceEliminationStrategy[] {
    return WhiteSpaceEliminationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): WhiteSpaceEliminationStrategy {
    const found = WhiteSpaceEliminationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.p3whitespaceelimination.WhiteSpaceEliminationStrategy.${name}`,
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

  compareTo(other: WhiteSpaceEliminationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the phase implementation. `NONE` (and, as in Java, the unreachable default arm) yields null: the assembler
   * skips a null phase. The `ILayoutPhaseFactory` contract of the port is non-null, hence the cast.
   */
  create(): ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
    switch (this) {
      case WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES:
        return new EqualWhitespaceEliminator();
      case WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO:
        return new ToAspectratioNodeExpander();
      case WhiteSpaceEliminationStrategy.NONE:
      default:
        return null as unknown as ILayoutPhase<RectPackingLayoutPhases, ElkNode>;
    }
  }
}
