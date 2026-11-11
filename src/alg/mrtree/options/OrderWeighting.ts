// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Layout option for the choice of the weighting for the node order.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/OrderWeighting.java
 */
export class OrderWeighting {
  /** Doesn't change node ordering. When using this nodes will be in the order of the definition of their incoming edges. */
  static readonly MODEL_ORDER: OrderWeighting = new OrderWeighting('MODEL_ORDER', 0);
  /** Chooses the number of descendants for the weighting. */
  static readonly DESCENDANTS: OrderWeighting = new OrderWeighting('DESCENDANTS', 1);
  /** Chooses maximal number of descendants at the same level. */
  static readonly FAN: OrderWeighting = new OrderWeighting('FAN', 2);
  /** Chooses the nodes with the highest position constraint. Without set constraints this will behave just like NONE. */
  static readonly CONSTRAINT: OrderWeighting = new OrderWeighting('CONSTRAINT', 3);

  static readonly #VALUES: readonly OrderWeighting[] = [
    OrderWeighting.MODEL_ORDER,
    OrderWeighting.DESCENDANTS,
    OrderWeighting.FAN,
    OrderWeighting.CONSTRAINT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OrderWeighting[] {
    return OrderWeighting.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OrderWeighting {
    const found = OrderWeighting.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.options.OrderWeighting.${name}`);
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

  compareTo(other: OrderWeighting): number {
    return this.#ordinal - other.#ordinal;
  }
}
