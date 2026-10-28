// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/OrderingStrategy.java
 */
export class OrderingStrategy {
  static readonly NONE: OrderingStrategy = new OrderingStrategy('NONE', 0);
  static readonly NODES_AND_EDGES: OrderingStrategy = new OrderingStrategy('NODES_AND_EDGES', 1);
  static readonly PREFER_EDGES: OrderingStrategy = new OrderingStrategy('PREFER_EDGES', 2);
  static readonly PREFER_NODES: OrderingStrategy = new OrderingStrategy('PREFER_NODES', 3);

  static readonly #VALUES: readonly OrderingStrategy[] = [
    OrderingStrategy.NONE,
    OrderingStrategy.NODES_AND_EDGES,
    OrderingStrategy.PREFER_EDGES,
    OrderingStrategy.PREFER_NODES,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OrderingStrategy[] {
    return OrderingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OrderingStrategy {
    const found = OrderingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.OrderingStrategy.${name}`,
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

  compareTo(other: OrderingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
