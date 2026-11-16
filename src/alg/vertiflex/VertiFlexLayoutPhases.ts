// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * All phases the VertiFlex approach is divided into.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/VertiFlexLayoutPhases.java
 */
export class VertiFlexLayoutPhases {
  /** Phase 1. Vertical placement of nodes. */
  static readonly P1_NODE_Y_PLACEMENT: VertiFlexLayoutPhases = new VertiFlexLayoutPhases('P1_NODE_Y_PLACEMENT', 0);
  /** Phase 2. Horizontal placement of nodes. */
  static readonly P2_NODE_RELATIVE_PLACEMENT: VertiFlexLayoutPhases = new VertiFlexLayoutPhases(
    'P2_NODE_RELATIVE_PLACEMENT',
    1,
  );
  /** Phase 3. Computation of absolute coordinates. */
  static readonly P3_NODE_ABSOLUTE_PLACEMENT: VertiFlexLayoutPhases = new VertiFlexLayoutPhases(
    'P3_NODE_ABSOLUTE_PLACEMENT',
    2,
  );
  /** Phase 4. Edge routing. */
  static readonly P4_EDGE_ROUTING: VertiFlexLayoutPhases = new VertiFlexLayoutPhases('P4_EDGE_ROUTING', 3);

  static readonly #VALUES: readonly VertiFlexLayoutPhases[] = [
    VertiFlexLayoutPhases.P1_NODE_Y_PLACEMENT,
    VertiFlexLayoutPhases.P2_NODE_RELATIVE_PLACEMENT,
    VertiFlexLayoutPhases.P3_NODE_ABSOLUTE_PLACEMENT,
    VertiFlexLayoutPhases.P4_EDGE_ROUTING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly VertiFlexLayoutPhases[] {
    return VertiFlexLayoutPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): VertiFlexLayoutPhases {
    const found = VertiFlexLayoutPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.vertiflex.VertiFlexLayoutPhases.${name}`,
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

  compareTo(other: VertiFlexLayoutPhases): number {
    return this.#ordinal - other.#ordinal;
  }
}
