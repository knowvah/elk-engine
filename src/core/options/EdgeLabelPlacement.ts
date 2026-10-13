// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Definition of placement positions for edge labels. To be accessed using {@link CoreOptions#EDGE_LABEL_PLACEMENT}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/EdgeLabelPlacement.java
 */
export class EdgeLabelPlacement {
  /** label is centered on the edge. */
  static readonly CENTER: EdgeLabelPlacement = new EdgeLabelPlacement('CENTER', 0);
  /** label is at the head (target) of the edge. */
  static readonly HEAD: EdgeLabelPlacement = new EdgeLabelPlacement('HEAD', 1);
  /** label is at the tail (source) of the edge. */
  static readonly TAIL: EdgeLabelPlacement = new EdgeLabelPlacement('TAIL', 2);

  static readonly #VALUES: readonly EdgeLabelPlacement[] = [
    EdgeLabelPlacement.CENTER,
    EdgeLabelPlacement.HEAD,
    EdgeLabelPlacement.TAIL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeLabelPlacement[] {
    return EdgeLabelPlacement.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeLabelPlacement {
    const found = EdgeLabelPlacement.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.EdgeLabelPlacement.${name}`);
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

  compareTo(other: EdgeLabelPlacement): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Checks whether this edge label placement is one of the two end label placements.
   *
   * @return `true` iff this is {@link #HEAD} or {@link #TAIL}.
   */
  isEndLabelPlacement(): boolean {
    return this === EdgeLabelPlacement.HEAD || this === EdgeLabelPlacement.TAIL;
  }
}
