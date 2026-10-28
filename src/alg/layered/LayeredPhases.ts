// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * All phases the layered approach is divided into.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/LayeredPhases.java
 */
export class LayeredPhases {
  /** Elimination of cycles through edge reversal. */
  static readonly P1_CYCLE_BREAKING: LayeredPhases = new LayeredPhases('P1_CYCLE_BREAKING', 0);
  /** Division of nodes into distinct layers. */
  static readonly P2_LAYERING: LayeredPhases = new LayeredPhases('P2_LAYERING', 1);
  /** Computation of an order of nodes in each layer, usually to reduce crossings. */
  static readonly P3_NODE_ORDERING: LayeredPhases = new LayeredPhases('P3_NODE_ORDERING', 2);
  /** Assignment of y coordinates. */
  static readonly P4_NODE_PLACEMENT: LayeredPhases = new LayeredPhases('P4_NODE_PLACEMENT', 3);
  /** Edge routing and assignment of x coordinates. */
  static readonly P5_EDGE_ROUTING: LayeredPhases = new LayeredPhases('P5_EDGE_ROUTING', 4);

  static readonly #VALUES: readonly LayeredPhases[] = [
    LayeredPhases.P1_CYCLE_BREAKING,
    LayeredPhases.P2_LAYERING,
    LayeredPhases.P3_NODE_ORDERING,
    LayeredPhases.P4_NODE_PLACEMENT,
    LayeredPhases.P5_EDGE_ROUTING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayeredPhases[] {
    return LayeredPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayeredPhases {
    const found = LayeredPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.layered.LayeredPhases.${name}`);
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

  compareTo(other: LayeredPhases): number {
    return this.#ordinal - other.#ordinal;
  }
}
