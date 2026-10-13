// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Edge coordinate systems for JSON output. To be accessed using {@link CoreOptions#JSON_EDGE_COORDS}.
 * Applies to edges, and to labels of edges.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/EdgeCoords.java
 */
export class EdgeCoords {
  /** Inherit the parent node's coordinate system. The root node has no parent node; here, this setting defaults to
   * {@link #CONTAINER}. */
  static readonly INHERIT: EdgeCoords = new EdgeCoords('INHERIT', 0);
  /** relative to the edge's proper container node. */
  static readonly CONTAINER: EdgeCoords = new EdgeCoords('CONTAINER', 1);
  /** relative to the edge's JSON parent node. */
  static readonly PARENT: EdgeCoords = new EdgeCoords('PARENT', 2);
  /** relative to the root node, a.k.a. global coordinates. */
  static readonly ROOT: EdgeCoords = new EdgeCoords('ROOT', 3);

  static readonly #VALUES: readonly EdgeCoords[] = [
    EdgeCoords.INHERIT,
    EdgeCoords.CONTAINER,
    EdgeCoords.PARENT,
    EdgeCoords.ROOT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeCoords[] {
    return EdgeCoords.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeCoords {
    const found = EdgeCoords.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.EdgeCoords.${name}`);
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

  compareTo(other: EdgeCoords): number {
    return this.#ordinal - other.#ordinal;
  }
}
