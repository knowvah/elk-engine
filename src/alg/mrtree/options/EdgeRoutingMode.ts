// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Edge routing modes of the mrtree algorithm.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/EdgeRoutingMode.java
 */
export class EdgeRoutingMode {
  /** Does nothing. */
  static readonly NONE: EdgeRoutingMode = new EdgeRoutingMode('NONE', 0);
  /** Routes edges from node middle to node middle. */
  static readonly MIDDLE_TO_MIDDLE: EdgeRoutingMode = new EdgeRoutingMode('MIDDLE_TO_MIDDLE', 1);
  /** Similar to MiddleToMiddle but avoids edge node overlaps. */
  static readonly AVOID_OVERLAP: EdgeRoutingMode = new EdgeRoutingMode('AVOID_OVERLAP', 2);

  static readonly #VALUES: readonly EdgeRoutingMode[] = [
    EdgeRoutingMode.NONE,
    EdgeRoutingMode.MIDDLE_TO_MIDDLE,
    EdgeRoutingMode.AVOID_OVERLAP,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeRoutingMode[] {
    return EdgeRoutingMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeRoutingMode {
    const found = EdgeRoutingMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.options.EdgeRoutingMode.${name}`);
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

  compareTo(other: EdgeRoutingMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
