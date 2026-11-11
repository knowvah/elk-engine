// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Strategies for routing edges in the tree layout.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/EdgeRoutingStrategy.java
 */
export class EdgeRoutingStrategy {
  /** Straight lines between nodes. */
  static readonly STRAIGHT: EdgeRoutingStrategy = new EdgeRoutingStrategy('STRAIGHT', 0);
  /** Allow one bend point in edges to enable more compact layouts while also maintaining the node model order. */
  static readonly BEND: EdgeRoutingStrategy = new EdgeRoutingStrategy('BEND', 1);

  static readonly #VALUES: readonly EdgeRoutingStrategy[] = [EdgeRoutingStrategy.STRAIGHT, EdgeRoutingStrategy.BEND];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeRoutingStrategy[] {
    return EdgeRoutingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeRoutingStrategy {
    const found = EdgeRoutingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.vertiflex.EdgeRoutingStrategy.${name}`);
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

  compareTo(other: EdgeRoutingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
