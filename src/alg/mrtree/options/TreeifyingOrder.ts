// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of treeifying order options.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/TreeifyingOrder.java
 */
export class TreeifyingOrder {
  /** treeify in depth-first order. */
  static readonly DFS: TreeifyingOrder = new TreeifyingOrder('DFS', 0);
  /** treeify in breadth-first order. */
  static readonly BFS: TreeifyingOrder = new TreeifyingOrder('BFS', 1);

  static readonly #VALUES: readonly TreeifyingOrder[] = [TreeifyingOrder.DFS, TreeifyingOrder.BFS];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TreeifyingOrder[] {
    return TreeifyingOrder.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TreeifyingOrder {
    const found = TreeifyingOrder.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.options.TreeifyingOrder.${name}`);
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

  compareTo(other: TreeifyingOrder): number {
    return this.#ordinal - other.#ordinal;
  }
}
