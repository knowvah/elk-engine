// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/GraphCompactionStrategy.java
 */
export class GraphCompactionStrategy {
  static readonly NONE: GraphCompactionStrategy = new GraphCompactionStrategy('NONE', 0);
  static readonly LEFT: GraphCompactionStrategy = new GraphCompactionStrategy('LEFT', 1);
  static readonly RIGHT: GraphCompactionStrategy = new GraphCompactionStrategy('RIGHT', 2);
  static readonly LEFT_RIGHT_CONSTRAINT_LOCKING: GraphCompactionStrategy = new GraphCompactionStrategy(
    'LEFT_RIGHT_CONSTRAINT_LOCKING',
    3,
  );
  static readonly LEFT_RIGHT_CONNECTION_LOCKING: GraphCompactionStrategy = new GraphCompactionStrategy(
    'LEFT_RIGHT_CONNECTION_LOCKING',
    4,
  );
  static readonly EDGE_LENGTH: GraphCompactionStrategy = new GraphCompactionStrategy('EDGE_LENGTH', 5);

  static readonly #VALUES: readonly GraphCompactionStrategy[] = [
    GraphCompactionStrategy.NONE,
    GraphCompactionStrategy.LEFT,
    GraphCompactionStrategy.RIGHT,
    GraphCompactionStrategy.LEFT_RIGHT_CONSTRAINT_LOCKING,
    GraphCompactionStrategy.LEFT_RIGHT_CONNECTION_LOCKING,
    GraphCompactionStrategy.EDGE_LENGTH,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly GraphCompactionStrategy[] {
    return GraphCompactionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GraphCompactionStrategy {
    const found = GraphCompactionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.GraphCompactionStrategy.${name}`,
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

  compareTo(other: GraphCompactionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
