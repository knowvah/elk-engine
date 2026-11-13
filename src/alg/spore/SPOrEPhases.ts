// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * This algorithm's phases.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/SPOrEPhases.java
 */
export class SPOrEPhases {
  /** Phase 1. */
  static readonly P1_STRUCTURE: SPOrEPhases = new SPOrEPhases('P1_STRUCTURE', 0);
  /** Phase 2. */
  static readonly P2_PROCESSING_ORDER: SPOrEPhases = new SPOrEPhases('P2_PROCESSING_ORDER', 1);
  /** Phase 3. */
  static readonly P3_EXECUTION: SPOrEPhases = new SPOrEPhases('P3_EXECUTION', 2);

  static readonly #VALUES: readonly SPOrEPhases[] = [
    SPOrEPhases.P1_STRUCTURE,
    SPOrEPhases.P2_PROCESSING_ORDER,
    SPOrEPhases.P3_EXECUTION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SPOrEPhases[] {
    return SPOrEPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SPOrEPhases {
    const found = SPOrEPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.spore.SPOrEPhases.${name}`);
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

  compareTo(other: SPOrEPhases): number {
    return this.#ordinal - other.#ordinal;
  }
}
