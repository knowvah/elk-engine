// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Definition of the edge types. To be accessed using {@link CoreOptions#EDGE_TYPE}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/EdgeType.java
 */
export class EdgeType {
  /** no special type. */
  static readonly NONE: EdgeType = new EdgeType('NONE', 0);
  /** the edge is directed. */
  static readonly DIRECTED: EdgeType = new EdgeType('DIRECTED', 1);
  /** the edge is undirected. */
  static readonly UNDIRECTED: EdgeType = new EdgeType('UNDIRECTED', 2);
  /** the edge represents an association. */
  static readonly ASSOCIATION: EdgeType = new EdgeType('ASSOCIATION', 3);
  /** the edge represents a generalization. */
  static readonly GENERALIZATION: EdgeType = new EdgeType('GENERALIZATION', 4);
  /** the edge represents a dependency. */
  static readonly DEPENDENCY: EdgeType = new EdgeType('DEPENDENCY', 5);

  static readonly #VALUES: readonly EdgeType[] = [
    EdgeType.NONE,
    EdgeType.DIRECTED,
    EdgeType.UNDIRECTED,
    EdgeType.ASSOCIATION,
    EdgeType.GENERALIZATION,
    EdgeType.DEPENDENCY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeType[] {
    return EdgeType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeType {
    const found = EdgeType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.EdgeType.${name}`);
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

  compareTo(other: EdgeType): number {
    return this.#ordinal - other.#ordinal;
  }
}
