// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Shape coordinate systems for JSON output. To be accessed using {@link CoreOptions#JSON_SHAPE_COORDS}.
 * Applies to nodes, ports, and labels of nodes and ports.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/ShapeCoords.java
 */
export class ShapeCoords {
  /** Inherit the parent shape's coordinate system. The root node has no parent shape; here, this setting defaults to
   * {@link #PARENT}. */
  static readonly INHERIT: ShapeCoords = new ShapeCoords('INHERIT', 0);
  /** relative to the shape's JSON parent shape. */
  static readonly PARENT: ShapeCoords = new ShapeCoords('PARENT', 1);
  /** relative to the root node, a.k.a. global coordinates. */
  static readonly ROOT: ShapeCoords = new ShapeCoords('ROOT', 2);

  static readonly #VALUES: readonly ShapeCoords[] = [ShapeCoords.INHERIT, ShapeCoords.PARENT, ShapeCoords.ROOT];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ShapeCoords[] {
    return ShapeCoords.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ShapeCoords {
    const found = ShapeCoords.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.ShapeCoords.${name}`);
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

  compareTo(other: ShapeCoords): number {
    return this.#ordinal - other.#ordinal;
  }
}
