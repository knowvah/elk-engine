// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * the available graph types.
 *
 * Nested enum of `GeneratorOptions` in Java; a sibling file here (translation rule 6.4).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/GeneratorOptions.java
 */
export class GraphType {
  /** custom graph. */
  static readonly CUSTOM: GraphType = new GraphType('CUSTOM', 0);
  /** a tree. */
  static readonly TREE: GraphType = new GraphType('TREE', 1);
  /** a biconnected graph. */
  static readonly BICONNECTED: GraphType = new GraphType('BICONNECTED', 2);
  /** a triconnected graph. */
  static readonly TRICONNECTED: GraphType = new GraphType('TRICONNECTED', 3);
  /** an acyclic graph without transitive edges. */
  static readonly ACYCLIC_NO_TRANSITIVE_EDGES: GraphType = new GraphType('ACYCLIC_NO_TRANSITIVE_EDGES', 4);
  /** a bipartite graph. */
  static readonly BIPARTITE: GraphType = new GraphType('BIPARTITE', 5);

  static readonly #VALUES: readonly GraphType[] = [
    GraphType.CUSTOM,
    GraphType.TREE,
    GraphType.BICONNECTED,
    GraphType.TRICONNECTED,
    GraphType.ACYCLIC_NO_TRANSITIVE_EDGES,
    GraphType.BIPARTITE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly GraphType[] {
    return GraphType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GraphType {
    const found = GraphType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions.GraphType.${name}`,
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

  compareTo(other: GraphType): number {
    return this.#ordinal - other.#ordinal;
  }
}
