// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { Compactor } from './Compactor.js';
import { NoPlacement } from './NoPlacement.js';
import { SimplePlacement } from './SimplePlacement.js';

/**
 * Packing strategy and factory for strip packing algorithms.
 *
 * @see org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/PackingStrategy.java
 */
export class PackingStrategy implements ILayoutPhaseFactory<RectPackingLayoutPhases, ElkNode> {
  static readonly COMPACTION: PackingStrategy = new PackingStrategy('COMPACTION', 0);
  static readonly SIMPLE: PackingStrategy = new PackingStrategy('SIMPLE', 1);
  static readonly NONE: PackingStrategy = new PackingStrategy('NONE', 2);

  static readonly #VALUES: readonly PackingStrategy[] = [
    PackingStrategy.COMPACTION,
    PackingStrategy.SIMPLE,
    PackingStrategy.NONE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PackingStrategy[] {
    return PackingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PackingStrategy {
    const found = PackingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.p2packing.PackingStrategy.${name}`,
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

  compareTo(other: PackingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the phase implementation. The `default` arm of the Java `switch` (`return null`) cannot be reached: `this` is
   * one of the three constants. It stays as the Java has it; the cast satisfies the non-null factory contract.
   */
  create(): ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
    switch (this) {
      case PackingStrategy.COMPACTION:
        return new Compactor();
      case PackingStrategy.SIMPLE:
        return new SimplePlacement();
      case PackingStrategy.NONE:
        return new NoPlacement();
      default:
        return null as unknown as ILayoutPhase<RectPackingLayoutPhases, ElkNode>;
    }
  }
}
